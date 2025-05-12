// src/app/api/chat/[roomId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/openai/embeddings';
import { queryVectors } from '@/lib/pinecone/utils';

// ONLY import what is DIRECTLY CALLED by THIS file.
// checkMessageSafety is the function we call from monitoring.ts.
// initialConcernCheck and verifyConcern are used INTERNALLY by checkMessageSafety.
import { checkMessageSafety } from '@/lib/safety/monitoring';

// Import specific types needed in THIS file.
import type { ChatMessage, Room } from '@/types/database.types';
// Database and SupabaseClient types are generally not needed if the supabase client instance is not explicitly typed here.

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// CONCERN_THRESHOLD is defined and used within 'src/lib/safety/monitoring.ts', so it's not needed here.

// These constants WILL BE USED when we re-integrate assessment logic.
// For now, to avoid "unused var" errors while we stabilize, we can comment them out
// or keep them if we are immediately moving to re-add assessment logic after this fix.
// Let's keep them for now, anticipating the next step.
const ASSESSMENT_TRIGGER_COMMAND = "/assess";
const ASSESSMENT_CONTEXT_MESSAGE_COUNT = 5;

const isTeacherTestRoom = (roomId: string) => roomId.startsWith('teacher_test_room_for_');

// --- GET Function ---
export async function GET(request: NextRequest) {
    try {
        const pathname = request.nextUrl.pathname;
        const segments = pathname.split('/');
        const roomId = segments.length > 0 ? segments[segments.length - 1] : null;
        const { searchParams } = new URL(request.url);
        const chatbotIdFilter = searchParams.get('chatbotId');

        if (!roomId) return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });

        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        if (!isTeacherTestRoom(roomId)) {
            const { data: roomResult, error: roomError } = await supabase
                .from('rooms')
                .select('room_id')
                .eq('room_id', roomId)
                .maybeSingle();
            if (roomError || !roomResult) {
                console.warn(`[API Chat GET] Room ${roomId} not found or access denied for user ${user.id}.`);
                return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 });
            }
        }

        let query = supabase.from('chat_messages').select('*').eq('room_id', roomId).eq('user_id', user.id);
        if (chatbotIdFilter) query = query.filter('metadata->>chatbotId', 'eq', chatbotIdFilter);
        
        const { data: messages, error: messagesError } = await query.order('created_at', { ascending: true });

        if (messagesError) { 
            console.error('[API Chat GET] Error fetching messages:', messagesError); 
            return NextResponse.json({ error: messagesError.message }, { status: 500 }); 
        }
        return NextResponse.json(messages || []);
    } catch (error) { 
        console.error('[API Chat GET] General error:', error); 
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 }); 
    }
}

