// src/app/api/student/verify-room-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidRoomCode } from '@/lib/utils/room-codes';

export async function GET(request: NextRequest) {
  try {
    // Get room code from query params
    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get('code');

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
    }

    const formattedCode = roomCode.toUpperCase();

    // Validate the room code format
    if (!isValidRoomCode(formattedCode)) {
      return NextResponse.json({ 
        error: 'Invalid room code format. Codes should be 6 characters (letters and numbers).' 
      }, { status: 400 });
    }

    // Use admin client to ensure we can access the data regardless of auth state
    const supabaseAdmin = createAdminClient();

    // Verify the room exists
    console.log('[API GET /verify-room-code] Looking up room code:', formattedCode);
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('room_id, room_name, is_active')
      .eq('room_code', formattedCode)
      .single();

    if (roomError) {
      console.error('[API GET /verify-room-code] Error fetching room:', roomError);
      if (roomError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Database error: ' + roomError.message }, { status: 500 });
    }

    if (!room) {
      console.warn('[API GET /verify-room-code] No room found for code:', formattedCode);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get chatbots for this room
    const { data: roomChatbots, error: chatbotError } = await supabaseAdmin
      .from('room_chatbots')
      .select('chatbot_id')
      .eq('room_id', room.room_id);

    // Return the room info and available chatbots
    return NextResponse.json({
      room: {
        room_id: room.room_id,
        room_name: room.room_name,
        is_active: room.is_active
      },
      hasChatbots: !chatbotError && roomChatbots && roomChatbots.length > 0,
      chatbotCount: !chatbotError && roomChatbots ? roomChatbots.length : 0
    });
  } catch (error) {
    console.error('[API GET /verify-room-code] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}