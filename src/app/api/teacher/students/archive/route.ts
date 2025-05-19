// src/app/api/teacher/students/archive/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    // Authentication check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get request body
    const { studentId, roomId } = await request.json();

    if (!studentId || !roomId) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId and roomId are required' },
        { status: 400 }
      );
    }
    
    // Verify the teacher owns the room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('teacher_id', user.id)
      .single();
    
    if (roomError || !room) {
      console.error('Room access error:', roomError);
      return NextResponse.json(
        { error: 'No permission to access this room or room not found' },
        { status: 403 }
      );
    }

    // Use admin client for the deletion to bypass RLS
    const adminClient = createAdminClient();
    
    // Archive the student's room membership instead of deleting it
    const { error: archiveError } = await adminClient
      .from('room_memberships')
      .update({ 
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('room_id', roomId)
      .eq('student_id', studentId);
      
    if (archiveError) {
      console.error('Error archiving student room membership:', archiveError);
      return NextResponse.json(
        { error: 'Failed to archive student room membership: ' + archiveError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Student successfully archived from room'
    });
    
  } catch (error) {
    console.error('Error in student archive endpoint:', error);
    return NextResponse.json(
      { error: 'Server error while processing request' },
      { status: 500 }
    );
  }
}