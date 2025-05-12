// src/lib/safety/monitoring.ts
import type { Room, Database } from '@/types/database.types';
import { createAdminClient } from '@/lib/supabase/admin';
import { SupabaseClient } from '@supabase/supabase-js';
import { sendTeacherAlert } from '@/lib/safety/alerts';

// OpenRouter Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SAFETY_CHECK_MODEL = 'meta-llama/llama-4-scout';
const CONCERN_THRESHOLD = 3;

// Keywords organized by category - FULL LIST AS PROVIDED
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
    'easier if I was gone',
    'want to die',
    'wanna die',
    'kill myself',
    'suicidal'
  ],
  bullying: [
    'bullied', 'bully', 'bullying', 'they hate me', 'everyone hates me', 'laughed at me', 'laugh at me', 'excluded', 'leave me out', 'leaving me out', 'no friends', 'don\'t have friends', 'nobody likes me', 'no one likes me', 'call me names', 'called me names', 'push me around', 'pushed me', 'shove me', 'shoved me', 'making threats', 'threatened me', 'online bullying', 'cyberbullying', 'posting about me', 'spreading rumors', 'spreading rumours', 'spreading lies', 'everyone talks about me', 'made fun of', 'mock me', 'mocking me', 'rejected by everyone', 'being isolated', 'no one talks to me', 'nobody talks to me', 'they ignore me', 'everyone ignores me', 'being targeted', 'pick on me', 'won\'t leave me alone', 'always after me', 'ganging up on me', 'scared to go to school', 'don\'t want to go to school', 'afraid at school', 'scared at school'
  ],
  abuse: [
    'hurt me', 'hurting me', 'hitting me', 'hit by', 'kicks me', 'kicking me', 'pushed me', 'pushes me', 'throws things at me', 'threw things at me', 'threw something at me', 'yells at me', 'yelling at me', 'screams at me', 'screaming at me', 'threatens me', 'threatening me', 'controls me', 'controlling me', 'not allowed to', 'won\'t let me', 'keeps me from', 'locked me in', 'locks me in', 'touches me', 'touched me', 'uncomfortable touching', 'hurt by someone', 'afraid of them', 'afraid to go home', 'scared to go home', 'not safe at home', 'don\'t feel safe around', 'being punished', 'punishes me unfairly', 'treated badly', 'treats me badly', 'calls me stupid', 'calls me worthless', 'makes me feel worthless', 'makes me feel bad', 'punched me', 'punches me', 'slapped me', 'slaps me', 'bruises from', 'left bruises', 'threatened to hurt me if I told', 'can\'t tell anyone'
  ],
  depression: [
    'hate my life', 'no one cares', 'nobody cares', 'nobody loves me', 'no one loves me', 'feel empty', 'feeling empty', 'feel nothing', 'feels like nothing matters', 'nothing matters', 'what\'s the point', 'feel worthless', 'feeling worthless', 'don\'t feel anything', 'don\'t know what to do', 'can\'t see a future', 'lost all hope', 'lost hope', 'given up', 'feel like a failure', 'am a failure', 'everything is dark', 'darkness closing in', 'can\'t get out of bed', 'can\'t face the day', 'crying all the time', 'crying myself to sleep', 'never happy', 'always feeling down', 'feel so alone', 'completely alone', 'no one understands', 'nobody understands', 'don\'t enjoy anything', 'nothing makes me happy', 'too sad to function', 'too sad to do anything', 'life is meaningless', 'unable to feel joy', 'can\'t sleep', 'can\'t eat', 'can\'t concentrate', 'mind feels foggy', 'exhausted all the time', 'overwhelmed by sadness', 'drowning in sadness'
  ],
  family_issues: [
    'parents always fighting', 'parents always argue', 'parents hate each other', 'home is not safe', 'scared at home', 'afraid at home', 'can\'t stand being home', 'hate being home', 'nowhere to go', 'might get kicked out', 'might be kicked out', 'threatened to kick me out', 'parent drinking', 'parent drunk', 'parents drunk', 'drinking problem', 'drug problem', 'parents using drugs', 'parent using drugs', 'not enough food', 'going hungry', 'no food at home', 'can\'t sleep at home', 'parents separated', 'parents separating', 'parents broke up', 'parents splitting up', 'losing our house', 'lost our house', 'might be homeless', 'could be homeless', 'moving in with relatives', 'have to move', 'parent lost job', 'no money for', 'can\'t afford', 'parent in jail', 'parent arrested', 'no one takes care of me', 'have to take care of myself', 'have to take care of my siblings', 'parent is sick', 'parent is ill', 'parent in hospital', 'no electricity', 'utilities shut off', 'water shut off'
  ],
};

