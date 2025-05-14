// src/lib/safety/monitoring.ts
import type { Room, Database } from '@/types/database.types'; // Removed unused Profile import
import { createAdminClient } from '@/lib/supabase/admin';
import { SupabaseClient } from '@supabase/supabase-js';
import { sendTeacherAlert } from '@/lib/safety/alerts';
// Import the JSON data
import HELPLINE_DATA_JSON from './data/helplines.json'; // Ensure this path is correct and the file exists

// OpenRouter Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SAFETY_CHECK_MODEL = 'google/gemini-2.5-flash-preview';
const CONCERN_THRESHOLD = 3;

// Keywords organized by category - FULL LIST AS PROVIDED
const CONCERN_KEYWORDS: Record<string, string[]> = {
  self_harm: [
    'hate myself', 'don\'t want to live', 'don\'t want to be alive', 'don\'t want to be here', 'don\'t want to exist',
    'not worth going on', 'no point in living', 'no point going on', 'rather be dead', 'should end it',
    'should end it all', 'end it all', 'give up', 'giving up', 'take my own life', 'take my life',
    'harming myself', 'harm myself', 'hurting myself', 'cut myself', 'cutting myself', 'disappear forever',
    'everyone better off without me', 'they\'d be better off without me', 'they would be better off without me',
    'leave this world', 'escape this world', 'stop existing', 'tired of being alive', 'tired of existing',
    'too much pain', 'can\'t take it anymore', 'life is too hard', 'life isn\'t worth it', 'never wake up',
    'wish I wouldn\'t wake up', 'make the pain stop', 'no hope left', 'nowhere to turn', 'plan to kill',
    'how to end', 'easier if I wasn\'t here', 'easier if I was gone', 'want to die', 'wanna die',
    'kill myself', 'suicidal'
  ],
  bullying: [
    'bullied', 'bully', 'bullying', 'they hate me', 'everyone hates me', 'laughed at me', 'laugh at me',
    'excluded', 'leave me out', 'leaving me out', 'no friends', 'don\'t have friends', 'nobody likes me',
    'no one likes me', 'call me names', 'called me names', 'push me around', 'pushed me', 'shove me',
    'shoved me', 'making threats', 'threatened me', 'online bullying', 'cyberbullying', 'posting about me',
    'spreading rumors', 'spreading rumours', 'spreading lies', 'everyone talks about me', 'made fun of',
    'mock me', 'mocking me', 'rejected by everyone', 'being isolated', 'no one talks to me',
    'nobody talks to me', 'they ignore me', 'everyone ignores me', 'being targeted', 'pick on me',
    'won\'t leave me alone', 'always after me', 'ganging up on me', 'scared to go to school',
    'don\'t want to go to school', 'afraid at school', 'scared at school'
  ],
  abuse: [
    'hurt me', 'hurting me', 'hitting me', 'hit by', 'kicks me', 'kicking me', 'pushed me', 'pushes me',
    'throws things at me', 'threw things at me', 'threw something at me', 'yells at me', 'yelling at me',
    'screams at me', 'screaming at me', 'threatens me', 'threatening me', 'controls me', 'controlling me',
    'not allowed to', 'won\'t let me', 'keeps me from', 'locked me in', 'locks me in', 'touches me',
    'touched me', 'uncomfortable touching', 'hurt by someone', 'afraid of them', 'afraid to go home',
    'scared to go home', 'not safe at home', 'don\'t feel safe around', 'being punished',
    'punishes me unfairly', 'treated badly', 'treats me badly', 'calls me stupid', 'calls me worthless',
    'makes me feel worthless', 'makes me feel bad', 'punched me', 'punches me', 'slapped me', 'slaps me',
    'bruises from', 'left bruises', 'threatened to hurt me if I told', 'can\'t tell anyone'
  ],
  depression: [
    'hate my life', 'no one cares', 'nobody cares', 'nobody loves me', 'no one loves me', 'feel empty',
    'feeling empty', 'feel nothing', 'feels like nothing matters', 'nothing matters', 'what\'s the point',
    'feel worthless', 'feeling worthless', 'don\'t feel anything', 'don\'t know what to do',
    'can\'t see a future', 'lost all hope', 'lost hope', 'given up', 'feel like a failure', 'am a failure',
    'everything is dark', 'darkness closing in', 'can\'t get out of bed', 'can\'t face the day',
    'crying all the time', 'crying myself to sleep', 'never happy', 'always feeling down', 'feel so alone',
    'completely alone', 'no one understands', 'nobody understands', 'don\'t enjoy anything',
    'nothing makes me happy', 'too sad to function', 'too sad to do anything', 'life is meaningless',
    'unable to feel joy', 'can\'t sleep', 'can\'t eat', 'can\'t concentrate', 'mind feels foggy',
    'exhausted all the time', 'overwhelmed by sadness', 'drowning in sadness'
  ],
  family_issues: [
    'parents always fighting', 'parents always argue', 'parents hate each other', 'home is not safe',
    'scared at home', 'afraid at home', 'can\'t stand being home', 'hate being home', 'nowhere to go',
    'might get kicked out', 'might be kicked out', 'threatened to kick me out', 'parent drinking',
    'parent drunk', 'parents drunk', 'drinking problem', 'drug problem', 'parents using drugs',
    'parent using drugs', 'not enough food', 'going hungry', 'no food at home', 'can\'t sleep at home',
    'parents separated', 'parents separating', 'parents broke up', 'parents splitting up',
    'losing our house', 'lost our house', 'might be homeless', 'could be homeless',
    'moving in with relatives', 'have to move', 'parent lost job', 'no money for', 'can\'t afford',
    'parent in jail', 'parent arrested', 'no one takes care of me', 'have to take care of myself',
    'have to take care of my siblings', 'parent is sick', 'parent is ill', 'parent in hospital',
    'no electricity', 'utilities shut off', 'water shut off'
  ],
};

