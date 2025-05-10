// src/app/api/teacher/rooms/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateRoomCode } from '@/lib/utils/room-codes';
import type { CreateRoomPayload, TeacherRoom } from '@/types/database.types';

// GET all rooms for the teacher
export async function GET() {
  console.log('[API GET /rooms] Received request.');
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[API GET /rooms] Not authenticated or authError from getUser:', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    console.log('[API GET /rooms] User authenticated by getUser:', {
        id: user.id, 
        email: user.email, 
        aud: user.aud, // Should be 'authenticated'
        role: user.role // JWT role, typically 'authenticated'
    });

    console.log('[API GET /rooms] Attempting to fetch profile for user_id:', user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('[API GET /rooms] PROFILE FETCH ERROR OBJECT:', JSON.stringify(profileError, null, 2));
      console.warn('[API GET /rooms] Profile fetch failed for user:', user.id, 'Error message:', profileError.message);
      return NextResponse.json({ error: `User profile not found or error fetching it. Details: ${profileError.message}` }, { status: 403 });
    }
    
    if (!profile) {
      console.warn('[API GET /rooms] Profile data is null (but no error reported by Supabase) for user:', user.id);
      return NextResponse.json({ error: 'User profile not found (no data returned but no DB error).' }, { status: 403 });
    }

    console.log('[API GET /rooms] Profile fetched successfully:', profile);

    if (profile.role !== 'teacher') {
      console.warn('[API GET /rooms] User is not a teacher. Profile Role:', profile.role);
      return NextResponse.json({ error: 'Not authorized (user role is not teacher)' }, { status: 403 });
    }
    
    console.log('[API GET /rooms] User is confirmed teacher. Fetching rooms.');
    
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

    if (fetchError) {
      console.error('[API GET /rooms] Error fetching rooms from DB:', fetchError);
      throw fetchError; // Let the outer catch handle it by re-throwing
    }
    console.log(`[API GET /rooms] Successfully fetched ${rooms?.length || 0} rooms.`);
    return NextResponse.json(rooms || []);

  } catch (error) {
    const typedError = error as Error & { code?: string; details?: string }; // Cast with error properties
    console.error('[API GET /rooms] CATCH BLOCK Error:', 
        typedError?.message, 
        'Code:', typedError?.code, 
        'Details:', typedError?.details
    );
    return NextResponse.json(
      { error: typedError?.message || 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

// POST a new room
export async function POST(request: Request) {
  console.log('[API POST /rooms] Received request to create a new room.');
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[API POST /rooms] Not authenticated or authError from getUser:', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    console.log('[API POST /rooms] User authenticated by getUser:', {
        id: user.id, 
        email: user.email, 
        aud: user.aud, // Should be 'authenticated'
        role: user.role // JWT role, typically 'authenticated'
    });
    
    console.log('[API POST /rooms] Attempting to fetch profile for user_id:', user.id);
    const { data: profile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('user_id', user.id)
      .single();

    if (profileFetchError) {
        console.error('[API POST /rooms] PROFILE FETCH ERROR OBJECT:', JSON.stringify(profileFetchError, null, 2));
        console.warn('[API POST /rooms] Profile fetch failed for user:', user.id, 'Error message:', profileFetchError.message);
        return NextResponse.json({ error: `Error fetching user profile. Details: ${profileFetchError.message}` }, { status: 500 });
    }
    if (!profile) {
        console.error('[API POST /rooms] Profile data is null (but no error reported by Supabase) for user:', user.id);
        return NextResponse.json({ error: 'User profile not found (no data returned but no DB error).' }, { status: 403 });
    }
     console.log('[API POST /rooms] Profile fetched successfully:', profile);

    if (profile.role !== 'teacher') {
      console.warn('[API POST /rooms] User is not a teacher. Profile Role:', profile.role);
      return NextResponse.json({ error: 'Not authorized (user role is not teacher)' }, { status: 403 });
    }
    console.log('[API POST /rooms] User is confirmed teacher. Proceeding with room creation.');

    const body: CreateRoomPayload = await request.json();
    console.log('[API POST /rooms] Request body:', body);

    if (!body.room_name || !body.chatbot_ids || !Array.isArray(body.chatbot_ids) || body.chatbot_ids.length === 0) {
      console.warn('[API POST /rooms] Invalid request body: Missing room_name or chatbot_ids.');
      return NextResponse.json({ error: 'Room name and at least one chatbot ID are required' }, { status: 400 });
    }

    let roomCode = '';
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10; 
    
    console.log('[API POST /rooms] Generating unique room code...');
    while (!isUnique && attempts < MAX_ATTEMPTS) {
      roomCode = generateRoomCode();
      const { data: existingRoom, error: codeCheckError } = await supabase
        .from('rooms')
        .select('room_code')
        .eq('room_code', roomCode)
        .maybeSingle(); 
      
      if (codeCheckError) {
        console.error('[API POST /rooms] Error checking room code uniqueness:', codeCheckError);
        throw codeCheckError;
      }
      if (!existingRoom) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
        console.error('[API POST /rooms] Failed to generate a unique room code after multiple attempts.');
        throw new Error('Failed to generate a unique room code.');
    }
    console.log('[API POST /rooms] Unique room code generated:', roomCode);

    console.log('[API POST /rooms] Inserting new room into "rooms" table.');
    const { data: newRoom, error: roomInsertError } = await supabase
      .from('rooms')
      .insert({
        room_name: body.room_name,
        room_code: roomCode,
        teacher_id: user.id,
        school_id: profile.school_id, 
        is_active: true,
      })
      .select()
      .single();

    if (roomInsertError) {
      console.error('[API POST /rooms] Error inserting into "rooms" table:', roomInsertError);
      throw roomInsertError;
    }
    if (!newRoom) {
        console.error('[API POST /rooms] Room creation failed: newRoom data is null after insert.');
        throw new Error('Room creation returned no data.');
    }
    console.log('[API POST /rooms] Room inserted successfully. Room ID:', newRoom.room_id);

    console.log('[API POST /rooms] Preparing to insert into "room_chatbots" table.');
    const roomChatbotEntries = body.chatbot_ids.map(chatbotId => ({
      room_id: newRoom.room_id,
      chatbot_id: chatbotId,
    }));

    const { error: rcInsertError } = await supabase
      .from('room_chatbots')
      .insert(roomChatbotEntries);

    if (rcInsertError) {
      console.error('[API POST /rooms] Error inserting into "room_chatbots":', rcInsertError);
      console.log(`[API POST /rooms] Attempting to rollback room creation for room ID: ${newRoom.room_id} due to room_chatbots insert failure.`);
      const { error: deleteError } = await supabase.from('rooms').delete().eq('room_id', newRoom.room_id);
      if (deleteError) {
          console.error(`[API POST /rooms] CRITICAL: Failed to rollback room ${newRoom.room_id} after room_chatbots insert error:`, deleteError);
      } else {
          console.log(`[API POST /rooms] Successfully rolled back room ${newRoom.room_id}.`);
      }
      throw rcInsertError; 
    }
    console.log(`[API POST /rooms] Successfully inserted ${roomChatbotEntries.length} entries into "room_chatbots".`);
    
    console.log('[API POST /rooms] Fetching complete room data for response.');
    const { data: completeRoomData, error: fetchCompleteError } = await supabase
        .from('rooms')
        .select(`
            *,
            room_chatbots (
              chatbots ( chatbot_id, name )
            )
        `)
        .eq('room_id', newRoom.room_id)
        .single();

    if (fetchCompleteError) {
        console.error('[API POST /rooms] Error fetching complete room data after creation:', fetchCompleteError);
        throw fetchCompleteError;
    }
    if (!completeRoomData) {
        console.error('[API POST /rooms] Failed to fetch complete room data after creation, though room should exist.');
        throw new Error('Failed to retrieve newly created room details.');
    }

    console.log('[API POST /rooms] Room creation successful. Returning complete room data.');
    return NextResponse.json(completeRoomData as TeacherRoom, { status: 201 });

  } catch (error) {
    const typedError = error as Error & { code?: string; details?: string; constraint?: string };
    console.error('[API POST /rooms] CATCH BLOCK Error:', 
        typedError?.message, 
        'Code:', typedError?.code, 
        'Details:', typedError?.details
    );
    if (typedError?.code === '23505' && typedError?.constraint === 'rooms_room_code_key') {
        return NextResponse.json({ error: 'A room with this code already exists. This is highly unlikely and might indicate an issue with room code generation.' }, { status: 409 });
    }
    return NextResponse.json(
      { error: typedError?.message || 'Failed to create room' },
      { status: 500 }
    );
  }
}