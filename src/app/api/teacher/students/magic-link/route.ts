// src/app/api/teacher/students/magic-link/route.ts
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
      .select('room_code')
      .eq('room_id', roomId)
      .eq('teacher_id', user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found or you do not have permission to access it' },
        { status: 404 }
      );
    }

    // Get the student details
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check if student is in the room
    const supabaseAdmin = createAdminClient();
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('room_memberships')
      .select('*')
      .eq('room_id', roomId)
      .eq('student_id', studentId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Student is not a member of this room' },
        { status: 404 }
      );
    }

    // Generate the magic link using the format: roomCode_userId_encodedStudentName
    const encodedName = encodeURIComponent(student.full_name);
    const simpleLinkCode = `${room.room_code}_${studentId}_${encodedName}`;
    
    // For production, ensure we're using skolr.app domain
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // If we're in production, but the URL isn't skolr.app, force it to be
    if (process.env.NODE_ENV === 'production' && !baseUrl.includes('skolr.app')) {
      console.log('[Student Magic Link API] Enforcing production domain for magic link');
      baseUrl = 'https://skolr.app';
    }
    
    const magicLink = `${baseUrl}/m/${simpleLinkCode}`;

    return NextResponse.json({
      magicLink,
      studentName: student.full_name,
      code: simpleLinkCode
    });
  } catch (error) {
    console.error('Error generating student magic link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate magic link' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // This is basically the same as GET but intended for regeneration
    // It follows the same procedure but can be tracked differently on the client
    
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
      .select('room_code')
      .eq('room_id', roomId)
      .eq('teacher_id', user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found or you do not have permission to access it' },
        { status: 404 }
      );
    }

    // Get the student details
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check if student is in the room
    const supabaseAdmin = createAdminClient();
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('room_memberships')
      .select('*')
      .eq('room_id', roomId)
      .eq('student_id', studentId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Student is not a member of this room' },
        { status: 404 }
      );
    }

    // Generate the magic link
    const encodedName = encodeURIComponent(student.full_name);
    const simpleLinkCode = `${room.room_code}_${studentId}_${encodedName}`;
    
    // For production, ensure we're using skolr.app domain
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // If we're in production, but the URL isn't skolr.app, force it to be
    if (process.env.NODE_ENV === 'production' && !baseUrl.includes('skolr.app')) {
      console.log('[Student Magic Link API] Enforcing production domain for magic link');
      baseUrl = 'https://skolr.app';
    }
    
    const magicLink = `${baseUrl}/m/${simpleLinkCode}`;

    return NextResponse.json({
      magicLink,
      studentName: student.full_name,
      code: simpleLinkCode,
      regenerated: true
    });
  } catch (error) {
    console.error('Error regenerating student magic link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate magic link' },
      { status: 500 }
    );
  }
}