/**
 * First-pass check: Look for concerning keywords in a message.
 */
export function initialConcernCheck(message: string): {
  hasConcern: boolean;
  concernType?: string;
} {
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return { hasConcern: false };
  }
  const lowerMessage = message.toLowerCase();

  for (const [category, keywords] of Object.entries(CONCERN_KEYWORDS)) {
    for (const keyword of keywords) {
        const escapedKeyword = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedKeyword}\\b`); // Word boundary
        if (regex.test(lowerMessage)) {
            console.log(`[InitialCheck] Keyword MATCH! Category: ${category}, Keyword: "${keyword}"`);
            return { hasConcern: true, concernType: category };
        }
    }
  }

  // Your existing heuristics (can be expanded)
  if (lowerMessage.includes('hate myself') && (lowerMessage.includes('not worth') || lowerMessage.includes('don\'t know what to do'))) {
    return { hasConcern: true, concernType: 'self_harm' };
  }
  if ((lowerMessage.includes('not worth') || lowerMessage.includes('no point')) && (lowerMessage.includes('going on') || lowerMessage.includes('living') || lowerMessage.includes('anymore'))) {
    return { hasConcern: true, concernType: 'self_harm' };
  }
  // ... (add more heuristics as needed)

  return { hasConcern: false };
}

/**
 * Second-pass check: Use specified OpenRouter model to verify concern and rate severity.
 */
export async function verifyConcern(
  message: string,
  concernType: string,
  recentMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []
): Promise<{
  isRealConcern: boolean;
  concernLevel: number;
  analysisExplanation: string;
}> {
  let contextString = '';
  if (recentMessages.length > 0) {
    contextString = "\n\nRecent Conversation History (most recent last):\n";
    recentMessages.slice(-3).forEach(msg => {
      const roleLabel = msg.role === 'user' ? 'Student' : (msg.role === 'assistant' ? 'Assistant' : 'System');
      contextString += `${roleLabel}: ${msg.content}\n`;
    });
  }

  const promptForModel = `
You are an AI safety analyst reviewing a student's chat message for a specific concern.
Concern Category Identified by Keywords: ${concernType.replace(/_/g, ' ')}
${contextString}
Student's Message: "${message}"

Task:
1.  Determine if the student's message genuinely expresses the identified concern category. Distinguish real expressions of distress or risk from creative writing, hypothetical scenarios, or misinterpretations of keywords.
2.  If it is a genuine concern, assess its severity level on a scale of 0 to 5 (0=No Concern, 1=Very Low, 2=Low, 3=Moderate, 4=High, 5=Critical).
3.  Provide a brief (1-2 sentences) explanation for your assessment.

Respond ONLY with a valid JSON object with these exact keys:
"isRealConcern": boolean
"concernLevel": number (integer 0-5)
"analysisExplanation": string
`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
          'X-Title': 'ClassBots AI - Safety Verification',
        },
        body: JSON.stringify({
          model: SAFETY_CHECK_MODEL,
          messages: [ { role: "user", content: promptForModel } ],
          temperature: 0.2,
          max_tokens: 250,
          response_format: { type: "json_object" }
        }),
      });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[VerifyConcern] OpenRouter Error: Status ${response.status}`, errorBody);
        throw new Error(`OpenRouter API error (status ${response.status}) during safety verification.`);
    }

    const responseData = await response.json();
    const rawResponseContent = responseData.choices?.[0]?.message?.content;

    if (!rawResponseContent) {
      throw new Error("OpenRouter response for safety verification was empty or missing content.");
    }

    let analysisResult;
    try {
        const jsonMatch = rawResponseContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            analysisResult = JSON.parse(jsonMatch[1]);
        } else {
            const directJsonMatch = rawResponseContent.match(/\{[\s\S]*\}/);
            if (directJsonMatch && directJsonMatch[0]) {
                 analysisResult = JSON.parse(directJsonMatch[0]);
            } else {
                throw new Error("No valid JSON found in LLM response for safety verification.");
            }
        }
    } catch (parseError) {
         console.error("[VerifyConcern] Failed to parse JSON from safety model:", rawResponseContent, parseError);
         return {
             isRealConcern: true, concernLevel: 3,
             analysisExplanation: `Safety model response was not valid JSON. Raw snippet: ${String(rawResponseContent).substring(0, 150)}... Review manually.`
         };
    }

    const isRealConcern = typeof analysisResult.isRealConcern === 'boolean' ? analysisResult.isRealConcern : false;
    const concernLevel = typeof analysisResult.concernLevel === 'number'
      ? Math.max(0, Math.min(5, Math.round(analysisResult.concernLevel)))
      : (isRealConcern ? 3 : 0);
    const analysisExplanation = typeof analysisResult.analysisExplanation === 'string'
      ? analysisResult.analysisExplanation.trim()
      : "AI analysis explanation was not provided or in an invalid format.";

    console.log(`[VerifyConcern] LLM Analysis: isReal=${isRealConcern}, level=${concernLevel}, explanation="${analysisExplanation}"`);
    return { isRealConcern, concernLevel, analysisExplanation };

  } catch (error) {
    console.error('[VerifyConcern] Error during OpenRouter call or processing:', error);
    return {
      isRealConcern: true, concernLevel: 3,
      analysisExplanation: `Concern verification process failed: ${error instanceof Error ? error.message : 'Unknown LLM call error'}. Flagged for manual review.`,
    };
  }
}


