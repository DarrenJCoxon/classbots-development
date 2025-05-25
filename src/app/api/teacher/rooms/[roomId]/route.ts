// src/app/api/teacher/rooms/[roomId]/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { is_active } = await request.json();
    const params = await context.params;
    const roomId = params.roomId;

    // Update room status
    const { data: room, error } = await supabase
      .from('rooms')
      .update({ is_active })
      .eq('room_id', roomId)
      .eq('teacher_id', user.id) // Ensure only the room owner can update
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const params = await context.params;
    const roomId = params.roomId;

    // First, check if the user owns this room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('teacher_id', user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Delete the room (this should cascade to related tables via foreign key constraints)
    const { error: deleteError } = await supabase
      .from('rooms')
      .delete()
      .eq('room_id', roomId)
      .eq('teacher_id', user.id);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting room:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete room';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}