// --- POST Handler ---
export async function POST(request: NextRequest) {
  let userMessageId: string | null = null;
  const supabase = await createServerSupabaseClient(); // User-context client

  try {
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/');
    const roomId = segments.length > 0 ? segments[segments.length - 1] : null;
    if (!roomId) return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }

    const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
    if (profileError || !userProfile) { return NextResponse.json({ error: 'User profile not found' }, { status: 403 }); }
    
    const isStudent = userProfile.role === 'student';
    const isTeacher = userProfile.role === 'teacher';

    const { content, chatbot_id, model: requestedModel } = await request.json();
    const trimmedContent = content?.trim();
    if (!trimmedContent || typeof trimmedContent !== 'string') return NextResponse.json({ error: 'Invalid message content' }, { status: 400 });
    if (!chatbot_id) return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });

    // Fetch full chatbot config, including bot_type for assessment logic
    const { data: chatbotConfig, error: chatbotFetchError } = await supabase
        .from('chatbots')
        .select('system_prompt, model, temperature, max_tokens, enable_rag, bot_type, assessment_criteria_text')
        .eq('chatbot_id', chatbot_id)
        .single();

    if (chatbotFetchError || !chatbotConfig) {
        console.warn(`[API Chat POST] Error fetching chatbot ${chatbot_id} config:`, chatbotFetchError?.message);
        return NextResponse.json({ error: 'Chatbot configuration not found.' }, { status: 404 });
    }

    let roomForSafetyCheck: Room | null = null;
    if (!isTeacherTestRoom(roomId)) {
        const { data: roomData, error: roomFetchError } = await supabase
            .from('rooms')
            .select('room_id, teacher_id, room_name') // Ensure all fields needed by checkMessageSafety are here
            .eq('room_id', roomId)
            .single();
        if (roomFetchError || !roomData) { 
            console.error("[API Chat POST] Room fetch error for non-test room:", roomFetchError); 
            return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 }); 
        }
        roomForSafetyCheck = roomData as Room;
    } else if (isTeacherTestRoom(roomId) && !isTeacher) {
        return NextResponse.json({ error: 'Not authorized for this test room' }, { status: 403 });
    }

    const userMessageToStore: Omit<ChatMessage, 'message_id' | 'created_at' | 'updated_at'> & { metadata: { chatbotId: string } } = {
      room_id: roomId, user_id: user.id, role: 'user' as const, content: trimmedContent, metadata: { chatbotId: chatbot_id }
    };
    const { data: savedUserMessageData, error: userMessageError } = await supabase.from('chat_messages').insert(userMessageToStore).select('message_id, created_at').single();
    if (userMessageError || !savedUserMessageData) { console.error('Error storing user message:', userMessageError); return NextResponse.json({ error: 'Failed to store message' }, { status: 500 }); }
    userMessageId = savedUserMessageData.message_id;
    const userMessageCreatedAt = savedUserMessageData.created_at; // Will be used when re-adding assessment trigger
    
    // Safety Check Trigger
    if (isStudent && userMessageId && roomForSafetyCheck && !isTeacherTestRoom(roomId)) {
        console.log(`[API Chat POST] Triggering imported checkMessageSafety for student ${user.id}, message ${userMessageId}`);
        // Call the imported function. The 'supabase' here is the user-context client.
        checkMessageSafety(supabase, trimmedContent, userMessageId, user.id, roomForSafetyCheck)
            .catch(safetyError => console.error(`[Safety Check Background Error] for message ${userMessageId}:`, safetyError));
    } else {
        console.log(`[API Chat POST] Skipping safety check. isStudent: ${isStudent}, isTeacherTestRoom: ${isTeacherTestRoom(roomId)}`);
    }

    // --- ASSESSMENT TRIGGER LOGIC ---
    // This is where the assessment trigger logic, which uses ASSESSMENT_TRIGGER_COMMAND and ASSESSMENT_CONTEXT_MESSAGE_COUNT,
    // and userMessageCreatedAt will be re-inserted.
    if (isStudent && chatbotConfig.bot_type === 'assessment' && trimmedContent.toLowerCase() === ASSESSMENT_TRIGGER_COMMAND) {
        console.log(`[API Chat POST] Assessment trigger detected for student ${user.id}, bot ${chatbot_id}, room ${roomId}.`);
        
        const { data: contextMessagesForAssessment, error: contextMsgsError } = await supabase
            .from('chat_messages')
            .select('message_id')
            .eq('room_id', roomId)
            .eq('user_id', user.id) 
            .eq('metadata->>chatbotId', chatbot_id)
            .lt('created_at', userMessageCreatedAt) // Use the timestamp of the "/assess" command
            .order('created_at', { ascending: false })
            .limit(ASSESSMENT_CONTEXT_MESSAGE_COUNT * 2 + 5); // Fetch enough to get varied turns

        if (contextMsgsError) {
            console.error(`[API Chat POST] Error fetching message IDs for assessment context: ${contextMsgsError.message}`);
            // Not returning error, assessment might proceed with less context
        }
        
        const messageIdsToAssess = (contextMessagesForAssessment || []).map(m => m.message_id).reverse();
        
        const assessmentPayload = {
            student_id: user.id,
            chatbot_id: chatbot_id,
            room_id: roomId,
            message_ids_to_assess: messageIdsToAssess,
        };

        console.log(`[API Chat POST] Asynchronously calling /api/assessment/process.`);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
        fetch(`${baseUrl}/api/assessment/process`, { // This is the call to the new dedicated assessment API
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assessmentPayload),
        }).catch(fetchError => {
            console.error(`[API Chat POST] Error calling /api/assessment/process internally:`, fetchError);
        });

        return NextResponse.json({
            type: "assessment_pending",
            message: "Your responses are being submitted for assessment. Feedback will appear here shortly."
        });
    }
    // --- END OF ASSESSMENT TRIGGER LOGIC ---


    // Regular Chat Logic (RAG, LLM Call, Streaming)
    // This part will only execute if it's NOT an assessment trigger.
    const { data: contextMessagesData, error: contextError } = await supabase.from('chat_messages')
      .select('role, content').eq('room_id', roomId).eq('user_id', user.id)
      .filter('metadata->>chatbotId', 'eq', chatbot_id).neq('message_id', userMessageId)
      .order('created_at', { ascending: false }).limit(5);
    if (contextError) console.warn("Error fetching context messages:", contextError.message);
    const contextMessages = (contextMessagesData || []).map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content || '' }));

    const { 
        system_prompt: systemPromptToUse = "You are a helpful AI assistant.",
        model: modelToUseFromConfig = 'x-ai/grok-3-mini-beta', 
        temperature: temperatureToUse = 0.7, 
        max_tokens: maxTokensToUse = 1000, 
        enable_rag: enableRagFromConfig = false 
    } = chatbotConfig;
    
    const finalModelToUse = requestedModel || modelToUseFromConfig;

    let ragContextText = '';
    if (enableRagFromConfig && chatbotConfig.bot_type === 'learning') { 
        try {
            const queryEmbedding = await generateEmbedding(trimmedContent);
            const searchResults = await queryVectors(queryEmbedding, chatbot_id, 3);
            if (searchResults && searchResults.length > 0) {
                ragContextText = "\n\nRelevant information from knowledge base:\n";
                searchResults.forEach((result, index) => {
                    if (result.metadata?.text) {
                        const fileName = typeof result.metadata.fileName === 'string' ? result.metadata.fileName : 'document';
                        const chunkText = String(result.metadata.text).substring(0, 500);
                        ragContextText += `\n[${index + 1}] From "${fileName}":\n${chunkText}\n`;
                    }
                });
            }
        } catch (ragError) { console.warn(`[RAG] Error:`, ragError); }
    }

    const enhancedSystemPrompt = `${systemPromptToUse}${ragContextText ? `\n\n${ragContextText}\n\nRemember to cite sources by their number (e.g., [1], [2]) if you use their information.` : ''}`;
    const messagesForAPI = [ { role: 'system', content: enhancedSystemPrompt }, ...contextMessages.reverse(), { role: 'user', content: trimmedContent } ];

    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
        method: 'POST', headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.OPENROUTER_SITE_URL || 'http://localhost:3000', 'X-Title': 'ClassBots AI', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: finalModelToUse, messages: messagesForAPI, temperature: temperatureToUse, max_tokens: maxTokensToUse, stream: true }),
    });

    if (!openRouterResponse.ok || !openRouterResponse.body) {
        const errorBody = await openRouterResponse.text(); console.error(`OpenRouter Error: Status ${openRouterResponse.status}`, errorBody);
        let errorMessage = `Failed to get AI response (status: ${openRouterResponse.status})`;
        try { const errorJson = JSON.parse(errorBody); errorMessage = errorJson.error?.message || errorMessage; } catch {}
        throw new Error(errorMessage);
    }

    // Streaming logic...
    let fullResponseContent = ''; const encoder = new TextEncoder(); let assistantMessageId: string | null = null;
    const stream = new ReadableStream({
        async start(controller) {
            const reader = openRouterResponse.body!.getReader(); const decoder = new TextDecoder();
            try {
                const { data: initData, error: initError } = await supabase.from('chat_messages')
                    .insert({ room_id: roomId, user_id: user.id, role: 'assistant', content: '', metadata: { chatbotId: chatbot_id } })
                    .select('message_id').single();
                if (initError || !initData) console.error('Error creating placeholder assistant message:', initError);
                else assistantMessageId = initData.message_id;

                while (true) {
                    const { done, value } = await reader.read(); if (done) break;
                    const chunk = decoder.decode(value, { stream: true }); const lines = chunk.split('\n').filter(l => l.trim().startsWith('data:'));
                    for (const line of lines) {
                        const dataContent = line.substring(6).trim(); if (dataContent === '[DONE]') continue;
                        try { const parsed = JSON.parse(dataContent); const piece = parsed.choices?.[0]?.delta?.content; if (typeof piece === 'string') { fullResponseContent += piece; controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: piece })}\n\n`)); } }
                        catch (e) { console.warn('Stream parse error:', e); }
                    }
                }
            } catch (streamError) { console.error('Stream error:', streamError); controller.error(streamError); }
            finally {
                const finalContent = fullResponseContent.trim();
                if (assistantMessageId && finalContent) {
                    const { error: updateError } = await supabase.from('chat_messages').update({ content: finalContent, updated_at: new Date().toISOString() }).eq('message_id', assistantMessageId);
                    if (updateError) console.error(`Error updating assistant message ${assistantMessageId}:`, updateError); else console.log(`Assistant message ${assistantMessageId} updated.`);
                } else if (!assistantMessageId && finalContent) { 
                    console.warn("Fallback: Assistant message placeholder not created, inserting full message."); 
                    await supabase.from('chat_messages').insert({ room_id: roomId, user_id: user.id, role: 'assistant', content: finalContent, metadata: { chatbotId: chatbot_id } }); 
                }
                controller.close(); console.log("Server stream closed.");
            }
        }
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Content-Type-Options': 'nosniff' } });

  } catch (error) { 
      console.error('Error in POST /api/chat/[roomId]:', error); 
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process message' }, { status: 500 }); 
  }
}

// NO LOCAL DEFINITION OF checkMessageSafety, initialConcernCheck, or verifyConcern HERE.
// They are handled by the import from '@/lib/safety/monitoring.ts'.