export async function checkMessageSafety(
    supabaseUserContextClient: SupabaseClient<Database>,
    messageContent: string,
    messageId: string,
    studentId: string,
    room: Room
): Promise<void> {
    console.log(`[Safety Check] START - MsgID: ${messageId}, Student: ${studentId}, Room: ${room.room_id}, Teacher: ${room.teacher_id}`);
    try {
        const adminClient = createAdminClient();
        const { data: currentMessageData, error: fetchMsgError } = await supabaseUserContextClient
            .from('chat_messages')
            .select('created_at, metadata')
            .eq('message_id', messageId)
            .single();

        if (fetchMsgError || !currentMessageData) {
             console.error(`[Safety Check] Failed to fetch current message ${messageId}:`, fetchMsgError);
             return;
        }

        const { hasConcern, concernType } = initialConcernCheck(messageContent);
        console.log(`[Safety Check] Initial Keyword Check: hasConcern=${hasConcern}, concernType=${concernType || 'N/A'}`);

        if (hasConcern && concernType) {
            const chatbotIdForContext = currentMessageData.metadata?.chatbotId || null;
            const { data: contextMessagesData } = await adminClient
                .from('chat_messages')
                .select('role, content')
                .eq('room_id', room.room_id)
                .eq('user_id', studentId)
                .filter('metadata->>chatbotId', chatbotIdForContext ? 'eq' : 'is', chatbotIdForContext)
                .lt('created_at', currentMessageData.created_at)
                .order('created_at', { ascending: false })
                .limit(4);
            const recentMessagesForSafetyLLM = (contextMessagesData || [])
                .map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content || '' }))
                .reverse();
            const { isRealConcern, concernLevel, analysisExplanation } = await verifyConcern(messageContent, concernType, recentMessagesForSafetyLLM);

            if (isRealConcern && concernLevel >= CONCERN_THRESHOLD) {
                const { data: teacherProfile } = await adminClient.from('profiles').select('email').eq('user_id', room.teacher_id).single();
                const { data: studentProfile } = await adminClient.from('profiles').select('full_name').eq('user_id', studentId).single();
                const studentName = studentProfile?.full_name || `Student (ID: ${studentId.substring(0, 6)}...)`;
                const { data: insertedFlag, error: flagInsertError } = await adminClient.from('flagged_messages').insert({
                    message_id: messageId, student_id: studentId, teacher_id: room.teacher_id,
                    room_id: room.room_id, concern_type: concernType, concern_level: concernLevel,
                    analysis_explanation: analysisExplanation, status: 'pending',
                }).select('flag_id').single();

                if (flagInsertError) { console.error(`[Safety Check] FAILED to insert flag:`, flagInsertError.message); return; }
                
                const newFlagId = insertedFlag!.flag_id; // Assert not null after error check
                console.log(`[Safety Check] Flag ${newFlagId} inserted for message ${messageId}.`);
                if (teacherProfile?.email) {
                    const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/teacher-dashboard/concerns/${newFlagId}`;
                    await sendTeacherAlert(teacherProfile.email,studentName,room.room_name || `Room (ID: ${room.room_id.substring(0,6)})`,concernType,concernLevel,messageContent,viewUrl);
                } else { console.warn(`[Safety Check] Teacher email for ${room.teacher_id} not found. Cannot send alert for flag ${newFlagId}.`);}
            } else { console.log(`[Safety Check] Concern level ${concernLevel} < threshold ${CONCERN_THRESHOLD} or not real.`); }
        } else { console.log(`[Safety Check] No initial concern for message ${messageId}.`); }
    } catch (error) { console.error(`[Safety Check] CRITICAL ERROR for msg ${messageId}:`, error); }
    console.log(`[Safety Check] END - Checked message ID: ${messageId}`);
}