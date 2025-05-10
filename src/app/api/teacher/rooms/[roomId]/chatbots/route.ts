// src/app/api/teacher/rooms/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateRoomCode } from '@/lib/utils/room-codes'; // Ensure this utility exists
import type { CreateRoomPayload } from '@/types/database.types'; // Ensure this type is correct

// GET all rooms for the teacher
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Fetch teacher's rooms WITH associated chatbot names for display
    const { data: rooms, error: fetchError } = await supabase
      .from('rooms')
      .select(`
        *,
        room_chatbots (
          chatbots ( chatbot_id, name )
        )
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;
    return NextResponse.json(rooms || []);
  } catch (error) {
    console.error('Error in GET /api/teacher/rooms:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

// POST a new room
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    
    const { data: profile } = await supabase.from('profiles').select('role, school_id').eq('user_id', user.id).single();
    if (!profile || profile.role !== 'teacher') return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const body: CreateRoomPayload = await request.json();
    if (!body.room_name || !body.chatbot_ids || body.chatbot_ids.length === 0) {
      return NextResponse.json({ error: 'Room name and at least one chatbot ID are required' }, { status: 400 });
    }

    let roomCode = '';
    let isUnique = false;
    while (!isUnique) {
      roomCode = generateRoomCode();
      const { data: existing } = await supabase.from('rooms').select('room_code').eq('room_code', roomCode).single();
      if (!existing) isUnique = true;
    }

    // Create room in a transaction
    const { data: newRoom, error: roomInsertError } = await supabase.from('rooms').insert({
      room_name: body.room_name,
      room_code: roomCode,
      teacher_id: user.id,
      school_id: profile.school_id, // from teacher's profile
      is_active: true,
    }).select().single();

    if (roomInsertError) throw roomInsertError;
    if (!newRoom) throw new Error('Room creation failed silently.');

    const roomChatbotEntries = body.chatbot_ids.map(chatbotId => ({
      room_id: newRoom.room_id,
      chatbot_id: chatbotId,
    }));

    const { error: rcInsertError } = await supabase.from('room_chatbots').insert(roomChatbotEntries);
    if (rcInsertError) {
      // Rollback room creation if linking chatbots fails
      await supabase.from('rooms').delete().eq('room_id', newRoom.room_id);
      throw rcInsertError;
    }
    
    // Fetch the complete room data to return
    const { data: completeRoomData, error: fetchCompleteError } = await supabase
        .from('rooms')
        .select(`*, room_chatbots(chatbots(chatbot_id, name))`)
        .eq('room_id', newRoom.room_id)
        .single();

    if (fetchCompleteError) throw fetchCompleteError;

    return NextResponse.json(completeRoomData, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/teacher/rooms:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}