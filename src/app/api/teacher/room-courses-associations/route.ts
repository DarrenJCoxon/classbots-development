// src/app/api/teacher/room-courses-associations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UpdateRoomCoursesPayload } from '@/types/database.types';

// GET current courses for a room
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  
  console.log(`[API GET /room-courses-associations] Request for roomId: ${roomId}`);

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

    const { data: roomCourses, error } = await supabase
      .from('room_courses')
      .select('course_id') 
      .eq('room_id', roomId);

    if (error) {
      console.error(`[API GET /room-courses-associations] Error fetching room courses for ${roomId}:`, error);
      return NextResponse.json({ error: 'Failed to fetch room courses' }, { status: 500 });
    }
    
    return NextResponse.json(roomCourses || []); 

  } catch (error) {
    console.error('[API GET /room-courses-associations] Catch error:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching room courses' },
      { status: 500 }
    );
  }
}

// PUT (update) courses for a room
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  console.log(`[API PUT /room-courses-associations] Request for roomId: ${roomId}`);

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID query parameter is required for PUT' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body: UpdateRoomCoursesPayload = await request.json();

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('teacher_id', user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found or unauthorized' }, { status: 404 });
    }

    // Delete existing course associations for this room
    const { error: deleteError } = await supabase
      .from('room_courses')
      .delete()
      .eq('room_id', roomId);

    if (deleteError) {
      console.error(`[API PUT /room-courses-associations] Error deleting existing room courses for ${roomId}:`, deleteError);
      return NextResponse.json({ error: 'Failed to clear existing courses for room', details: deleteError.message }, { status: 500 });
    }

    // Insert new course associations if any are provided
    if (body.course_ids && body.course_ids.length > 0) {
      const newEntries = body.course_ids.map(courseId => ({
        room_id: roomId,
        course_id: courseId,
        assigned_by: user.id
      }));
      
      const { error: insertError } = await supabase
        .from('room_courses')
        .insert(newEntries);

      if (insertError) {
        console.error(`[API PUT /room-courses-associations] Error inserting new room courses for ${roomId}:`, insertError);
        return NextResponse.json({ error: 'Failed to insert new courses for room', details: insertError.message }, { status: 500 });
      }
    }
    
    console.log(`[API PUT /room-courses-associations] Room courses updated successfully for ${roomId}.`);
    return NextResponse.json({ success: true, message: 'Room courses updated successfully' });

  } catch (error) {
    const typedError = error as Error;
    console.error('[API PUT /room-courses-associations] Catch error:', typedError.message);
    if (typedError instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON payload in PUT request.' }, { status: 400 });
    }
    return NextResponse.json(
      { error: typedError.message || 'Failed to update room courses' },
      { status: 500 }
    );
  }
}