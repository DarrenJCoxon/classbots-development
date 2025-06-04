import { Job, DoneCallback } from 'bull';
import { memoryQueue, MemoryJobData, MemoryJobResult } from './memory-queue';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateEmbedding } from '@/lib/openai/embeddings';

// OpenRouter configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Connection pool for Supabase
const connectionPool = new Map<string, ReturnType<typeof createAdminClient>>();
const MAX_POOL_SIZE = 50;
const CONNECTION_TTL = 5 * 60 * 1000; // 5 minutes

interface PooledConnection {
  client: ReturnType<typeof createAdminClient>;
  lastUsed: number;
}

// Get or create a pooled connection
function getPooledConnection(): ReturnType<typeof createAdminClient> {
  const now = Date.now();
  
  // Clean up old connections
  for (const [key, conn] of connectionPool.entries()) {
    if (now - (conn as any).lastUsed > CONNECTION_TTL) {
      connectionPool.delete(key);
    }
  }
  
  // Reuse existing connection or create new one
  if (connectionPool.size < MAX_POOL_SIZE) {
    const client = createAdminClient();
    const key = `conn_${now}_${Math.random()}`;
    connectionPool.set(key, client);
    (client as any).lastUsed = now;
    return client;
  } else {
    // Reuse least recently used connection
    let oldestKey = '';
    let oldestTime = Infinity;
    
    for (const [key, client] of connectionPool.entries()) {
      const lastUsed = (client as any).lastUsed || 0;
      if (lastUsed < oldestTime) {
        oldestTime = lastUsed;
        oldestKey = key;
      }
    }
    
    const client = connectionPool.get(oldestKey)!;
    (client as any).lastUsed = now;
    return client;
  }
}

// Generate conversation summary using GPT
async function generateConversationSummary(
  messages: Array<{ role: string; content: string }>,
  chatbotName: string
): Promise<any> {
  // Create a conversation transcript
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'Student' : chatbotName}: ${m.content}`)
    .join('\n\n');
  
  const systemPrompt = `You are an educational assistant analyzing a student-chatbot conversation. 
Your task is to create a memory summary that will help the chatbot remember this student in future conversations.

Analyze the conversation and provide:
1. A concise summary of what was discussed (2-3 sentences)
2. Key topics covered (as an array)
3. Learning insights:
   - What concepts the student understood well
   - What concepts the student struggled with
   - Overall progress assessment
4. Suggested next steps for the student

Return your response as valid JSON matching this structure:
{
  "summary": "string",
  "keyTopics": ["topic1", "topic2"],
  "learningInsights": {
    "understood": ["concept1", "concept2"],
    "struggling": ["concept3"],
    "progress": "string describing overall progress"
  },
  "nextSteps": "string with recommendations"
}`;

  try {
    // Use OpenRouter for the completion
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'ClassBots AI',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4.1-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this conversation:\n\n${transcript}` }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenRouter error:', errorBody);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    return JSON.parse(content || '{}');
  } catch (error) {
    console.error('Error generating summary:', error);
    // Return a basic summary if the API fails
    return {
      summary: 'Student had a conversation with the chatbot.',
      keyTopics: [],
      learningInsights: {
        understood: [],
        struggling: [],
        progress: 'Unable to assess'
      },
      nextSteps: 'Continue with regular curriculum'
    };
  }
}

