// src/app/api/student/memory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
// OpenRouter is used for all LLM completions
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const dynamic = 'force-dynamic';

interface SaveMemoryRequest {
  studentId: string;
  chatbotId: string;
  roomId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  sessionStartTime: string;
}

interface MemoryResponse {
  summary: string;
  keyTopics: string[];
  learningInsights: {
    understood: string[];
    struggling: string[];
    progress: string;
  };
  nextSteps: string;
}

// Generate conversation summary using GPT
async function generateConversationSummary(
  messages: Array<{ role: string; content: string }>,
  chatbotName: string
): Promise<MemoryResponse> {
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
        model: 'openai/gpt-4.1-nano', // Using the nano model as requested
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

// POST: Save conversation memory
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body: SaveMemoryRequest = await request.json();
    const { studentId, chatbotId, roomId, messages, sessionStartTime } = body;

    // Verify the authenticated user matches the student ID or is a teacher
    if (user.id !== studentId) {
      // Check if user is a teacher for this room
      const adminSupabase = createAdminClient();
      const { data: room } = await adminSupabase
        .from('rooms')
        .select('teacher_id')
        .eq('room_id', roomId)
        .single();

      if (!room || room.teacher_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Get chatbot name for context
    const adminSupabase = createAdminClient();
    const { data: chatbot } = await adminSupabase
      .from('chatbots')
      .select('name')
      .eq('chatbot_id', chatbotId)
      .single();

    const chatbotName = chatbot?.name || 'Assistant';

    // Check if there's a recent memory save (within last 15 minutes) to prevent duplicates
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentMemory } = await adminSupabase
      .from('student_chat_memories')
      .select('id, created_at, message_count')
      .eq('student_id', studentId)
      .eq('chatbot_id', chatbotId)
      .eq('room_id', roomId)
      .gte('created_at', fifteenMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentMemory && recentMemory.length > 0) {
      console.log('[Memory API] Found recent memory save, checking if it\'s a duplicate...');
      const timeSinceLastSave = Date.now() - new Date(recentMemory[0].created_at).getTime();
      const minutesSinceLastSave = Math.floor(timeSinceLastSave / 1000 / 60);
      
      // If saved less than 10 minutes ago with similar message count, it's likely a duplicate
      if (minutesSinceLastSave < 10 && Math.abs(recentMemory[0].message_count - messages.length) < 2) {
        console.log(`[Memory API] Duplicate save prevented - last save was ${minutesSinceLastSave} minutes ago`);
        return NextResponse.json({
          success: true,
          memory: recentMemory[0],
          duplicate: true
        });
      }
    }

    // Generate conversation summary
    const memory = await generateConversationSummary(messages, chatbotName);

    // Calculate session duration
    const sessionDuration = Math.floor(
      (new Date().getTime() - new Date(sessionStartTime).getTime()) / 1000
    );

    // Save memory to database
    const { data: savedMemory, error: saveError } = await adminSupabase
      .from('student_chat_memories')
      .insert({
        student_id: studentId,
        chatbot_id: chatbotId,
        room_id: roomId,
        conversation_summary: memory.summary,
        key_topics: memory.keyTopics,
        learning_insights: memory.learningInsights,
        next_steps: memory.nextSteps,
        message_count: messages.length,
        session_duration_seconds: sessionDuration
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving memory:', saveError);
      return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 });
    }

    // Update or create learning profile
    const { data: existingProfile } = await adminSupabase
      .from('student_learning_profiles')
      .select('*')
      .eq('student_id', studentId)
      .eq('chatbot_id', chatbotId)
      .single();

    if (existingProfile) {
      // Update existing profile
      const updatedTopicsInProgress = new Set([
        ...existingProfile.topics_in_progress,
        ...memory.keyTopics
      ]);
      
      const updatedTopicProgress = { ...existingProfile.topic_progress };
      memory.keyTopics.forEach(topic => {
        if (!updatedTopicProgress[topic]) {
          updatedTopicProgress[topic] = { level: 50, last_reviewed: new Date().toISOString() };
        } else {
          updatedTopicProgress[topic].last_reviewed = new Date().toISOString();
        }
      });

      // Move understood concepts to mastered if confidence is high
      memory.learningInsights.understood.forEach(concept => {
        const currentLevel = updatedTopicProgress[concept]?.level || 50;
        updatedTopicProgress[concept] = {
          level: Math.min(100, currentLevel + 10),
          last_reviewed: new Date().toISOString()
        };
      });

      // Track struggling concepts
      memory.learningInsights.struggling.forEach(concept => {
        const currentLevel = updatedTopicProgress[concept]?.level || 50;
        updatedTopicProgress[concept] = {
          level: Math.max(0, currentLevel - 5),
          last_reviewed: new Date().toISOString()
        };
      });

      await adminSupabase
        .from('student_learning_profiles')
        .update({
          topics_in_progress: Array.from(updatedTopicsInProgress),
          topic_progress: updatedTopicProgress,
          total_sessions: existingProfile.total_sessions + 1,
          total_messages: existingProfile.total_messages + messages.filter(m => m.role === 'user').length, // Only count user messages
          last_session_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id);
    } else {
      // Create new profile
      const topicProgress: Record<string, any> = {};
      memory.keyTopics.forEach(topic => {
        topicProgress[topic] = { level: 50, last_reviewed: new Date().toISOString() };
      });

      await adminSupabase
        .from('student_learning_profiles')
        .insert({
          student_id: studentId,
          chatbot_id: chatbotId,
          room_id: roomId,
          topics_in_progress: memory.keyTopics,
          topic_progress: topicProgress,
          total_sessions: 1,
          total_messages: messages.filter(m => m.role === 'user').length, // Only count user messages
          last_session_at: new Date().toISOString()
        });
    }

    return NextResponse.json({
      success: true,
      memory: savedMemory
    });

  } catch (error) {
    console.error('Memory save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save memory' },
      { status: 500 }
    );
  }
}

// GET: Retrieve student memories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const chatbotId = searchParams.get('chatbotId');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!studentId || !chatbotId) {
      return NextResponse.json(
        { error: 'studentId and chatbotId are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify access permissions
    const adminSupabase = createAdminClient();
    
    // Get recent memories
    const { data: memories, error: memoriesError } = await adminSupabase
      .from('student_chat_memories')
      .select('*')
      .eq('student_id', studentId)
      .eq('chatbot_id', chatbotId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (memoriesError) {
      console.error('Error fetching memories:', memoriesError);
      return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
    }

    // Get learning profile
    const { data: profile } = await adminSupabase
      .from('student_learning_profiles')
      .select('*')
      .eq('student_id', studentId)
      .eq('chatbot_id', chatbotId)
      .single();

    return NextResponse.json({
      memories: memories || [],
      profile: profile || null
    });

  } catch (error) {
    console.error('Memory fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}