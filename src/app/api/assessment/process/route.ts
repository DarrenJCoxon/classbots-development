// src/app/api/assessment/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { DocumentType } from '@/types/knowledge-base.types'; // For extractTextFromFile
import { extractTextFromFile } from '@/lib/document-processing/extractor';
// Import AssessmentStatusEnum for setting status
import type { AssessmentStatusEnum } from '@/types/database.types';

// Define interface for global cache
interface GlobalWithCache {
  [key: string]: string;
}

// Add type declaration for globalThis
declare global {
  // eslint-disable-next-line no-var
  var documentCache: GlobalWithCache;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ASSESSMENT_LLM_MODEL = 'google/gemini-2.5-flash-preview-05-20'; // Updated to newer model version

interface ProcessAssessmentPayload {
  student_id: string; // For teacher tests, this will be the teacher's user_id
  chatbot_id: string;
  room_id: string; // Will be "teacher_test_room_for_..." for teacher tests
  message_ids_to_assess: string[];
}

// Helper function to identify teacher test rooms
const isTeacherTestRoom = (roomId: string) => roomId.startsWith('teacher_test_room_for_');

// Define expected structure for LLM's JSON response (the content part)
interface LLMAssessmentOutput {
    grade: string;
    student_feedback: string;
    teacher_analysis: {
        summary: string;
        criteria_summary?: string; // New field for summarized criteria
        strengths: string[];
        areas_for_improvement: string[];
        grading_rationale: string;
    };
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `assess-${Date.now()}`;
  const requestSource = request.headers.get('x-assessment-source') || 'unknown';
  
  console.log('--------------------------------------------------');
  console.log(`[API /assessment/process] [ReqID: ${requestId}] Received assessment processing request from ${requestSource}.`);
  console.log(`[API /assessment/process] Request method: ${request.method}, Content-Type: ${request.headers.get('content-type')}`);
  const adminSupabase = createAdminClient();
  
  // Initialize global document cache if not exists
  if (!global.documentCache) {
    global.documentCache = {};
  }

  try {
    const payload: ProcessAssessmentPayload = await request.json();
    const { student_id: userId, chatbot_id, room_id, message_ids_to_assess } = payload;
    const isTestByTeacher = isTeacherTestRoom(room_id);

    console.log(`[API /assessment/process] Payload: userId=${userId}, chatbot_id=${chatbot_id}, room_id=${room_id}, isTestByTeacher=${isTestByTeacher}, messages_count=${message_ids_to_assess.length}`);

    // Log the assessment request payload for debugging
    console.log(`[API /assessment/process] [ReqID: ${requestId}] Processing assessment for student_id: ${userId}, chatbot_id: ${chatbot_id}, room_id: ${room_id}, messages: ${message_ids_to_assess.length}`);

    // 1. Fetch the Assessment Bot's configuration
    const { data: assessmentBotConfig, error: botConfigError } = await adminSupabase
      .from('chatbots')
      .select('assessment_criteria_text, enable_rag, teacher_id, name')
      .eq('chatbot_id', chatbot_id)
      .eq('bot_type', 'assessment')
      .single();

    if (botConfigError || !assessmentBotConfig) {
      console.error(`[API /assessment/process] CRITICAL: Error fetching assessment bot ${chatbot_id} config:`, botConfigError?.message);
      return NextResponse.json({ error: 'Assessment bot configuration not found or not an assessment bot.' }, { status: 404 });
    }
    if (!assessmentBotConfig.assessment_criteria_text) {
      console.warn(`[API /assessment/process] CRITICAL: Assessment bot ${chatbot_id} has no assessment criteria defined.`);
        await adminSupabase.from('chat_messages').insert({
            room_id: room_id, user_id: userId, role: 'system',
            content: "This assessment bot doesn't have its criteria defined by the teacher yet. Please set the criteria in the chatbot configuration.",
            metadata: { chatbotId: chatbot_id, isAssessmentFeedback: true, error: "Missing assessment criteria" }
        });
        return NextResponse.json({ success: true, message: "Assessment criteria missing, user notified." });
    }
    console.log(`[API /assessment/process] Fetched bot config. RAG enabled: ${assessmentBotConfig.enable_rag}`);

    // 2. Fetch the conversation segment to be assessed
    const { data: conversationMessages, error: messagesError } = await adminSupabase
      .from('chat_messages')
      .select('role, content, user_id')
      .in('message_id', message_ids_to_assess)
      .order('created_at', { ascending: true });

    if (messagesError || !conversationMessages || conversationMessages.length === 0) {
      console.error(`[API /assessment/process] CRITICAL: Error fetching conversation messages for assessment:`, messagesError?.message);
      return NextResponse.json({ error: 'Could not retrieve conversation for assessment.' }, { status: 500 });
    }
    console.log(`[API /assessment/process] Fetched ${conversationMessages.length} conversation messages.`);

    const conversationSegmentForPrompt = conversationMessages
      .map(m => `${m.user_id === userId ? (isTestByTeacher ? 'Tester (Teacher)' : 'Student') : 'Quiz Bot'}: ${m.content}`)
      .join('\n');

    // 3. Fetch the original passage/document text if this bot is RAG-enabled
    let originalPassageText = "No specific passage was used by the Quiz Bot for these questions, or it could not be retrieved for this assessment.";
    if (assessmentBotConfig.enable_rag) {
      console.log(`[API /assessment/process] Bot has RAG. Fetching primary document for passage context.`);
      
      // First check if this is a document we've processed recently and might have cached
      // Using the chatbot_id as a simple cache key
      const cacheKey = `document_text_${chatbot_id}`;
      const cachedText = global.documentCache[cacheKey];
      
      if (cachedText) {
        console.log(`[API /assessment/process] Using cached document text for chatbot ${chatbot_id} (length: ${cachedText.length})`);
        originalPassageText = cachedText;
      } else {
        // Query for document with preloaded extraction if available
        const { data: botDocument, error: docError } = await adminSupabase
          .from('documents')
          .select('file_path, file_type, extracted_text')
          .eq('chatbot_id', chatbot_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (docError || !botDocument) {
          console.warn(`[API /assessment/process] No document found for RAG-enabled assessment bot ${chatbot_id}, or error:`, docError?.message);
        } else if (botDocument.extracted_text) {
          // Use pre-extracted text if available (from vectorization process)
          originalPassageText = botDocument.extracted_text;
          // Cache the result for future use
          global.documentCache[cacheKey] = originalPassageText;
          console.log(`[API /assessment/process] Using pre-extracted text from document (length: ${originalPassageText.length}).`);
        } else {
          try {
            console.log(`[API /assessment/process] Downloading document: ${botDocument.file_path}`);
            const { data: fileData, error: downloadError } = await adminSupabase.storage.from('documents').download(botDocument.file_path);
            if (!downloadError && fileData) {
              originalPassageText = await extractTextFromFile(Buffer.from(await fileData.arrayBuffer()), botDocument.file_type as DocumentType);
              // Cache the result for future use
              global.documentCache[cacheKey] = originalPassageText;
              console.log(`[API /assessment/process] Extracted text from passage (length: ${originalPassageText.length}).`);
            } else { 
              console.warn(`[API /assessment/process] Failed to download document ${botDocument.file_path}:`, downloadError?.message); 
            }
          } catch (extractionError) { 
            console.warn(`[API /assessment/process] Error extracting text from document ${botDocument.file_path}:`, extractionError); 
          }
        }
      }
    }

    // 4. Construct the detailed assessment prompt for the LLM
    const finalAssessmentPrompt = `
You are an AI teaching assistant. Your task is to evaluate a student's (or tester's) interaction based on the teacher's criteria, the original passage (if provided), and the conversation history.

Teacher's Assessment Criteria:
--- TEACHER'S CRITERIA START ---
${assessmentBotConfig.assessment_criteria_text}
--- TEACHER'S CRITERIA END ---

Original Passage Context (if applicable, MCQs should be based on this):
--- ORIGINAL PASSAGE START ---
${originalPassageText}
--- ORIGINAL PASSAGE END ---

Note: If your chatbot is giving multiple-choice questions, instruct students to "PAUSE – Reflect, then reply with your answer (A/B/C/D)." instead of asking them to say "Continue".

Conversation History to Assess (User is '${isTestByTeacher ? 'Tester (Teacher)' : 'Student'}'):
--- CONVERSATION HISTORY START ---
${conversationSegmentForPrompt}
--- CONVERSATION HISTORY END ---

Provide your evaluation ONLY as a single, valid JSON object matching the following structure EXACTLY:
{
  "grade": "string (e.g., 'Meets Expectations', '8/10', 'B', 'Needs Improvement'. Be concise.)",
  "student_feedback": "string (2-4 sentences of constructive feedback for the student, directly addressing their performance against the criteria. Start with 'Here is some feedback on your interaction:')",
  "teacher_analysis": {
    "summary": "string (A 1-2 sentence overall summary of the student's performance for the teacher.)",
    "criteria_summary": "string (A concise 2-3 sentence summary of the key criteria that were used for assessment, not the full criteria text)",
    "strengths": [
      "string (A specific strength observed, referencing criteria/conversation. Be specific.)",
      "string (Another specific strength, if any. Up to 2-3 strengths total.)"
    ],
    "areas_for_improvement": [
      "string (A specific area for improvement, referencing criteria/conversation. Be specific.)",
      "string (Another specific area, if any. Up to 2-3 areas total.)"
    ],
    "grading_rationale": "string (A brief explanation of how the grade was derived based on the criteria and the student's performance in the conversation.)"
  }
}

Ensure all string values are properly escaped within the JSON. Do not include any text outside of this JSON object.
`;

    // 5. Call the Assessment LLM
    console.log(`[API /assessment/process] STEP 5: Calling Assessment LLM: ${ASSESSMENT_LLM_MODEL}.`);
    let llmOutput: LLMAssessmentOutput = {
        grade: "Error: AI Grade Not Generated",
        student_feedback: "An error occurred during AI assessment. The AI could not generate feedback based on your interaction. Please inform your teacher.",
        teacher_analysis: {
            summary: "AI assessment could not be completed due to an error or unexpected LLM response.",
            criteria_summary: "Unable to summarize assessment criteria due to processing error.",
            strengths: [],
            areas_for_improvement: [],
            grading_rationale: "Error during LLM processing or response parsing."
        }
    };
    let aiAssessmentDetailsRaw = JSON.stringify({ error: "LLM call not successfully completed or parsing failed." }); // Full raw response from LLM provider
    let llmCallSuccessful = false;

    try {
        const assessmentLLMResponse = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
                'X-Title': 'ClassBots AI - Assessment Processing'
            },
            body: JSON.stringify({
                model: ASSESSMENT_LLM_MODEL,
                messages: [{ role: 'user', content: finalAssessmentPrompt }],
                temperature: 0.3,
                max_tokens: 800,
                response_format: { type: "json_object" },
                stream: true // Enable streaming
            })
        });

        // Handle streaming response similar to chat API
        if (!assessmentLLMResponse.ok || !assessmentLLMResponse.body) {
            console.error(`[API /assessment/process] LLM CALL FAILED: Status ${assessmentLLMResponse.status}`);
            aiAssessmentDetailsRaw = JSON.stringify({ error: `LLM Call Failed: Status ${assessmentLLMResponse.status}` });
        } else {
            // Process the stream and collect the full response
            let fullResponseText = '';
            const reader = assessmentLLMResponse.body.getReader();
            const decoder = new TextDecoder();
            
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(l => l.trim().startsWith('data:'));
                    
                    for (const line of lines) {
                        const dataContent = line.substring(6).trim();
                        if (dataContent === '[DONE]') continue;
                        
                        try {
                            const parsed = JSON.parse(dataContent);
                            const piece = parsed.choices?.[0]?.delta?.content;
                            if (typeof piece === 'string') {
                                fullResponseText += piece;
                            }
                        } catch (e) {
                            console.warn('[API /assessment/process] Stream parse error:', e, "Data:", dataContent);
                        }
                    }
                }
                
                // Create a properly formatted OpenRouter response structure
                const formattedResponse = {
                    choices: [{
                        message: {
                            content: fullResponseText
                        }
                    }]
                };
                
                aiAssessmentDetailsRaw = JSON.stringify(formattedResponse);
                console.log(`[API /assessment/process] Streaming completed, collected ${fullResponseText.length} characters`);
                
            } catch (streamError) {
                console.error('[API /assessment/process] Stream error:', streamError);
                aiAssessmentDetailsRaw = JSON.stringify({ error: `Stream Error: ${streamError instanceof Error ? streamError.message : String(streamError)}` });
            }
        }

        // Now parse the collected JSON response
        try {
            // Parse the collected full response text
            const formattedResponse = JSON.parse(aiAssessmentDetailsRaw);
            const contentString = formattedResponse.choices?.[0]?.message?.content;
            
            if (typeof contentString === 'string') {
                console.log("[API /assessment/process] Extracted content string for JSON parse (first 500 chars):", 
                  contentString.substring(0, 500) + "...");
                
                let jsonStringToParse = contentString.trim();
                
                // Handle if model wraps in markdown code block
                const markdownJsonMatch = jsonStringToParse.match(/```json\s*([\s\S]*?)\s*```/);
                if (markdownJsonMatch && markdownJsonMatch[1]) {
                    jsonStringToParse = markdownJsonMatch[1].trim();
                    console.log("[API /assessment/process] Extracted JSON from markdown block.");
                }
                
                const parsedAssessment = JSON.parse(jsonStringToParse);
                
                // Validate and use the parsed JSON
                if (
                    parsedAssessment &&
                    typeof parsedAssessment.grade === 'string' &&
                    typeof parsedAssessment.student_feedback === 'string' &&
                    typeof parsedAssessment.teacher_analysis === 'object' &&
                    parsedAssessment.teacher_analysis !== null
                ) {
                    llmOutput = {
                        grade: parsedAssessment.grade,
                        student_feedback: parsedAssessment.student_feedback,
                        teacher_analysis: {
                            summary: parsedAssessment.teacher_analysis.summary || "No summary provided.",
                            criteria_summary: parsedAssessment.teacher_analysis.criteria_summary || "Assessment based on teacher's provided criteria.",
                            strengths: Array.isArray(parsedAssessment.teacher_analysis.strengths) 
                                ? parsedAssessment.teacher_analysis.strengths 
                                : [],
                            areas_for_improvement: Array.isArray(parsedAssessment.teacher_analysis.areas_for_improvement) 
                                ? parsedAssessment.teacher_analysis.areas_for_improvement 
                                : [],
                            grading_rationale: parsedAssessment.teacher_analysis.grading_rationale || "No rationale provided."
                        }
                    };
                    
                    llmCallSuccessful = true;
                    console.log(`[API /assessment/process] Successfully parsed assessment JSON. Grade: ${llmOutput.grade}`);
                } else {
                    console.warn("[API /assessment/process] Parsed JSON missing required fields:", parsedAssessment);
                }
            } else {
                console.error("[API /assessment/process] Content string not found in response");
            }
        } catch (parseError) {
            console.error(`[API /assessment/process] Error parsing JSON response:`, parseError);
        }
    } catch (llmCallException) {
        console.error(`[API /assessment/process] EXCEPTION during Assessment LLM call:`, llmCallException);
        aiAssessmentDetailsRaw = JSON.stringify({ error: `LLM Call Exception: ${llmCallException instanceof Error ? llmCallException.message : String(llmCallException)}` });
    }
    
    let savedAssessmentId: string | null = null;
    const assessmentStatusToSave: AssessmentStatusEnum = llmCallSuccessful ? 'ai_completed' : 'ai_processing';

    if (!isTestByTeacher) {
      console.log(`[API /assessment/process] STEP 6: Attempting to save student assessment. Student ID: ${userId}, LLM Call Successful: ${llmCallSuccessful}, Status to Save: ${assessmentStatusToSave}`);
      const insertPayload = {
        student_id: userId,
        chatbot_id: chatbot_id,
        room_id: room_id,
        assessed_message_ids: message_ids_to_assess,
        teacher_id: assessmentBotConfig.teacher_id,
        teacher_assessment_criteria_snapshot: assessmentBotConfig.assessment_criteria_text,
        ai_feedback_student: llmOutput.student_feedback,
        ai_assessment_details_raw: aiAssessmentDetailsRaw,
        ai_grade_raw: llmOutput.grade,
        ai_assessment_details_teacher: llmOutput.teacher_analysis,
        status: assessmentStatusToSave,
      };
      // console.log("[API /assessment/process] Payload for student_assessments insert:", JSON.stringify(insertPayload, null, 2));

      // Add additional debugging information
      console.log(`[API /assessment/process] [ReqID: ${requestId}] Ready to save assessment to database with status: ${assessmentStatusToSave}`);
      console.log(`[API /assessment/process] [ReqID: ${requestId}] Teacher ID from bot config: ${assessmentBotConfig.teacher_id}`);

      try {
        // Insert with detailed error logging
        const { data: savedAssessmentData, error: assessmentSaveError } = await adminSupabase
          .from('student_assessments')
          .insert(insertPayload)
          .select('assessment_id').single();

        if (assessmentSaveError) {
          console.error(`[API /assessment/process] [ReqID: ${requestId}] CRITICAL: Error saving student assessment to DB:`, 
            assessmentSaveError.message, 
            assessmentSaveError.details, 
            assessmentSaveError.hint,
            assessmentSaveError.code
          );
          
          // Try an alternative approach if there was an error
          console.log(`[API /assessment/process] [ReqID: ${requestId}] Attempting alternative database operation for assessment save...`);
          
          // Try just inserting without returning data (simpler operation)
          const fallbackResult = await adminSupabase
            .from('student_assessments')
            .insert(insertPayload);
            
          if (fallbackResult.error) {
            console.error(`[API /assessment/process] [ReqID: ${requestId}] Alternative insert also failed:`, 
              fallbackResult.error.message,
              fallbackResult.error.code
            );
          } else {
            console.log(`[API /assessment/process] [ReqID: ${requestId}] Alternative insert succeeded, but no ID returned.`);
          }
        } else if (savedAssessmentData) {
          savedAssessmentId = savedAssessmentData.assessment_id;
          console.log(`[API /assessment/process] [ReqID: ${requestId}] SUCCESSFULLY saved student assessment ${savedAssessmentId} with status: ${assessmentStatusToSave}.`);
          console.log(`[API /assessment/process] [ReqID: ${requestId}] Assessment details: Student ID: ${userId}, Bot: ${assessmentBotConfig.name || chatbot_id}, Room: ${room_id}`);
        } else {
          console.warn(`[API /assessment/process] [ReqID: ${requestId}] Student assessment insert COMPLETED but no data/ID returned, and no explicit error.`);
        }
      } catch (dbException) {
        console.error(`[API /assessment/process] [ReqID: ${requestId}] EXCEPTION during assessment save:`, dbException);
      }
    } else {
        console.log(`[API /assessment/process] STEP 6: Teacher test assessment. LLM Call Successful: ${llmCallSuccessful}. Skipping save to student_assessments table.`);
    }

    console.log(`[API /assessment/process] STEP 7: Inserting feedback message into chat_messages for user ${userId}. Feedback snippet: "${String(llmOutput.student_feedback).substring(0, 100)}..."`);
    
    // Insert feedback message directly - more efficient approach
    const { data: messageData, error: messageError } = await adminSupabase
        .from('chat_messages')
        .insert({
            room_id: room_id, 
            user_id: userId,
            role: 'assistant',
            content: llmOutput.student_feedback,
            metadata: {
                chatbotId: chatbot_id, 
                isAssessmentFeedback: true,
                assessmentId: savedAssessmentId,
                processedWithStreaming: true // Flag to indicate this was processed with streaming
            }
        })
        .select('message_id')
        .single();
    
    if (messageError) {
        console.error(`[API /assessment/process] Error inserting feedback message for user ${userId}:`, 
            messageError.message, messageError.details, messageError.hint);
    } else if (messageData) {
        console.log(`[API /assessment/process] Feedback message ${messageData.message_id} successfully inserted for user ${userId}.`);
    } else {
        console.warn(`[API /assessment/process] Feedback message insert completed but no message ID returned.`);
    }

    console.log('[API /assessment/process] Processing complete. Returning response.');
    console.log('--------------------------------------------------');
    return NextResponse.json({ success: true, message: 'Assessment processed.', assessmentId: savedAssessmentId });

  } catch (error) {
    console.error('[API /assessment/process] CRITICAL UNHANDLED error:', error);
    console.log('--------------------------------------------------');
    return NextResponse.json({ error: 'Failed to process assessment due to a critical internal server error.' }, { status: 500 });
  }
}