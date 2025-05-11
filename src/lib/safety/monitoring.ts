// src/lib/safety/monitoring.ts
import type { Room } from '@/types/database.types';
import { createAdminClient } from '@/lib/supabase/admin';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { sendTeacherAlert } from '@/lib/safety/alerts';

// OpenRouter Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SAFETY_CHECK_MODEL = 'meta-llama/llama-4-scout';
const CONCERN_THRESHOLD = 3;

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
  if (!message) {
    console.log("[InitialCheck DEBUG] Message is empty or null.");
    return { hasConcern: false };
  }
  const lowerMessage = message.toLowerCase();
  console.log(`[InitialCheck DEBUG] lowerMessage: "${lowerMessage}"`);

  for (const [category, keywords] of Object.entries(CONCERN_KEYWORDS)) {
    if (category === 'self_harm') {
        console.log("[InitialCheck DEBUG] Checking self_harm keywords...");
        for (const keyword of keywords) {
            const escapedKeyword = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedKeyword}\\b`);
            
            if (keyword === 'want to die' || keyword === 'kill myself' || keyword === 'suicidal' || keyword === 'hate myself') { 
                console.log(`[InitialCheck DEBUG] Keyword: "${keyword}", Escaped: "${escapedKeyword}", Regex: ${regex}`);
                console.log(`[InitialCheck DEBUG] Testing regex against lowerMessage for "${keyword}": ${regex.test(lowerMessage)}`);
            }

            if (regex.test(lowerMessage)) {
                console.log(`[InitialCheck DEBUG] MATCH FOUND! Category: ${category}, Keyword: "${keyword}"`);
                return { hasConcern: true, concernType: category };
            }
        }
    } else { 
        for (const keyword of keywords) {
            const escapedKeyword = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedKeyword}\\b`);
            if (regex.test(lowerMessage)) {
                 console.log(`[InitialCheck DEBUG] MATCH FOUND! Category: ${category}, Keyword: "${keyword}"`);
                return { hasConcern: true, concernType: category };
            }
        }
    }
  }

  console.log("[InitialCheck DEBUG] Checking heuristics...");
  if (lowerMessage.includes('hate myself') && 
      (lowerMessage.includes('not worth') || lowerMessage.includes('don\'t know what to do'))) {
    console.log("[InitialCheck DEBUG] Heuristic matched: hate myself + not worth/don't know what to do");
    return { hasConcern: true, concernType: 'self_harm' };
  }
  
  if ((lowerMessage.includes('not worth') || lowerMessage.includes('no point')) && 
      (lowerMessage.includes('going on') || lowerMessage.includes('living') || lowerMessage.includes('anymore'))) {
    console.log("[InitialCheck DEBUG] Heuristic matched: not worth/no point + going on/living/anymore");
    return { hasConcern: true, concernType: 'self_harm' };
  }
  
  if (lowerMessage.includes('don\'t know what to do') && 
      (lowerMessage.includes('anymore') || lowerMessage.includes('sad') || lowerMessage.includes('feel'))) {
    console.log("[InitialCheck DEBUG] Heuristic matched: don't know what to do + anymore/sad/feel");
    return { hasConcern: true, concernType: 'depression' };
  }

  if (lowerMessage.includes("want to die") || lowerMessage.includes("wanna die") || lowerMessage.includes("kill myself")) {
    console.log("[InitialCheck DEBUG] Heuristic matched: direct suicidal phrase via .includes()");
    return { hasConcern: true, concernType: 'self_harm' };
  }

  console.log("[InitialCheck DEBUG] No keywords or heuristics matched.");
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
  concernLevel: number; // 0-5 scale
  analysisExplanation: string;
}> {
  let contextString = '';
  if (recentMessages.length > 0) {
    contextString = "\n\nRecent Conversation History (most recent last):\n";
    recentMessages.slice(-3).forEach(msg => { 
      contextString += `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}\n`;
    });
  }

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

  try {
    console.log(`[Safety Verification] Calling OpenRouter model: ${SAFETY_CHECK_MODEL}`);
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
          'X-Title': 'ClassBots AI - Safety Check', 
        },
        body: JSON.stringify({
          model: SAFETY_CHECK_MODEL,
          messages: [ { role: "user", content: promptForModel } ],
          temperature: 0.2, 
          max_tokens: 200,
          response_format: { type: "json_object" } 
        }),
      });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`OpenRouter Error (verifyConcern): Status ${response.status}`, errorBody);
        let errorMessage = `OpenRouter API error (status ${response.status})`;
        try {
            const errorJson = JSON.parse(errorBody);
            errorMessage = errorJson.error?.message || errorMessage;
        } catch { /* Ignore parsing error */ }
        throw new Error(errorMessage);
    }

    const responseData = await response.json();
    const rawResponse = responseData.choices?.[0]?.message?.content;
    if (!rawResponse) {
      throw new Error("OpenRouter response content was empty or missing.");
    }

    let analysis;
    try {
        console.log("[Safety Verification DEBUG] Raw response from LLM:", rawResponse);
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/); 
        if (jsonMatch && jsonMatch[0]) {
            analysis = JSON.parse(jsonMatch[0]);
             console.log("[Safety Verification DEBUG] Parsed JSON from match:", analysis);
        } else {
            analysis = JSON.parse(rawResponse);
             console.log("[Safety Verification DEBUG] Parsed JSON from raw response:", analysis);
        }
    } catch (parseError) {
         console.error("Failed to parse JSON response from safety model:", rawResponse, parseError);
         const extractedExplanation = typeof rawResponse === 'string' ? rawResponse.substring(0, 150) + "..." : "Invalid format received";
         return {
             isRealConcern: true, 
             concernLevel: 3,    
             analysisExplanation: `Model response was not valid JSON. Raw response snippet: ${extractedExplanation}`
         };
    }

    const isRealConcern = typeof analysis.isRealConcern === 'boolean' ? analysis.isRealConcern : false;
    const concernLevel = typeof analysis.concernLevel === 'number'
      ? Math.max(0, Math.min(5, Math.round(analysis.concernLevel))) 
      : 0;
    const analysisExplanation = typeof analysis.analysisExplanation === 'string'
      ? analysis.analysisExplanation.trim()
      : "Analysis explanation missing or invalid format.";

    console.log(`[Safety Verification] LLM Analysis: isReal=${isRealConcern}, level=${concernLevel}, explanation=${analysisExplanation}`);
    return { isRealConcern, concernLevel, analysisExplanation };

  } catch (error) {
    console.error('Error during OpenRouter concern verification:', error);
    return {
      isRealConcern: true, 
      concernLevel: 3,  
      analysisExplanation: `Concern verification failed: ${error instanceof Error ? error.message : 'Unknown error'}. Flagged for manual review.`,
    };
  }
}

