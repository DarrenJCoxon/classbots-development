// src/app/api/student/join-room/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isValidRoomCode } from '@/lib/utils/room-codes'; // Ensure this utility is present

export async function POST(request: Request) {
  console.log('[API POST /student/join-room] Received request.');
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.warn('[API POST /student/join-room] Not authenticated or session error:', sessionError);
      return NextResponse.json({ error: sessionError?.message || 'Not authenticated' }, { status: 401 });
    }
    const studentUser = session.user;
    console.log('[API POST /student/join-room] User authenticated:', studentUser.id);

    // Verify the user trying to join actually has a 'student' role in profiles table
    const { data: studentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', studentUser.id)
        .single();

    if (profileError || !studentProfile) {
        console.error('[API POST /student/join-room] Profile not found or error for student:', studentUser.id, profileError);
        return NextResponse.json({ error: 'Student profile not found.' }, { status: 403 });
    }
    if (studentProfile.role !== 'student') {
        console.warn('[API POST /student/join-room] User is not a student. Role:', studentProfile.role);
        return NextResponse.json({ error: 'Only students can join rooms this way.' }, { status: 403 });
    }
    console.log('[API POST /student/join-room] User confirmed as student.');


    const { room_code } = await request.json();
    console.log('[API POST /student/join-room] Received room_code:', room_code);

    if (!room_code || !isValidRoomCode(room_code.toUpperCase())) { // Ensure case-insensitivity if codes are stored uppercase
      console.warn('[API POST /student/join-room] Invalid room code format:', room_code);
      return NextResponse.json({ error: 'Invalid room code format' }, { status: 400 });
    }

    const formattedRoomCode = room_code.toUpperCase();

    // Find room by code
    console.log('[API POST /student/join-room] Searching for room with code:', formattedRoomCode);
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_id, is_active')
      .eq('room_code', formattedRoomCode) // Ensure room_code in DB is also consistently cased or use a case-insensitive query
      .single();

    if (roomError) {
        console.error('[API POST /student/join-room] Error fetching room by code:', formattedRoomCode, roomError);
        // This could be a "relation rooms does not exist" if table is missing, or other DB error
        // But more likely if table exists, it's "0 rows" which isn't an error for .single() if it becomes !room
        // For a true DB error, throw it.
        if (roomError.code && !['PGRST116'].includes(roomError.code)) { // PGRST116 is "Searched for a single row, but found 0 rows"
             throw roomError;
        }
    }
    
    if (!room) { // This handles both "0 rows found" and if roomError was PGRST116
      console.warn('[API POST /student/join-room] Room not found with code:', formattedRoomCode);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 }); // This is your current error
    }
    console.log('[API POST /student/join-room] Room found:', room.room_id, 'Is active:', room.is_active);


    if (!room.is_active) {
      console.warn('[API POST /student/join-room] Room is inactive:', room.room_id);
      return NextResponse.json({ error: 'This room is currently inactive.' }, { status: 400 });
    }

    // Check if student is already in room
    const { data: existingMembership, error: membershipCheckError } = await supabase
      .from('room_memberships')
      .select('room_id')
      .eq('room_id', room.room_id)
      .eq('student_id', studentUser.id)
      .maybeSingle(); // Use maybeSingle to not error if no membership found

    if (membershipCheckError) {
        console.error('[API POST /student/join-room] Error checking existing membership:', membershipCheckError);
        throw membershipCheckError;
    }

    if (existingMembership) {
      console.warn('[API POST /student/join_room] Student already a member of this room:', room.room_id);
      return NextResponse.json({ message: 'Already joined this room', roomId: room.room_id }, { status: 200 }); // Or 400 if you want to treat as error
    }

    // Add student to room
    console.log('[API POST /student/join-room] Adding student to room_memberships. RoomID:', room.room_id, 'StudentID:', studentUser.id);
    const { error: joinError } = await supabase
      .from('room_memberships')
      .insert({
        room_id: room.room_id,
        student_id: studentUser.id
        // joined_at has a default value
      });

    if (joinError) {
      console.error('[API POST /student/join-room] Error inserting into room_memberships:', joinError);
      // Check for unique constraint violation (already a member, though prior check should catch this)
      if (joinError.code === '23505') { // unique_violation
         return NextResponse.json({ message: 'Already a member of this room (insert conflict).', roomId: room.room_id }, { status: 200 });
      }
      throw joinError;
    }
    console.log('[API POST /student/join-room] Student successfully joined room:', room.room_id);
    return NextResponse.json({ success: true, roomId: room.room_id, message: 'Successfully joined room!' });
  } catch (error) {
    const typedError = error as Error & { code?: string; details?: unknown };
    console.error('[API POST /student/join-room] CATCH BLOCK Error:', 
        typedError?.message, 
        'Code:', typedError?.code, 
        'Details:', typedError?.details
    );
    return NextResponse.json(
      { error: typedError?.message || 'Failed to join room' },
      { status: 500 }
    );
  }
}