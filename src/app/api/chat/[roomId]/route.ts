// src/app/api/chat/[roomId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/openai/embeddings';
import { queryVectors } from '@/lib/pinecone/utils';
import { initialConcernCheck, verifyConcern } from '@/lib/safety/monitoring';
import { sendTeacherAlert } from '@/lib/safety/alerts';
import type { Database, ChatMessage, Room } from '@/types/database.types'; // Removed unused Profile
import { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CONCERN_THRESHOLD = 3;

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

        // If it's not a teacher test room, validate room existence and access
        if (!isTeacherTestRoom(roomId)) {
            const { data: room, error: roomError } = await supabase
                .from('rooms') // Assumes 'rooms' table exists for non-test rooms
                .select('room_id')
                .eq('room_id', roomId)
                .maybeSingle(); // Check if room exists
            // Further access check for students/teachers for this room would go here
            if (roomError || !room) {
                console.warn(`[API Chat GET] Room ${roomId} not found or access denied for user ${user.id}.`);
                return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 });
            }
        }
        // For teacher test rooms, we don't need to check 'rooms' table, teacher owns their test chat

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
  try {
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/');
    const roomId = segments.length > 0 ? segments[segments.length - 1] : null;
    if (!roomId) return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
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
    // ... (content and chatbot_id validation) ...
    const trimmedContent = content?.trim();
    if (!trimmedContent || typeof trimmedContent !== 'string') return NextResponse.json({ error: 'Invalid message content' }, { status: 400 });
    if (!chatbot_id) return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });


    let roomForSafetyCheck: Room | null = null; // For safety check context

    if (!isTeacherTestRoom(roomId)) {
        // For actual rooms, fetch room data
        const { data: roomData, error: roomFetchError } = await supabase
            .from('rooms') // Assumes 'rooms' table exists for non-test rooms
            .select('room_id, teacher_id, room_name')
            .eq('room_id', roomId)
            .single();
        if (roomFetchError || !roomData) { 
            console.error("[API Chat POST] Room fetch error for non-test room:", roomFetchError); 
            return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 }); 
        }
        roomForSafetyCheck = roomData as Room;
        // TODO: Add access validation here for students (member of room) or teachers (owner of room)
    } else if (isTeacherTestRoom(roomId) && !isTeacher) {
        // If it's a test room, only the teacher should be posting
        return NextResponse.json({ error: 'Not authorized for this test room' }, { status: 403 });
    }


    // Store User Message (same as before)
    const userMessageToStore: Omit<ChatMessage, 'message_id' | 'created_at' | 'updated_at'> & { metadata: { chatbotId: string } } = {
      room_id: roomId, user_id: user.id, role: 'user' as const, content: trimmedContent, metadata: { chatbotId: chatbot_id }
    };
    const { data: savedUserMessageData, error: userMessageError } = await supabase.from('chat_messages').insert(userMessageToStore).select('message_id').single();
    if (userMessageError || !savedUserMessageData) { console.error('Error storing user message:', userMessageError); return NextResponse.json({ error: 'Failed to store message' }, { status: 500 }); }
    userMessageId = savedUserMessageData.message_id;
    
    // Safety Check Trigger (only for students in actual rooms)
    if (isStudent && userMessageId && roomForSafetyCheck && !isTeacherTestRoom(roomId)) {
        console.log(`[API Chat POST] Triggering checkMessageSafety for student ${user.id}, message ${userMessageId}`);
        checkMessageSafety(supabase, trimmedContent, userMessageId, user.id, roomForSafetyCheck)
            .catch(safetyError => console.error(`[Safety Check Background Error] for message ${userMessageId}:`, safetyError));
    } else {
        console.log(`[API Chat POST] Skipping safety check. isStudent: ${isStudent}, isTeacherTestRoom: ${isTeacherTestRoom(roomId)}`);
    }

    // ... (Fetch Context Messages - this should be fine as it's scoped to user_id and room_id) ...
    // ... (Prepare and Call LLM API - this logic is fine) ...
    // ... (RAG Logic - this is fine) ...
    // ... (Stream Response Back - this logic is fine) ...

    // The rest of the POST handler (fetching context, calling LLM, streaming) can largely remain the same.
    // The crucial part was handling the room data fetch conditionally.

    // --- Placeholder for the rest of the POST logic ---
    // Fetch Context Messages
    const { data: contextMessagesData, error: contextError } = await supabase.from('chat_messages')
      .select('role, content').eq('room_id', roomId).eq('user_id', user.id)
      .filter('metadata->>chatbotId', 'eq', chatbot_id).neq('message_id', userMessageId)
      .order('created_at', { ascending: false }).limit(5);
    if (contextError) console.warn("Error fetching context messages:", contextError.message);
    const contextMessages = (contextMessagesData || []).map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content || '' }));

    let { system_prompt: systemPrompt = "You are a helpful AI assistant.", model: modelToUse = 'x-ai/grok-3-mini-beta', temperature = 0.7, max_tokens: maxTokens = 1000, enable_rag: enableRag = false } = {};
    const { data: chatbotData, error: chatbotFetchError } = await supabase.from('chatbots')
      .select('system_prompt, model, temperature, max_tokens, enable_rag').eq('chatbot_id', chatbot_id).single();
    if (chatbotFetchError) console.warn(`Error fetching chatbot ${chatbot_id} config:`, chatbotFetchError.message);
    else if (chatbotData) ({ system_prompt: systemPrompt = systemPrompt, model: modelToUse = requestedModel || chatbotData.model || modelToUse, temperature = chatbotData.temperature ?? temperature, max_tokens: maxTokens = chatbotData.max_tokens ?? maxTokens, enable_rag: enableRag = chatbotData.enable_rag ?? false } = chatbotData);

    let ragContextText = '';
    if (enableRag) { 
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

    const enhancedSystemPrompt = `${systemPrompt}${ragContextText ? `\n\n${ragContextText}\n\nRemember to cite sources by their number (e.g., [1], [2]) if you use their information.` : ''}`;
    const messagesForAPI = [ { role: 'system', content: enhancedSystemPrompt }, ...contextMessages.reverse(), { role: 'user', content: trimmedContent } ];

    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
        method: 'POST', headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.OPENROUTER_SITE_URL || 'http://localhost:3000', 'X-Title': 'ClassBots AI', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelToUse, messages: messagesForAPI, temperature, max_tokens: maxTokens, stream: true }),
    });

    if (!openRouterResponse.ok || !openRouterResponse.body) {
        const errorBody = await openRouterResponse.text(); console.error(`OpenRouter Error: Status ${openRouterResponse.status}`, errorBody);
        let errorMessage = `Failed to get AI response (status: ${openRouterResponse.status})`;
        try { const errorJson = JSON.parse(errorBody); errorMessage = errorJson.error?.message || errorMessage; } catch {}
        throw new Error(errorMessage);
    }

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
    // --- End of placeholder for POST logic ---

  } catch (error) { 
      console.error('Error in POST /api/chat/[roomId]:', error); 
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process message' }, { status: 500 }); 
  }
}

