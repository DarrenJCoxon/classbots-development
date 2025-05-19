// src/app/api/teacher/rooms/[roomId]/magic-link/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const params = await context.params;
    const roomId = params.roomId;

    // Verify user owns this room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_code')
      .eq('room_id', roomId)
      .eq('teacher_id', user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Generate a signup link with embedded room code
    // For production, ensure we're using skolr.app domain
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // If we're in production, but the URL isn't skolr.app, force it to be
    if (process.env.NODE_ENV === 'production' && !baseUrl.includes('skolr.app')) {
      console.log('[Room Magic Link API] Enforcing production domain for magic link');
      baseUrl = 'https://skolr.app';
    }
    
    const magicLink = `${baseUrl}/join-room?code=${room.room_code}`;

    return NextResponse.json({ 
      magicLink: magicLink,
      roomCode: room.room_code 
    });
  } catch (error) {
    console.error('Error generating magic link:', error);
    return NextResponse.json(
      { error: 'Failed to generate magic link' },
      { status: 500 }
    );
  }
}