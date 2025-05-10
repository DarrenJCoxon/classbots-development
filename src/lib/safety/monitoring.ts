// src/lib/safety/monitoring.ts

// Imports
import type { Room } from '@/types/database.types';
import { createAdminClient } from '@/lib/supabase/admin';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { sendTeacherAlert } from '@/lib/safety/alerts';

// OpenRouter Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Use a model available on OpenRouter (Meta's Llama 4 Scout is a good option)
const SAFETY_CHECK_MODEL = 'meta-llama/llama-4-scout';

// Keywords organized by category
const CONCERN_KEYWORDS: Record<string, string[]> = {
  self_harm: [
    'hate myself',
    'don\'t want to live',
    'don\'t want to be alive',
    'don\'t want to be here',
    'don\'t want to exist',
    'not worth going on',
    'no point in living',
    'no point going on',
    'rather be dead',
    'should end it',
    'should end it all',
    'end it all',
    'give up',
    'giving up',
    'take my own life',
    'take my life',
    'harming myself',
    'harm myself',
    'hurting myself',
    'cut myself',
    'cutting myself',
    'disappear forever',
    'everyone better off without me',
    'they\'d be better off without me',
    'they would be better off without me',
    'leave this world',
    'escape this world',
    'stop existing',
    'tired of being alive',
    'tired of existing',
    'too much pain',
    'can\'t take it anymore',
    'life is too hard',
    'life isn\'t worth it',
    'never wake up',
    'wish I wouldn\'t wake up',
    'make the pain stop',
    'no hope left',
    'nowhere to turn',
    'plan to kill',
    'how to end',
    'easier if I wasn\'t here',
    'easier if I was gone'
  ],
  bullying: [
    'bullied', 'bully', 'bullying', 
    'they hate me',
    'everyone hates me',
    'laughed at me',
    'laugh at me',
    'excluded',
    'leave me out',
    'leaving me out',
    'no friends',
    'don\'t have friends',
    'nobody likes me',
    'no one likes me',
    'call me names',
    'called me names',
    'push me around',
    'pushed me',
    'shove me',
    'shoved me',
    'making threats',
    'threatened me',
    'online bullying',
    'cyberbullying',
    'posting about me',
    'spreading rumors',
    'spreading rumours',
    'spreading lies',
    'everyone talks about me',
    'made fun of',
    'mock me',
    'mocking me',
    'rejected by everyone',
    'being isolated',
    'no one talks to me',
    'nobody talks to me',
    'they ignore me',
    'everyone ignores me',
    'being targeted',
    'pick on me',
    'won\'t leave me alone',
    'always after me',
    'ganging up on me',
    'scared to go to school',
    'don\'t want to go to school',
    'afraid at school',
    'scared at school'
  ],
  abuse: [
    'hurt me',
    'hurting me',
    'hitting me',
    'hit by',
    'kicks me',
    'kicking me',
    'pushed me',
    'pushes me',
    'throws things at me',
    'threw things at me',
    'threw something at me',
    'yells at me',
    'yelling at me',
    'screams at me',
    'screaming at me',
    'threatens me',
    'threatening me',
    'controls me',
    'controlling me',
    'not allowed to',
    'won\'t let me',
    'keeps me from',
    'locked me in',
    'locks me in',
    'touches me',
    'touched me',
    'uncomfortable touching',
    'hurt by someone',
    'afraid of them',
    'afraid to go home',
    'scared to go home',
    'not safe at home',
    'don\'t feel safe around',
    'being punished',
    'punishes me unfairly',
    'treated badly',
    'treats me badly',
    'calls me stupid',
    'calls me worthless',
    'makes me feel worthless',
    'makes me feel bad',
    'punched me',
    'punches me',
    'slapped me',
    'slaps me',
    'bruises from',
    'left bruises',
    'threatened to hurt me if I told',
    'can\'t tell anyone'
  ],
  depression: [
    'hate myself',
    'hate my life',
    'no one cares',
    'nobody cares',
    'nobody loves me',
    'no one loves me',
    'feel empty',
    'feeling empty',
    'feel nothing',
    'feels like nothing matters',
    'nothing matters',
    'what\'s the point',
    'feel worthless',
    'feeling worthless',
    'don\'t feel anything',
    'don\'t know what to do',
    'can\'t see a future',
    'lost all hope',
    'lost hope',
    'given up',
    'feel like a failure',
    'am a failure',
    'everything is dark',
    'darkness closing in',
    'can\'t get out of bed',
    'can\'t face the day',
    'crying all the time',
    'crying myself to sleep',
    'never happy',
    'always feeling down',
    'feel so alone',
    'completely alone',
    'no one understands',
    'nobody understands',
    'don\'t enjoy anything',
    'nothing makes me happy',
    'too sad to function',
    'too sad to do anything',
    'life is meaningless',
    'unable to feel joy',
    'can\'t sleep',
    'can\'t eat',
    'can\'t concentrate',
    'mind feels foggy',
    'exhausted all the time',
    'overwhelmed by sadness',
    'drowning in sadness'
  ],
  family_issues: [
    'parents always fighting',
    'parents always argue',
    'parents hate each other',
    'home is not safe',
    'scared at home',
    'afraid at home',
    'can\'t stand being home',
    'hate being home',
    'nowhere to go',
    'might get kicked out',
    'might be kicked out',
    'threatened to kick me out',
    'parent drinking',
    'parent drunk',
    'parents drunk',
    'drinking problem',
    'drug problem',
    'parents using drugs',
    'parent using drugs',
    'not enough food',
    'going hungry',
    'no food at home',
    'can\'t sleep at home',
    'parents separated',
    'parents separating',
    'parents broke up',
    'parents splitting up',
    'losing our house',
    'lost our house',
    'might be homeless',
    'could be homeless',
    'moving in with relatives',
    'have to move',
    'parent lost job',
    'no money for',
    'can\'t afford',
    'parent in jail',
    'parent arrested',
    'no one takes care of me',
    'have to take care of myself',
    'have to take care of my siblings',
    'parent is sick',
    'parent is ill',
    'parent in hospital',
    'no electricity',
    'utilities shut off',
    'water shut off'
  ],
};

