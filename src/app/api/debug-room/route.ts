// src/app/api/debug-room/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    
    if (!roomId) {
      return NextResponse.json({ error: 'roomId parameter required' }, { status: 400 });
    }
    
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Use admin client to fetch room details
    const adminClient = createAdminClient();
    const { data: room, error: roomError } = await adminClient
      .from('rooms')
      .select('*')
      .eq('room_id', roomId)
      .single();
      
    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found', details: roomError }, { status: 404 });
    }
    
    // Get teacher profile using the room's teacher_id
    const { data: teacherProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('user_id', room.teacher_id)
      .single();
      
    return NextResponse.json({
      room,
      teacherProfile,
      profileError,
      teacherIdInRoom: room.teacher_id,
      yourUserId: user.id,
      isMatch: room.teacher_id === user.id,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to get room debug info' }, { status: 500 });
  }
}