// checkMessageSafety function (keep as is, but ensure 'room' param is handled if it can be null)
async function checkMessageSafety(
    supabase: SupabaseClient<Database>,
    messageContent: string,
    messageId: string,
    studentId: string,
    room: Room // This is now 'Room | null' conceptually from the caller
): Promise<void> {
    // ... (Safety check logic - ensure it handles cases where room might not be a "real" room if called for test chats,
    // though currently we only call it for students in actual rooms)
    // For now, the existing logic should be fine as it's only called if roomForSafetyCheck is not null.
    console.log(`[Safety Check] START - Checking message ID: ${messageId} for student ${studentId} in room ${room.room_id}`);
    console.log(`[Safety Check] Message Content Being Checked: "${messageContent}"`);
    try {
        const adminClient = createAdminClient();
        const { data: flaggedMessageData, error: fetchMsgError } = await supabase
            .from('chat_messages').select('metadata, created_at').eq('message_id', messageId).single();

        if (fetchMsgError || !flaggedMessageData) {
             console.error(`[Safety Check] Failed to fetch flagged message ${messageId} for context query:`, fetchMsgError);
             return;
        }
        const flaggedMessageChatbotId = flaggedMessageData.metadata?.chatbotId || null;
        const flaggedMessageCreatedAt = flaggedMessageData.created_at || new Date().toISOString();
        const { hasConcern, concernType } = initialConcernCheck(messageContent);
        console.log(`[Safety Check] Initial Check Result: hasConcern=${hasConcern}, concernType=${concernType}`);

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

            if (isRealConcern && concernLevel >= CONCERN_THRESHOLD) {
                console.log(`[Safety Check] THRESHOLD MET! Level ${concernLevel} >= ${CONCERN_THRESHOLD}. Flagging...`);
                const { data: teacherProfileData } = await supabase
                    .from('profiles').select('email').eq('user_id', room.teacher_id).single();
                const { data: studentProfileData } = await supabase
                    .from('profiles').select('full_name').eq('user_id', studentId).single();
                const teacherEmail = teacherProfileData?.email;
                const studentName = studentProfileData?.full_name || `Student (${studentId.substring(0,6)}...)`;

                console.log(`[Safety Check] Inserting flag into DB for message ${messageId} using ADMIN client...`);
                const { data: insertedFlag, error: flagError } = await adminClient
                    .from('flagged_messages').insert({
                        message_id: messageId, student_id: studentId, teacher_id: room.teacher_id, 
                        room_id: room.room_id, concern_type: concernType, concern_level: concernLevel, 
                        analysis_explanation: analysisExplanation, status: 'pending',
                    }).select('flag_id').single();

                if (flagError || !insertedFlag) {
                    console.error(`[Safety Check] FAILED to insert flag for message ${messageId} with ADMIN client:`, flagError);
                } else {
                    const newFlagId = insertedFlag.flag_id;
                    console.log(`[Safety Check] Flag ${newFlagId} inserted successfully for message ${messageId}.`);
                    if (teacherEmail) {
                        console.log(`[Safety Check] Attempting to send alert to ${teacherEmail} for flag ${newFlagId}...`);
                        const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/teacher-dashboard/concerns/${newFlagId}`;
                        const alertSent = await sendTeacherAlert( teacherEmail, studentName, room.room_name, concernType, concernLevel, messageContent, viewUrl );
                         console.log(`[Safety Check] Alert sent status for flag ${newFlagId}: ${alertSent}`);
                    } else { console.warn(`[Safety Check] Teacher email not found. Cannot send alert for flag ${newFlagId}.`); }
                }
            } else { console.log(`[Safety Check] Concern level ${concernLevel} did NOT meet threshold ${CONCERN_THRESHOLD} or was not deemed real.`); }
        } else { console.log(`[Safety Check] No initial concern detected.`); }
    } catch (error) { console.error(`[Safety Check] UNCAUGHT ERROR in checkMessageSafety for message ID ${messageId}:`, error); }
     console.log(`[Safety Check] END - Checked message ID: ${messageId}`);
}