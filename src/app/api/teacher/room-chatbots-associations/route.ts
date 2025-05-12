// src/app/api/teacher/room-chatbots-associations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UpdateRoomChatbotsPayload } from '@/types/database.types';

// GET current chatbots for a room
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  
  console.log(`[API GET /room-chatbots-associations] Request for roomId: ${roomId}`);

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID query parameter is required' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('teacher_id', user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found or unauthorized' }, { status: 404 });
    }

    const { data: roomChatbots, error } = await supabase
      .from('room_chatbots')
      .select('chatbot_id') 
      .eq('room_id', roomId);

    if (error) {
      console.error(`[API GET /room-chatbots-associations] Error fetching room chatbots for ${roomId}:`, error);
      return NextResponse.json({ error: 'Failed to fetch room chatbots' }, { status: 500 });
    }
    
    return NextResponse.json(roomChatbots || []); 

  } catch (error) {
    console.error('[API GET /room-chatbots-associations] Catch error:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching room chatbots' },
      { status: 500 }
    );
  }
}

// PUT (update) chatbots for a room
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  console.log(`[API PUT /room-chatbots-associations] Request for roomId: ${roomId}`);

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID query parameter is required for PUT' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body: UpdateRoomChatbotsPayload = await request.json();

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('teacher_id', user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found or unauthorized' }, { status: 404 });
    }

    // Perform in a transaction if Supabase JS client supported it easily,
    // otherwise, it's two separate operations.
    const { error: deleteError } = await supabase
      .from('room_chatbots')
      .delete()
      .eq('room_id', roomId);

    if (deleteError) {
      console.error(`[API PUT /room-chatbots-associations] Error deleting existing room chatbots for ${roomId}:`, deleteError);
      return NextResponse.json({ error: 'Failed to clear existing chatbots for room', details: deleteError.message }, { status: 500 });
    }

    if (body.chatbot_ids && body.chatbot_ids.length > 0) {
      const newEntries = body.chatbot_ids.map(chatbotId => ({
        room_id: roomId,
        chatbot_id: chatbotId,
      }));
      const { error: insertError } = await supabase
        .from('room_chatbots')
        .insert(newEntries);

      if (insertError) {
        console.error(`[API PUT /room-chatbots-associations] Error inserting new room chatbots for ${roomId}:`, insertError);
        // Potentially try to rollback delete, or just report error.
        return NextResponse.json({ error: 'Failed to insert new chatbots for room', details: insertError.message }, { status: 500 });
      }
    }
    
    console.log(`[API PUT /room-chatbots-associations] Room chatbots updated successfully for ${roomId}.`);
    return NextResponse.json({ success: true, message: 'Room chatbots updated successfully' });

  } catch (error) {
    const typedError = error as Error;
    console.error('[API PUT /room-chatbots-associations] Catch error:', typedError.message);
    if (typedError instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON payload in PUT request.' }, { status: 400 });
    }
    return NextResponse.json(
      { error: typedError.message || 'Failed to update room chatbots' },
      { status: 500 }
    );
  }
}