// src/app/api/student/room-chatbot-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // Get parameters from query string
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const chatbotId = searchParams.get('chatbotId');
    const userId = searchParams.get('userId');

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

    // Get room data
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (roomError || !room) {
      console.error('[API GET /room-chatbot-data] Error fetching room:', roomError);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Verify the chatbot is associated with this room
    const { data: roomChatbot, error: rcError } = await supabaseAdmin
      .from('room_chatbots')
      .select('chatbot_id')
      .eq('room_id', roomId)
      .eq('chatbot_id', chatbotId)
      .single();

    if (rcError || !roomChatbot) {
      console.error('[API GET /room-chatbot-data] Chatbot not associated with room:', rcError);
      return NextResponse.json({ 
        error: 'Chatbot is not associated with this room' 
      }, { status: 404 });
    }

    // Get chatbot data
    const { data: chatbot, error: chatbotError } = await supabaseAdmin
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
        bot_type, 
        assessment_criteria_text,
        welcome_message
      `)
      .eq('chatbot_id', chatbotId)
      .single();

    if (chatbotError || !chatbot) {
      console.error('[API GET /room-chatbot-data] Error fetching chatbot:', chatbotError);
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    // Return room and chatbot data
    return NextResponse.json({
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
      chatbot: chatbot
    });
  } catch (error) {
    console.error('[API GET /room-chatbot-data] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}