// Type for the imported JSON data
type HelplineEntry = { name: string; phone?: string; website?: string; text_to?: string; text_msg?: string; short_desc: string };
type HelplineData = Record<string, HelplineEntry[]>;
const ALL_HELPLINES: HelplineData = HELPLINE_DATA_JSON as HelplineData;

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
        const regex = new RegExp(`\\b${escapedKeyword}\\b`);
        if (regex.test(lowerMessage)) {
            console.log(`[InitialCheck] Keyword MATCH! Category: ${category}, Keyword: "${keyword}"`);
            return { hasConcern: true, concernType: category };
        }
    }
  }
  if (lowerMessage.includes('hate myself') && (lowerMessage.includes('not worth') || lowerMessage.includes('don\'t know what to do'))) {
    return { hasConcern: true, concernType: 'self_harm' };
  }
  if ((lowerMessage.includes('not worth') || lowerMessage.includes('no point')) && (lowerMessage.includes('going on') || lowerMessage.includes('living') || lowerMessage.includes('anymore'))) {
    return { hasConcern: true, concernType: 'self_harm' };
  }
  return { hasConcern: false };
}

export async function verifyConcern(
  message: string,
  concernType: string,
  recentMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [],
  countryCode: string | null
): Promise<{
  isRealConcern: boolean;
  concernLevel: number;
  analysisExplanation: string;
  aiGeneratedAdvice?: string;
}> {
  // --- START OF ADDED CONSOLE LOGS FOR DEBUGGING ---
  console.log(`[VerifyConcern DEBUG] Function called. Received countryCode: "${countryCode}" (Type: ${typeof countryCode})`);
  // --- END OF ADDED CONSOLE LOGS FOR DEBUGGING ---

  let contextString = '';
  if (recentMessages.length > 0) {
    contextString = "\n\nRecent Conversation History (most recent last):\n";
    recentMessages.slice(-3).forEach(msg => {
      const roleLabel = msg.role === 'user' ? 'Student' : (msg.role === 'assistant' ? 'Assistant' : 'System');
      contextString += `${roleLabel}: ${msg.content}\n`;
    });
  }

  const effectiveCountryCode = countryCode?.toUpperCase() || 'DEFAULT';
  // --- ADDED CONSOLE LOG ---
  console.log(`[VerifyConcern DEBUG] Effective country code for helpline lookup: "${effectiveCountryCode}"`);

  const countrySpecificHelplines: HelplineEntry[] = ALL_HELPLINES[effectiveCountryCode] || ALL_HELPLINES.DEFAULT;
  // --- ADDED CONSOLE LOG ---
  console.log(`[VerifyConcern DEBUG] Selected countrySpecificHelplines for "${effectiveCountryCode}" (first 3 entries):`, JSON.stringify(countrySpecificHelplines.slice(0,3), null, 2));


  let conciseHelplineDataForPrompt = "";
  const helplinesToList = countrySpecificHelplines.slice(0, 2); 

  if (helplinesToList.length > 0) {
    conciseHelplineDataForPrompt = "Relevant Support Contacts (use ONLY these for the student's country):\n";
    helplinesToList.forEach(line => {
      conciseHelplineDataForPrompt += `* ${line.name}`;
      if (line.phone) {
        conciseHelplineDataForPrompt += ` - Phone: ${line.phone}`;
      } else if (line.text_to && line.text_msg) {
        conciseHelplineDataForPrompt += ` - Text: ${line.text_msg} to ${line.text_to}`;
      } else if (line.website) {
        const shortWebsite = line.website.length > 20 ? line.website.substring(0, 17) + "..." : line.website;
        conciseHelplineDataForPrompt += ` - Website: ${shortWebsite}`;
      }
      conciseHelplineDataForPrompt += "\n";
    });
  } else { 
       conciseHelplineDataForPrompt = "Please reach out to a trusted adult or local emergency services if you need help or are in danger.\n";
  }
  
  // --- ADDED CONSOLE LOG ---
  console.log(`[VerifyConcern DEBUG] conciseHelplineDataForPrompt string for LLM:\n${conciseHelplineDataForPrompt}`);

  const teacherAwarenessMandatorySentence = "Remember, your teacher can see this conversation and is here to support you. Please feel comfortable reaching out to them or another trusted adult if you need help.";

  const promptParts = [
    `You are an AI safety assistant. Your task is to review a student's chat message for a specific concern and provide guidance if necessary.`,
    `Concern Category Identified by Keywords: ${concernType.replace(/_/g, ' ')}`,
    contextString,
    `Student's Message: "${message}"`,
    `\nTasks:`,
    `1.  **Analysis for Teacher (Internal):**`,
    `    a.  **isRealConcern**: (boolean: true/false) Is the concern genuine?`,
    `    b.  **concernLevel**: (number 0-5) If genuine, assess severity.`,
    `    c.  **analysisExplanation**: (string) Briefly explain for the teacher (1-2 sentences).\n`,
    `2.  **Message for Student (aiGeneratedAdvice):**`,
    `    If \`isRealConcern\` is true AND \`concernLevel\` is 2 or higher, compose a **VERY SHORT (max 3-4 sentences total, including helplines), empathetic, and DIRECT message**. This message MUST:`,
    `    a.  Start with a brief, caring acknowledgment (e.g., "I hear that you're going through a tough time," or "It sounds like you're feeling [X]."). This should be one sentence.`,
    `    b.  **Include this exact sentence VERBATIM**: "${teacherAwarenessMandatorySentence}"`,
    `    c.  **Then, you MUST list ONLY the specific support contacts shown between the START and END markers below. Do NOT add any other helplines or general advice beyond this provided list for this section. Present them as a simple list**:`,
    `        ---START OF PROVIDED HELPLINES---`,
    `        ${conciseHelplineDataForPrompt.trim()}`,
    `        ---END OF PROVIDED HELPLINES---`,
    `    d.  End with a very short supportive closing (e.g., "Please reach out." or "Help is available."). This should be one sentence.`,
    `    e.  The entire message must be very succinct and focused. Do not add any extra information not explicitly requested.\n`,
    `Respond ONLY with a valid JSON object with these exact keys:`,
    `"isRealConcern": boolean,`,
    `"concernLevel": number,`,
    `"analysisExplanation": string,`,
    `"aiGeneratedAdvice": string (Omit this key or set to null if conditions in Task 2 are not met, or if you cannot follow the student message constraints exactly.)`
  ];
  const promptForModel = promptParts.join('\n');
  // --- ADDED CONSOLE LOG ---
  console.log(`[VerifyConcern DEBUG] Full promptForModel being sent to LLM (first 700 chars to see helpline injection):\n${promptForModel.substring(0,700)}...`);


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
          max_tokens: 300, 
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
     // --- ADDED CONSOLE LOG ---
    console.log(`[VerifyConcern DEBUG] Raw LLM response content:\n${rawResponseContent}`);


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
                try {
                    analysisResult = JSON.parse(rawResponseContent);
                } catch (innerParseError) {
                    console.error("[VerifyConcern] Final attempt to parse rawResponseContent as JSON failed:", rawResponseContent, innerParseError);
                    throw new Error("No valid JSON found in LLM response for safety verification after multiple attempts.");
                }
            }
        }
    } catch (parseError) {
         console.error("[VerifyConcern] Failed to parse JSON from safety model:", rawResponseContent, parseError);
         let fallbackAdvice = `I understand this might be a difficult time. ${teacherAwarenessMandatorySentence}\n\nPlease consider reaching out to a trusted adult.`;
         const defaultHelplines = ALL_HELPLINES.DEFAULT || [];
         if (defaultHelplines.length > 0) {
             fallbackAdvice += "\nHere are some general resources:\n";
             defaultHelplines.slice(0,2).forEach(line => {
                fallbackAdvice += `* ${line.name}`;
                if (line.phone) fallbackAdvice += `: ${line.phone}`;
                else if (line.text_to && line.text_msg) fallbackAdvice += ` (Text ${line.text_msg} to ${line.text_to})`;
                else if (line.website) fallbackAdvice += ` (${line.website})`;
                fallbackAdvice += `\n`;
             });
         }
         fallbackAdvice += "Help is available.";
         return {
             isRealConcern: true, 
             concernLevel: 3,
             analysisExplanation: `Safety model response was not valid JSON. Raw snippet: ${String(rawResponseContent).substring(0, 150)}... Review manually.`,
             aiGeneratedAdvice: fallbackAdvice
         };
    }

    const isRealConcern = typeof analysisResult.isRealConcern === 'boolean' ? analysisResult.isRealConcern : false;
    const concernLevel = typeof analysisResult.concernLevel === 'number'
      ? Math.max(0, Math.min(5, Math.round(analysisResult.concernLevel)))
      : (isRealConcern ? 3 : 0);
    const analysisExplanation = typeof analysisResult.analysisExplanation === 'string'
      ? analysisResult.analysisExplanation.trim()
      : "AI analysis explanation was not provided or in an invalid format.";
    
    let aiGeneratedAdvice: string | undefined = undefined;
    if (isRealConcern && concernLevel >= 2 && typeof analysisResult.aiGeneratedAdvice === 'string' && analysisResult.aiGeneratedAdvice.trim() !== "") {
        aiGeneratedAdvice = analysisResult.aiGeneratedAdvice.trim();
        if (aiGeneratedAdvice && !aiGeneratedAdvice.includes(teacherAwarenessMandatorySentence)) {
            console.warn("[VerifyConcern] LLM advice generated but missed the mandatory teacher awareness sentence. Prepending it.");
            aiGeneratedAdvice = `${teacherAwarenessMandatorySentence}\n${aiGeneratedAdvice}`;
        }
    } else if (isRealConcern && concernLevel >= 2) {
        console.warn("[VerifyConcern] LLM met conditions for advice but 'aiGeneratedAdvice' field was missing or empty. Constructing concise default advice.");
        let defaultAdvice = `I understand this may be a tough moment. ${teacherAwarenessMandatorySentence}\n\nHere are some resources that might help:\n`;
        const helplinesForDefaultForStudent = countrySpecificHelplines.slice(0, 2); // Use the already filtered list
        if (helplinesForDefaultForStudent.length > 0) {
            helplinesForDefaultForStudent.forEach(line => { 
                defaultAdvice += `* ${line.name}`;
                if (line.phone) defaultAdvice += `: ${line.phone}`;
                else if (line.text_to && line.text_msg) defaultAdvice += ` (Text ${line.text_msg} to ${line.text_to})`;
                else if (line.website) defaultAdvice += ` (${line.website})`;
                defaultAdvice += "\n";
            });
        } else { 
            ALL_HELPLINES.DEFAULT.slice(0,2).forEach(line => { // Fallback to generic default if countrySpecific was empty
                 defaultAdvice += `* ${line.name}`;
                if (line.phone) defaultAdvice += `: ${line.phone}`;
                else if (line.text_to && line.text_msg) defaultAdvice += ` (Text ${line.text_msg} to ${line.text_to})`;
                else if (line.website) defaultAdvice += ` (${line.website})`;
                defaultAdvice += "\n";
            });
        }
        defaultAdvice += "Please reach out for support.";
        aiGeneratedAdvice = defaultAdvice;
    }

    console.log(`[VerifyConcern] LLM Analysis: isReal=${isRealConcern}, level=${concernLevel}, explanation="${analysisExplanation}", adviceProvided=${!!aiGeneratedAdvice}`);
    return { isRealConcern, concernLevel, analysisExplanation, aiGeneratedAdvice };

  } catch (error) {
    console.error('[VerifyConcern] Error during OpenRouter call or processing:', error);
    let defaultFallbackAdvice = `It's important to reach out if you're struggling. ${teacherAwarenessMandatorySentence}\n\nHere are some general resources:\n`;
    const defaultHelplinesOnCatch = ALL_HELPLINES.DEFAULT || [];
    defaultHelplinesOnCatch.slice(0,2).forEach(line => {
        defaultFallbackAdvice += `* ${line.name}`;
        if (line.phone) defaultFallbackAdvice += `: ${line.phone}`;
        else if (line.text_to && line.text_msg) defaultFallbackAdvice += ` (Text ${line.text_msg} to ${line.text_to})`;
        else if (line.website) defaultFallbackAdvice += ` (${line.website})`;
        defaultFallbackAdvice += "\n";
    });
    defaultFallbackAdvice += "Help is available.";
    return {
      isRealConcern: true, 
      concernLevel: 3,
      analysisExplanation: `Concern verification process failed: ${error instanceof Error ? error.message : 'Unknown LLM call error'}. Flagged for manual review.`,
      aiGeneratedAdvice: defaultFallbackAdvice
    };
  }
}