// Process memory job
async function processMemoryJob(job: Job<MemoryJobData>): Promise<MemoryJobResult> {
  const { userId, roomId, memory } = job.data;
  const startTime = Date.now();
  
  console.log(`[Memory Worker] Processing job ${job.id} for user ${userId} in room ${roomId}`);
  
  try {
    // Update job progress
    await job.progress(10);
    
    // Parse the memory content
    const memoryData = JSON.parse(memory.content);
    const { studentId, chatbotId, messages, sessionStartTime, sessionDuration } = memoryData;
    
    // Get pooled connection
    const supabase = getPooledConnection();
    
    // Get chatbot name for context
    await job.progress(20);
    const { data: chatbot } = await supabase
      .from('chatbots')
      .select('name')
      .eq('chatbot_id', chatbotId)
      .single();
    
    const chatbotName = chatbot?.name || 'Assistant';
    
    // Generate conversation summary
    await job.progress(30);
    const summary = await generateConversationSummary(messages, chatbotName);
    
    await job.progress(50);
    
    // Store in database with retry logic
    let retries = 3;
    let lastError: any;
    
    while (retries > 0) {
      try {
        const { data: savedMemory, error: dbError } = await supabase
          .from('student_chat_memories')
          .insert({
            student_id: studentId,
            chatbot_id: chatbotId,
            room_id: roomId,
            conversation_summary: summary.summary,
            key_topics: summary.keyTopics,
            learning_insights: summary.learningInsights,
            next_steps: summary.nextSteps,
            message_count: messages.length,
            session_duration_seconds: sessionDuration
          })
          .select()
          .single();
        
        if (dbError) throw dbError;
        
        await job.progress(70);
        
        // Update or create learning profile
        const { data: existingProfile } = await supabase
          .from('student_learning_profiles')
          .select('*')
          .eq('student_id', studentId)
          .eq('chatbot_id', chatbotId)
          .single();

        if (existingProfile) {
          // Update existing profile
          const updatedTopicsInProgress = new Set([
            ...existingProfile.topics_in_progress,
            ...summary.keyTopics
          ]);
          
          const updatedTopicProgress = { ...existingProfile.topic_progress };
          summary.keyTopics.forEach((topic: string) => {
            if (!updatedTopicProgress[topic]) {
              updatedTopicProgress[topic] = { level: 50, last_reviewed: new Date().toISOString() };
            } else {
              updatedTopicProgress[topic].last_reviewed = new Date().toISOString();
            }
          });

          // Move understood concepts to mastered if confidence is high
          summary.learningInsights.understood.forEach((concept: string) => {
            const currentLevel = updatedTopicProgress[concept]?.level || 50;
            updatedTopicProgress[concept] = {
              level: Math.min(100, currentLevel + 10),
              last_reviewed: new Date().toISOString()
            };
          });

          // Track struggling concepts
          summary.learningInsights.struggling.forEach((concept: string) => {
            const currentLevel = updatedTopicProgress[concept]?.level || 50;
            updatedTopicProgress[concept] = {
              level: Math.max(0, currentLevel - 5),
              last_reviewed: new Date().toISOString()
            };
          });

          await supabase
            .from('student_learning_profiles')
            .update({
              topics_in_progress: Array.from(updatedTopicsInProgress),
              topic_progress: updatedTopicProgress,
              total_sessions: existingProfile.total_sessions + 1,
              total_messages: existingProfile.total_messages + messages.filter((m: any) => m.role === 'user').length,
              last_session_at: new Date().toISOString()
            })
            .eq('id', existingProfile.id);
        } else {
          // Create new profile
          const topicProgress: Record<string, any> = {};
          summary.keyTopics.forEach((topic: string) => {
            topicProgress[topic] = { level: 50, last_reviewed: new Date().toISOString() };
          });

          await supabase
            .from('student_learning_profiles')
            .insert({
              student_id: studentId,
              chatbot_id: chatbotId,
              room_id: roomId,
              topics_in_progress: summary.keyTopics,
              topic_progress: topicProgress,
              total_sessions: 1,
              total_messages: messages.filter((m: any) => m.role === 'user').length,
              last_session_at: new Date().toISOString()
            });
        }
        
        await job.progress(100);
        
        const processingTime = Date.now() - startTime;
        console.log(`[Memory Worker] Job ${job.id} completed in ${processingTime}ms`);
        
        return {
          success: true,
          memoryId: savedMemory.id,
        };
      } catch (error) {
        retries--;
        lastError = error;
        
        if (retries > 0) {
          console.warn(`[Memory Worker] Database retry ${3 - retries}/3 for job ${job.id}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
        }
      }
    }
    
    throw new Error(`Database operation failed after 3 retries: ${lastError}`);
  } catch (error) {
    console.error(`[Memory Worker] Job ${job.id} failed:`, error);
    
    // Log to error tracking service (e.g., Sentry)
    if (process.env.SENTRY_DSN) {
      // Sentry.captureException(error);
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Worker configuration
const CONCURRENCY = parseInt(process.env.MEMORY_WORKER_CONCURRENCY || '10');

// Start the worker
export function startMemoryWorker() {
  console.log(`[Memory Worker] Starting with concurrency: ${CONCURRENCY}`);
  
  memoryQueue.process(CONCURRENCY, async (job: Job<MemoryJobData>, done: DoneCallback) => {
    try {
      const result = await processMemoryJob(job);
      done(null, result);
    } catch (error) {
      done(error as Error);
    }
  });
  
  // Monitor worker health
  setInterval(async () => {
    try {
      const metrics = await getWorkerMetrics();
      console.log('[Memory Worker] Metrics:', metrics);
      
      // Alert if queue is backing up
      if (metrics.waiting > 1000) {
        console.warn('[Memory Worker] High queue backlog:', metrics.waiting);
        // Send alert to monitoring service
      }
    } catch (error) {
      console.error('[Memory Worker] Failed to get metrics:', error);
    }
  }, 60000); // Check every minute
}

// Get worker metrics
async function getWorkerMetrics() {
  const [waiting, active, completed, failed] = await Promise.all([
    memoryQueue.getWaitingCount(),
    memoryQueue.getActiveCount(),
    memoryQueue.getCompletedCount(),
    memoryQueue.getFailedCount(),
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed,
    connectionPoolSize: connectionPool.size,
  };
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Memory Worker] Received SIGTERM, shutting down gracefully...');
  await memoryQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Memory Worker] Received SIGINT, shutting down gracefully...');
  await memoryQueue.close();
  process.exit(0);
});

// Auto-start if this file is run directly
if (require.main === module) {
  startMemoryWorker();
}