/**
 * ULTRA-SIMPLIFIED VERSION - Always uses hardcoded email
 */
export async function checkMessageSafety(
    userContextSupabase: SupabaseClient<Database>,
    messageContent: string,
    messageId: string, 
    studentId: string, 
    room: Room 
): Promise<void> {
    console.log("***************************************************************************");
    console.log("**** EXECUTING ULTRA-SIMPLIFIED FUNCTION WITH HARDCODED EMAIL ADDRESS ****");
    console.log("***************************************************************************");
    
    console.log(`[SAFETY CHECK] START - Checking message ${messageId}`);
    
    try {
        // Create admin client
        const adminClient = createAdminClient();
        
        // Run initial concern check
        const { hasConcern, concernType } = initialConcernCheck(messageContent);
        
        if (hasConcern && concernType) {
            console.log(`[SAFETY CHECK] Initial concern found: ${concernType}`);
            
            // Get context messages - simplified, no filtering by chatbot
            const { data: contextMessages } = await adminClient
                .from('chat_messages')
                .select('role, content')
                .eq('room_id', room.room_id)
                .eq('user_id', studentId)
                .order('created_at', { ascending: false })
                .limit(2);
                
            const recentMessagesForSafetyCheck = (contextMessages || [])
                .map(m => ({ 
                    role: m.role as 'user' | 'assistant' | 'system', 
                    content: m.content || '' 
                }));
            
            // Verify concern with LLM
            const { isRealConcern, concernLevel, analysisExplanation } = await verifyConcern(
                messageContent, concernType, recentMessagesForSafetyCheck.reverse()
            );
            
            console.log(`[SAFETY CHECK] Concern verification: isReal=${isRealConcern}, level=${concernLevel}`);
            
            if (isRealConcern && concernLevel >= CONCERN_THRESHOLD) {
                console.log(`[SAFETY CHECK] THRESHOLD MET! Level ${concernLevel} >= ${CONCERN_THRESHOLD}`);
                
                // Get simple student name
                const { data: studentData } = await adminClient
                    .from('profiles')
                    .select('full_name')
                    .eq('user_id', studentId)
                    .single();
                    
                const studentName = studentData?.full_name || `Student`;
                
                // Insert flag into database
                const { data: insertedFlag, error: flagError } = await adminClient
                    .from('flagged_messages')
                    .insert({
                        message_id: messageId, 
                        student_id: studentId, 
                        teacher_id: room.teacher_id, 
                        room_id: room.room_id, 
                        concern_type: concernType, 
                        concern_level: concernLevel, 
                        analysis_explanation: analysisExplanation, 
                        status: 'pending'
                    })
                    .select('flag_id')
                    .single();
                
                if (flagError) {
                    console.error(`[SAFETY CHECK] Error inserting flag:`, flagError.message);
                    return;
                }
                
                if (insertedFlag?.flag_id) {
                    console.log(`[SAFETY CHECK] Flag ${insertedFlag.flag_id} inserted successfully`);
                    
                    // MAXIMUM SIMPLICITY: HARDCODED EMAIL
                    const hardcodedEmail = "darren@coxon.ai";
                    console.log(`[SAFETY CHECK] Using hardcoded email: ${hardcodedEmail}`);
                    
                    const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/teacher-dashboard/concerns/${insertedFlag.flag_id}`;
                    
                    // Send the alert with hardcoded email
                    const alertSent = await sendTeacherAlert(
                        hardcodedEmail,
                        studentName,
                        room.room_name || "Classroom",
                        concernType,
                        concernLevel,
                        messageContent,
                        viewUrl
                    );
                    
                    console.log(`[SAFETY CHECK] Email alert sent: ${alertSent}`);
                    
                    if (!alertSent) {
                        console.error(`[SAFETY CHECK] Failed to send email alert.`);
                    }
                }
            } else {
                console.log(`[SAFETY CHECK] Concern level ${concernLevel} did NOT meet threshold ${CONCERN_THRESHOLD} or was not deemed real.`);
            }
        } else {
            console.log(`[SAFETY CHECK] No initial concern detected.`);
        }
    } catch (error) {
        console.error('[SAFETY CHECK] Error:', error instanceof Error ? error.message : String(error));
    }
    
    console.log(`[SAFETY CHECK] END - Checked message ${messageId}`);
}