export async function checkMessageSafety(
    supabaseUserContextClient: SupabaseClient<Database>,
    messageContent: string,
    messageId: string,
    studentId: string,
    room: Room,
    countryCode: string | null 
): Promise<void> {
    // Added the debug log here, as requested in the previous step, to see what checkMessageSafety receives
    console.log(`[Safety Check] START - MsgID: ${messageId}, Student: ${studentId}, Room: ${room.room_id}, Teacher: ${room.teacher_id}, Received Country Code by checkMessageSafety: "${countryCode}"`);
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
            
            const { isRealConcern, concernLevel, analysisExplanation, aiGeneratedAdvice } = await verifyConcern(
                messageContent,
                concernType,
                recentMessagesForSafetyLLM,
                countryCode 
            );

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
                
                const newFlagId = insertedFlag!.flag_id;
                console.log(`[Safety Check] Flag ${newFlagId} inserted for message ${messageId}.`);
                if (teacherProfile?.email) {
                    const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/teacher-dashboard/concerns/${newFlagId}`;
                    await sendTeacherAlert(teacherProfile.email,studentName,room.room_name || `Room (ID: ${room.room_id.substring(0,6)})`,concernType,concernLevel,messageContent,viewUrl);
                } else { console.warn(`[Safety Check] Teacher email for ${room.teacher_id} not found. Cannot send alert for flag ${newFlagId}.`);}
            } else { console.log(`[Safety Check] Concern level ${concernLevel} < threshold ${CONCERN_THRESHOLD} or not real.`); }

            if (aiGeneratedAdvice && aiGeneratedAdvice.trim() !== "") {
                console.log(`[Safety Check] Inserting AI-generated advice for student ${studentId} in room ${room.room_id}`);
                const { error: adviceInsertError } = await adminClient
                    .from('chat_messages')
                    .insert({
                        room_id: room.room_id,
                        user_id: studentId, 
                        role: 'system',    
                        content: aiGeneratedAdvice,
                        metadata: {
                            chatbotId: currentMessageData.metadata?.chatbotId || null, 
                            isSystemSafetyResponse: true, 
                            originalConcernType: concernType,
                            originalConcernLevel: concernLevel
                        },
                    });
                if (adviceInsertError) {
                    console.error(`[Safety Check] FAILED to insert AI advice message:`, adviceInsertError.message);
                } else {
                    console.log(`[Safety Check] Successfully inserted AI advice message.`);
                }
            }

        } else { console.log(`[Safety Check] No initial concern for message ${messageId}.`); }
    } catch (error) { console.error(`[Safety Check] CRITICAL ERROR for msg ${messageId}:`, error); }
    console.log(`[Safety Check] END - Checked message ID: ${messageId}`);
}