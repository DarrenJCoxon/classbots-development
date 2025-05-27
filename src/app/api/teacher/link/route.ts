// src/app/api/teacher/link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const roomId = searchParams.get('roomId');
    
    console.log('[Magic Link API] GET request received with params:', { studentId, roomId, url: request.url });

    if (!studentId || !roomId) {
      console.error('[Magic Link API] Missing required parameters');
      return NextResponse.json(
        { error: 'Both studentId and roomId are required' },
        { status: 400 }
      );
    }

    // Get the teacher's authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Magic Link API] Authentication error:', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the room to verify ownership and get room code
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_code, room_name')
      .eq('room_id', roomId)
      .single();

    if (roomError || !room) {
      console.error('[Magic Link API] Room error:', roomError);
      return NextResponse.json(
        { error: 'Room not found or you do not have permission to access it' },
        { status: 404 }
      );
    }

    console.log('[Magic Link API] Found room:', room);

    // Get the student details
    const { data: profile, error: studentError } = await supabase
      .from('student_profiles')
      .select('full_name')
      .eq('user_id', studentId)
      .single();

    if (studentError || !profile) {
      console.error('[Magic Link API] Student error:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    console.log('[Magic Link API] Found student:', profile);

    // Check if student is in the room
    const supabaseAdmin = createAdminClient();
    const { error: membershipError } = await supabaseAdmin
      .from('room_memberships')
      .select('*')
      .eq('room_id', roomId)
      .eq('student_id', studentId)
      .single();
    // Note: 'membership' data is not used but the check is needed to verify if student is in room

    if (membershipError) {
      console.error('[Magic Link API] Membership error:', membershipError);
      if (membershipError.code !== 'PGRST116') { // Not found
        return NextResponse.json(
          { error: 'Error checking room membership' },
          { status: 500 }
        );
      }
    }

    // Generate the magic link using the format: roomCode_userId_encodedStudentName
    const encodedName = encodeURIComponent(profile.full_name);
    const simpleLinkCode = `${room.room_code}_${studentId}_${encodedName}`;
    
    // For production, ensure we're using skolr.app domain
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // If we're in production, but the URL isn't skolr.app, force it to be
    if (process.env.NODE_ENV === 'production' && !baseUrl.includes('skolr.app')) {
      console.log('[Teacher Link API] Enforcing production domain for magic link');
      baseUrl = 'https://skolr.app';
    }
    
    const magicLink = `${baseUrl}/m/${simpleLinkCode}`;

    console.log('[Magic Link API] Generated link with code:', simpleLinkCode);

    return NextResponse.json({
      magicLink,
      studentName: profile.full_name,
      code: simpleLinkCode,
      roomCode: room.room_code,
      roomName: room.room_name
    });
  } catch (error) {
    console.error('[Magic Link API] Error generating magic link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate magic link' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, roomId } = body;
    
    console.log('[Magic Link API] POST request received with body:', { studentId, roomId });

    if (!studentId || !roomId) {
      return NextResponse.json(
        { error: 'Both studentId and roomId are required' },
        { status: 400 }
      );
    }

    // Get the teacher's authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the room to verify ownership and get room code
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_code, room_name')
      .eq('room_id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found or you do not have permission to access it' },
        { status: 404 }
      );
    }

    // Get the student details
    const { data: profile, error: studentError } = await supabase
      .from('student_profiles')
      .select('full_name')
      .eq('user_id', studentId)
      .single();

    if (studentError || !profile) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check if student is in the room
    const supabaseAdmin = createAdminClient();
    const { error: membershipError } = await supabaseAdmin
      .from('room_memberships')
      .select('*')
      .eq('room_id', roomId)
      .eq('student_id', studentId)
      .single();
    // Note: 'membership' data is not used but the check is needed to verify if student is in room

    if (membershipError && membershipError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Error checking room membership' },
        { status: 500 }
      );
    }

    // Generate the magic link
    const encodedName = encodeURIComponent(profile.full_name);
    const simpleLinkCode = `${room.room_code}_${studentId}_${encodedName}`;
    
    // For production, ensure we're using skolr.app domain
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // If we're in production, but the URL isn't skolr.app, force it to be
    if (process.env.NODE_ENV === 'production' && !baseUrl.includes('skolr.app')) {
      console.log('[Teacher Link API] Enforcing production domain for magic link');
      baseUrl = 'https://skolr.app';
    }
    
    const magicLink = `${baseUrl}/m/${simpleLinkCode}`;

    console.log('[Magic Link API] Regenerated link with code:', simpleLinkCode);

    return NextResponse.json({
      magicLink,
      studentName: profile.full_name,
      code: simpleLinkCode,
      roomCode: room.room_code,
      roomName: room.room_name,
      regenerated: true
    });
  } catch (error) {
    console.error('[Magic Link API] Error regenerating magic link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate magic link' },
      { status: 500 }
    );
  }
}