/**
 * First-pass check: Look for concerning keywords in a message.
 */
export function initialConcernCheck(message: string): {
  hasConcern: boolean;
  concernType?: string;
} {
  if (!message) {
    return { hasConcern: false };
  }
  const lowerMessage = message.toLowerCase();

  // Original keyword matching logic
  for (const [category, keywords] of Object.entries(CONCERN_KEYWORDS)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`);
      if (regex.test(lowerMessage)) {
        return { hasConcern: true, concernType: category };
      }
    }
  }

  // Additional heuristic checks - add after the keyword loop
  // Self-harm combinations
  if (lowerMessage.includes('hate myself') && 
      (lowerMessage.includes('not worth') || lowerMessage.includes('don\'t know what to do'))) {
    return { hasConcern: true, concernType: 'self_harm' };
  }
  
  // Suicidal ideation patterns
  if ((lowerMessage.includes('not worth') || lowerMessage.includes('no point')) && 
      (lowerMessage.includes('going on') || lowerMessage.includes('living') || lowerMessage.includes('anymore'))) {
    return { hasConcern: true, concernType: 'self_harm' };
  }
  
  // General despair pattern - likely depression
  if (lowerMessage.includes('don\'t know what to do') && 
      (lowerMessage.includes('anymore') || lowerMessage.includes('sad') || lowerMessage.includes('feel'))) {
    return { hasConcern: true, concernType: 'depression' };
  }

  return { hasConcern: false };
}

/**
 * Second-pass check: Use specified OpenRouter model to verify concern and rate severity.
 */
export async function verifyConcern(
  message: string,
  concernType: string,
  // Expecting the {role, content} structure from the chat API caller
  recentMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []
): Promise<{
  isRealConcern: boolean;
  concernLevel: number; // 0-5 scale
  analysisExplanation: string;
}> {
  let contextString = '';
  if (recentMessages.length > 0) {
    contextString = "\n\nRecent Conversation History (most recent last):\n";
    // Use the passed context messages
    recentMessages.slice(-3).forEach(msg => { // Limit context
      contextString += `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}\n`;
    });
  }

  // --- Adjusted Prompt for Clarity and JSON Focus ---
  const promptForModel = `
You are an AI safety analyst reviewing a student's chat message.
Concern Category Identified: ${concernType.replace(/_/g, ' ')}
${contextString}
Student Message: "${message}"

Task: Evaluate the student message ONLY for the concern category mentioned above. Is it a genuine concern? Rate its severity (0=None, 1=Minor, 2=Moderate, 3=Significant, 4=High, 5=Critical). Distinguish real issues from fiction/hypotheticals.

Respond ONLY with a valid JSON object containing these exact keys:
"isRealConcern": boolean
"concernLevel": number (0-5)
"analysisExplanation": string (1-2 sentence explanation)

JSON Output:
`;
  // --- End Prompt ---

  try {
    console.log(`[Safety Verification] Calling OpenRouter model: ${SAFETY_CHECK_MODEL}`);

    // --- Using fetch to call OpenRouter ---
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          // Identify your app to OpenRouter
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
          'X-Title': 'ClassBots AI - Safety Check', // Be specific
        },
        body: JSON.stringify({
          model: SAFETY_CHECK_MODEL,
          messages: [
            // Structure for models like Gemma: put the main instruction in the user message
            { role: "user", content: promptForModel }
          ],
          temperature: 0.2, // Low temp for consistent analysis
          max_tokens: 150,  // Should be enough for the JSON response
          response_format: { type: "json_object" } // Request JSON output if model supports it
        }),
      });
    // --- End fetch call ---

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`OpenRouter Error (verifyConcern): Status ${response.status}`, errorBody);
        let errorMessage = `OpenRouter API error (status ${response.status})`;
        try {
            const errorJson = JSON.parse(errorBody);
            errorMessage = errorJson.error?.message || errorMessage;
        } catch { /* Ignore parsing error */ }
        throw new Error(errorMessage); // Throw error to be caught below
    }

    const responseData = await response.json();

    // --- Parse the response content ---
    const rawResponse = responseData.choices?.[0]?.message?.content;
    if (!rawResponse) {
      throw new Error("OpenRouter response content was empty or missing.");
    }

    let analysis;
    try {
        // Sometimes models might add extra text around the JSON, try to extract JSON
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/); // Find first '{' to last '}'
        if (jsonMatch && jsonMatch[0]) {
            analysis = JSON.parse(jsonMatch[0]);
        } else {
             // If no clear JSON block, try parsing the whole thing (might fail)
            analysis = JSON.parse(rawResponse);
        }
    } catch (parseError) {
         console.error("Failed to parse JSON response from safety model:", rawResponse, parseError);
         // Attempt to extract explanation even if JSON fails, otherwise return generic error
         const extractedExplanation = typeof rawResponse === 'string' ? rawResponse.substring(0, 150) + "..." : "Invalid format received";
         return {
             isRealConcern: true, // Err on the side of caution
             concernLevel: 2,     // Moderate concern default
             analysisExplanation: `Model response was not valid JSON. Raw response snippet: ${extractedExplanation}`
         };
    }
    // --- End response parsing ---

    // Validate the structure and types of the parsed analysis object
    const isRealConcern = typeof analysis.isRealConcern === 'boolean' ? analysis.isRealConcern : false;
    const concernLevel = typeof analysis.concernLevel === 'number'
      ? Math.max(0, Math.min(5, Math.round(analysis.concernLevel))) // Clamp and round
      : 0;
    const analysisExplanation = typeof analysis.analysisExplanation === 'string'
      ? analysis.analysisExplanation.trim()
      : "Analysis explanation missing or invalid format.";

    console.log(`[Safety Verification] LLM Analysis: isReal=${isRealConcern}, level=${concernLevel}, explanation=${analysisExplanation}`);

    return {
      isRealConcern,
      concernLevel,
      analysisExplanation,
    };

  } catch (error) {
    console.error('Error during OpenRouter concern verification:', error);
    // Fallback if API call or parsing fails
    return {
      isRealConcern: true, // Default to true on error
      concernLevel: 2,     // Default to moderate for review
      analysisExplanation: `Concern verification failed: ${error instanceof Error ? error.message : 'Unknown error'}. Flagged for manual review.`,
    };
  }
}

/**
 * Asynchronous function to check message safety.
 */
export async function checkMessageSafety(
  supabase: SupabaseClient<Database>,
  messageContent: string, // Expecting already trimmed content
  messageId: string,
  studentId: string,
  room: Room
): Promise<void> {
  console.log(`[Safety Check] START - Checking message ID: ${messageId} for student ${studentId} in room ${room.room_id}`);
  // --- ADDED LOG: Log the exact content being checked ---
  console.log(`[Safety Check] Message Content Being Checked: "${messageContent}"`);
  // -----------------------------------------------------
  try {
    // Create the admin client that will bypass RLS for writing operations
    const adminClient = createAdminClient();
    
    const { data: flaggedMessageData, error: fetchMsgError } = await supabase
        .from('chat_messages').select('metadata, created_at').eq('message_id', messageId).single();

    if (fetchMsgError || !flaggedMessageData) {
         console.error(`[Safety Check] Failed to fetch flagged message ${messageId} for context query:`, fetchMsgError);
         return;
    }

    const flaggedMessageChatbotId = flaggedMessageData.metadata?.chatbotId || null;
    const flaggedMessageCreatedAt = flaggedMessageData.created_at || new Date().toISOString();

    // --- Run Initial Check ---
    const { hasConcern, concernType } = initialConcernCheck(messageContent);
    console.log(`[Safety Check] Initial Check Result: hasConcern=${hasConcern}, concernType=${concernType}`); // Log result

    if (hasConcern && concernType) {
        console.log(`[Safety Check] Initial concern FOUND: ${concernType}. Fetching context...`);

        const { data: contextMessagesData, error: contextError } = await supabase
            .from('chat_messages').select('role, content')
            .eq('room_id', room.room_id).eq('user_id', studentId)
            .filter('metadata->>chatbotId', flaggedMessageChatbotId ? 'eq' : 'is', flaggedMessageChatbotId || null)
            .lt('created_at', flaggedMessageCreatedAt).order('created_at', { ascending: false }).limit(2);

         if (contextError) console.warn(`[Safety Check] Error fetching context for msg ${messageId}:`, contextError.message);

         const recentMessagesForSafetyCheck = (contextMessagesData || [])
            .map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content || '' }));

        console.log(`[Safety Check] Calling verifyConcern LLM...`);
        const { isRealConcern, concernLevel, analysisExplanation } = await verifyConcern(
            messageContent, concernType, recentMessagesForSafetyCheck.reverse()
        );
         console.log(`[Safety Check] verifyConcern Result: isReal=${isRealConcern}, level=${concernLevel}, explanation=${analysisExplanation}`);

        if (isRealConcern && concernLevel >= 3) { // Assuming CONCERN_THRESHOLD = 3
            console.log(`[Safety Check] THRESHOLD MET! Level ${concernLevel} >= 3. Flagging...`);

            // Fetch profiles using 'full_name'
            const { data: teacherProfileData, error: teacherError } = await supabase
                .from('profiles').select('email').eq('user_id', room.teacher_id).single();
            const { data: studentProfileData, error: studentError } = await supabase
                .from('profiles').select('full_name').eq('user_id', studentId).single();

            if (teacherError || !teacherProfileData?.email) console.error(`[Safety Check] Could not fetch teacher email for teacher ${room.teacher_id}. Error:`, teacherError?.message);
            if (studentError) console.warn(`[Safety Check] Could not fetch student profile for student ${studentId}. Error:`, studentError?.message);

            const teacherEmail = teacherProfileData?.email;
            const studentName = studentProfileData?.full_name || `Student (${studentId.substring(0,6)}...)`;

            console.log(`[Safety Check] Inserting flag into DB for message ${messageId} using ADMIN client...`);
            
            // Use the adminClient for the insert operation to bypass RLS
            const { data: insertedFlag, error: flagError } = await adminClient
                .from('flagged_messages').insert({
                    message_id: messageId, 
                    student_id: studentId, 
                    teacher_id: room.teacher_id, 
                    room_id: room.room_id,
                    concern_type: concernType, 
                    concern_level: concernLevel, 
                    analysis_explanation: analysisExplanation, 
                    status: 'pending',
                }).select('flag_id').single();

            if (flagError || !insertedFlag) {
                console.error(`[Safety Check] FAILED to insert flag for message ${messageId} with ADMIN client:`, flagError);
            } else {
                const newFlagId = insertedFlag.flag_id;
                console.log(`[Safety Check] Flag ${newFlagId} inserted successfully for message ${messageId}.`);
                if (teacherEmail) {
                    console.log(`[Safety Check] Attempting to send alert to ${teacherEmail} for flag ${newFlagId}...`);
                    const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/teacher-dashboard/concerns/${newFlagId}`;
                    const alertSent = await sendTeacherAlert(
                      teacherEmail, 
                      studentName, 
                      room.room_name, 
                      concernType, 
                      concernLevel, 
                      messageContent, 
                      viewUrl
                    );
                     console.log(`[Safety Check] Alert sent status for flag ${newFlagId}: ${alertSent}`);
                } else { 
                  console.warn(`[Safety Check] Teacher email not found. Cannot send alert for flag ${newFlagId}.`); 
                }
            }
        } else { 
          console.log(`[Safety Check] Concern level ${concernLevel} did NOT meet threshold 3 or was not deemed real.`); 
        }
    } else { 
      console.log(`[Safety Check] No initial concern detected.`); 
    }
  } catch (error) { 
    console.error(`[Safety Check] UNCAUGHT ERROR in checkMessageSafety for message ID ${messageId}:`, error); 
  }
   console.log(`[Safety Check] END - Checked message ID: ${messageId}`);
}