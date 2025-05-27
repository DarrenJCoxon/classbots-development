// src/app/api/student/room-chatbot-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get parameters from query string
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const chatbotId = searchParams.get('chatbotId');
    const userId = searchParams.get('userId');
    const instanceId = searchParams.get('instanceId');

    // Validate required parameters
    if (!roomId || !chatbotId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: roomId and chatbotId are required' 
      }, { status: 400 });
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient();

    // Verify user has access to the room if userId is provided
    if (userId) {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('room_memberships')
        .select('room_id')
        .eq('room_id', roomId)
        .eq('student_id', userId)
        .maybeSingle();

      if (membershipError) {
        console.error('[API GET /room-chatbot-data] Error checking membership:', membershipError);
        // Continue anyway, we'll create membership if needed
      }

      if (!membership) {
        console.log('[API GET /room-chatbot-data] User not in room, adding membership');
        // Add user to room
        const { error: insertError } = await supabaseAdmin
          .from('room_memberships')
          .insert({
            room_id: roomId,
            student_id: userId
          });

        if (insertError) {
          console.error('[API GET /room-chatbot-data] Error adding user to room:', insertError);
          // Continue anyway, try to get the data
        }
      }
    }

    // Fetch all data in parallel for better performance
    const [roomResult, chatbotResult, roomChatbotResult, readingDocResult, instanceResult] = await Promise.allSettled([
      // Get room data
      supabaseAdmin
        .from('rooms')
        .select('*')
        .eq('room_id', roomId)
        .single(),
      
      // Get chatbot data with all fields
      supabaseAdmin
        .from('chatbots')
        .select(`
          chatbot_id, 
          name, 
          description, 
          system_prompt, 
          model, 
          max_tokens, 
          temperature, 
          enable_rag,
          rag_enabled, 
          bot_type, 
          assessment_criteria_text,
          welcome_message
        `)
        .eq('chatbot_id', chatbotId)
        .single(),
      
      // Verify chatbot-room association
      supabaseAdmin
        .from('room_chatbots')
        .select('chatbot_id')
        .eq('room_id', roomId)
        .eq('chatbot_id', chatbotId)
        .single(),
      
      // Get reading document if applicable
      supabaseAdmin
        .from('reading_documents')
        .select('file_url, file_name')
        .eq('chatbot_id', chatbotId)
        .maybeSingle(),
      
      // Get or create instance if userId provided
      userId && !instanceId ? 
        supabaseAdmin
          .from('student_chatbot_instances')
          .select('*')
          .eq('student_id', userId)
          .eq('chatbot_id', chatbotId)
          .eq('room_id', roomId)
          .maybeSingle()
        : instanceId ?
          supabaseAdmin
            .from('student_chatbot_instances')
            .select('*')
            .eq('instance_id', instanceId)
            .single()
          : Promise.resolve({ status: 'fulfilled', value: { data: null } })
    ]);

    // Process results
    if (roomResult.status === 'rejected' || !roomResult.value.data) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (chatbotResult.status === 'rejected' || !chatbotResult.value.data) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    if (roomChatbotResult.status === 'rejected' || !roomChatbotResult.value.data) {
      return NextResponse.json({ error: 'Chatbot is not associated with this room' }, { status: 404 });
    }

    const room = roomResult.value.data;
    const chatbot = chatbotResult.value.data;
    const readingDocument = readingDocResult.status === 'fulfilled' ? readingDocResult.value.data : null;
    let existingInstance = instanceResult.status === 'fulfilled' && 'data' in instanceResult.value ? instanceResult.value.data : null;

    // Create instance if needed
    if (userId && !existingInstance && !instanceId) {
      const { data: newInstance } = await supabaseAdmin
        .from('student_chatbot_instances')
        .insert({
          student_id: userId,
          chatbot_id: chatbotId,
          room_id: roomId,
          is_active: true
        })
        .select()
        .single();
      
      existingInstance = newInstance;
    }

    // Build response with caching
    const response = NextResponse.json({
      room: {
        room_id: room.room_id,
        room_name: room.room_name,
        room_code: room.room_code,
        teacher_id: room.teacher_id,
        school_id: room.school_id,
        is_active: room.is_active,
        created_at: room.created_at,
        updated_at: room.updated_at,
        room_chatbots: [{
          chatbots: chatbot
        }]
      },
      chatbot: chatbot,
      instanceId: existingInstance?.instance_id || instanceId,
      readingDocument: chatbot.bot_type === 'reading_room' ? readingDocument : null
    });
    
    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=60');
    
    return response;
  } catch (error) {
    console.error('[API GET /room-chatbot-data] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}