// src/app/api/teacher/rooms/archive/route.ts
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
    const { roomId, archive = true } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { error: 'Missing required field: roomId is required' },
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

    // Use admin client for the update to bypass RLS
    const adminClient = createAdminClient();
    
    // Archive or restore the room
    const { error: archiveError } = await adminClient
      .from('rooms')
      .update({ 
        is_archived: archive,
        updated_at: new Date().toISOString()
      })
      .eq('room_id', roomId);
      
    if (archiveError) {
      console.error(`Error ${archive ? 'archiving' : 'restoring'} room:`, archiveError);
      return NextResponse.json(
        { error: `Failed to ${archive ? 'archive' : 'restore'} room: ` + archiveError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Room successfully ${archive ? 'archived' : 'restored'}`
    });
    
  } catch (error) {
    console.error('Error in room archive/restore endpoint:', error);
    return NextResponse.json(
      { error: 'Server error while processing request' },
      { status: 500 }
    );
  }
}