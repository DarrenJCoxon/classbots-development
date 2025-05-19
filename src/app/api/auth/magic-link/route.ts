// src/app/api/auth/magic-link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const supabaseAdmin = createAdminClient();
    
    const { token, room_code } = await request.json();
    
    if (!token || !room_code) {
      return NextResponse.json({ 
        error: 'Missing required parameters: token and room_code' 
      }, { status: 400 });
    }
    
    console.log('[Magic Link API] Processing request for room code:', room_code);
    
    // Find the room by code first - use admin client for reliable permissions
    let roomId: string;
    // Room code is already available in room_code variable, no need to redefine
    
    try {
      // Using admin client to bypass any RLS policies
      const { data: rooms, error: roomError } = await supabaseAdmin
        .from('rooms')
        .select('room_id, is_active, room_code')
        .eq('room_code', room_code.toUpperCase());
        
      if (roomError) {
        console.error('[Magic Link API] Database error looking up room:', roomError);
        return NextResponse.json({ 
          error: 'Database error when looking up room' 
        }, { status: 500 });
      }
      
      if (!rooms || rooms.length === 0) {
        console.error('[Magic Link API] Room not found for code:', room_code);
        return NextResponse.json({ 
          error: 'Room not found. Please check the code and try again.' 
        }, { status: 404 });
      }
      
      const room = rooms[0];
      console.log('[Magic Link API] Found room:', room.room_id, 'with code:', room.room_code);
      
      // Check if room is active
      if (!room.is_active) {
        console.warn('[Magic Link API] Room is inactive:', room.room_code);
        return NextResponse.json({
          error: 'This classroom is currently inactive. Please contact your teacher.'
        }, { status: 403 });
      }
      
      // Save the room ID for use later
      roomId = room.room_id;
      // We don't use roomCode after validating, so we don't need to store it
      // roomCode = room.room_code;
    } catch (roomLookupError) {
      console.error('[Magic Link API] Error in room lookup process:', roomLookupError);
      return NextResponse.json({ 
        error: 'Failed to verify room code'
      }, { status: 500 });
    }

    // Parse student name from URL parameters
    const nameParam = new URLSearchParams(request.url.split('?')[1] || '').get('name') || 
                      new URLSearchParams(request.headers.get('referer')?.split('?')[1] || '').get('name');
    const studentName = nameParam ? decodeURIComponent(nameParam) : 'Student';
    
    console.log('[Magic Link API] Student name:', studentName);
    
    // Create a temporary user account
    const { data: tempUser, error: tempUserError } = await supabaseAdmin.auth.admin.createUser({
      email: `student-${Date.now()}-${Math.random().toString(36).substring(2, 10)}@temp.classbots.ai`,
      password: Math.random().toString(36).substring(2, 14),
      user_metadata: {
        role: 'student',
        is_anonymous: true,
        full_name: studentName,
      },
    });
    
    if (tempUserError || !tempUser?.user) {
      console.error('[Magic Link API] Error creating temp user:', tempUserError);
      return NextResponse.json({ 
        error: 'Failed to create temporary account' 
      }, { status: 500 });
    }
    
    const userId = tempUser.user.id;
    
    // Create or update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        email: tempUser.user.email || '',
        full_name: studentName,
        role: 'student',
        is_anonymous: true
      });
      
    if (profileError) {
      console.error('[Magic Link API] Error creating profile:', profileError);
      // Continue anyway - the profile might have been created by a trigger
    }
    
    // Add user to room
    const { error: joinError } = await supabase
      .from('room_memberships')
      .insert({
        room_id: roomId,
        student_id: userId
      });
      
    if (joinError) {
      console.error('[Magic Link API] Error adding student to room:', joinError);
      return NextResponse.json({ 
        error: 'Failed to add student to room' 
      }, { status: 500 });
    }
    
    // Set auth cookie for the user
    // Handle different Supabase versions with compatibility layer
    let sessionData;
    let sessionError;
    
    try {
      console.log('[Magic Link API] Creating session for user');
      // @ts-expect-error - We're handling API differences at runtime
      const adminAuthFn = supabaseAdmin.auth.admin.createSession || supabaseAdmin.auth.admin.signInWithUserId;
      
      if (!adminAuthFn) {
        throw new Error('No compatible session creation method found');
      }
      
      // Try the function with both argument styles
      let result;
      try {
        // Try createSession style first
        result = await adminAuthFn({ user_id: userId });
      } catch {
        // If that fails, try signInWithUserId style without needing the error
        result = await adminAuthFn(userId, { expiresIn: 604800 });
      }
      
      sessionData = result.data;
      sessionError = result.error;
    } catch (error) {
      console.error('[Magic Link API] Error in session creation:', error);
      sessionError = error;
    }
    
    if (sessionError) {
      console.error('[Magic Link API] Error creating session:', sessionError);
      return NextResponse.json({ 
        error: 'Failed to create session' 
      }, { status: 500 });
    }
    
    // Return success with room ID
    console.log('[Magic Link API] Successfully authenticated user via magic link');
    
    // Create the response with the user and room info
    const response = NextResponse.json({ 
      success: true, 
      user_id: userId,
      room_id: roomId
    });
    
    // Add the session cookie
    if (sessionData.session) {
      response.cookies.set('supabase-auth-token', JSON.stringify(sessionData.session), {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }
    
    return response;
  } catch (error) {
    console.error('[Magic Link API] General error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to authenticate with magic link' },
      { status: 500 }
    );
  }
}