// src/app/api/emergency-room-access/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { v4 as uuidv4 } from 'uuid';

// This is a last-resort emergency endpoint for getting students into a room
// when all other methods fail. It's a simplified version of the join-room API.

export async function POST(request: NextRequest) {
  console.log('[Emergency Access API] Received request');
  
  try {
    // Handle both form data and JSON requests for maximum flexibility
    let roomCode: string | undefined;
    let studentName: string | undefined;
    
    // Check content type to determine how to parse the request
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Handle JSON request
      const jsonData = await request.json();
      roomCode = jsonData.roomCode?.toString() || jsonData.room_code?.toString();
      studentName = jsonData.studentName?.toString() || jsonData.student_name?.toString();
      console.log('[Emergency Access API] Parsed JSON data:', { roomCode, studentName });
    } else {
      // Handle form data request (legacy support)
      const formData = await request.formData();
      roomCode = formData.get('room_code')?.toString();
      studentName = formData.get('student_name')?.toString();
      console.log('[Emergency Access API] Parsed form data:', { roomCode, studentName });
    }

    if (!roomCode || !studentName) {
      return NextResponse.json({ error: 'Missing required fields', details: 'Room code and student name are required' }, { status: 400 });
    }
    
    console.log(`[Emergency Access API] Attempting access for ${studentName} to room ${roomCode}`);
    
    // Use admin client for maximum reliability
    const supabaseAdmin = createAdminClient();
    
    // 1. Find the room
    const { data: rooms, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('room_id, room_name, is_active')
      .eq('room_code', roomCode.toUpperCase())
      .limit(1);
      
    if (roomError || !rooms || rooms.length === 0) {
      console.error(`[Emergency Access API] Room not found: ${roomCode}`);
      // Redirect to the join page with an error
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `/join-room?code=${roomCode}&error=Room+not+found`
        }
      });
    }
    
    const room = rooms[0];
    
    if (!room.is_active) {
      console.warn(`[Emergency Access API] Room is inactive: ${roomCode}`);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `/join-room?code=${roomCode}&error=Room+is+inactive`
        }
      });
    }
    
    // 2. Create an emergency anonymous user
    // Generate unique identifiers for this emergency user
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    const tempEmail = `emergency-${timestamp}-${uniqueId.substring(0, 8)}@tempuser.classbots.ai`;
    const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    try {
      console.log(`[Emergency Access API] Creating anonymous user for ${studentName}`);
      
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: tempEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: studentName,
          role: 'student',
          is_anonymous: true,
          is_emergency: true,
          created_at: new Date().toISOString()
        },
        app_metadata: {
          role: 'student'
        }
      });
      
      if (userError || !userData?.user) {
        console.error(`[Emergency Access API] Failed to create user: ${userError?.message}`);
        return new Response(null, {
          status: 302,
          headers: {
            'Location': `/join-room?code=${roomCode}&error=Failed+to+create+emergency+account`
          }
        });
      }
      
      const userId = userData.user.id;
      
      // 3. Create a profile for this user
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: studentName,
          email: tempEmail,
          role: 'student',
          is_anonymous: true
        });
        
      if (profileError) {
        console.warn(`[Emergency Access API] Failed to create profile: ${profileError.message}`);
        // Continue anyway - the auth user is created
      }
      
      // 4. Add the user to the room
      console.log(`[Emergency Access API] Adding ${userId} to room ${room.room_id}`);
      
      const { error: membershipError } = await supabaseAdmin
        .from('room_memberships')
        .insert({
          room_id: room.room_id,
          student_id: userId
        });
        
      if (membershipError) {
        console.error(`[Emergency Access API] Failed to add to room: ${membershipError.message}`);
        return new Response(null, {
          status: 302,
          headers: {
            'Location': `/join-room?code=${roomCode}&error=Failed+to+add+to+room`
          }
        });
      }
      
      // 5. Create a session - handle different Supabase API versions
      let session;
      let sessionError;
      
      try {
        // @ts-expect-error - Handle Supabase API differences
        const authFn = supabaseAdmin.auth.admin.signInWithUserId || supabaseAdmin.auth.admin.createSession;
        
        if (!authFn) {
          throw new Error('No compatible session creation method available');
        }
        
        // Try different argument styles
        let result;
        try {
          // Try signInWithUserId
          result = await authFn(userId, {
            expiresIn: 604800 // 7 days in seconds
          });
        } catch {
          // Try createSession
          result = await authFn({
            user_id: userId,
            expires_in: 604800 // 7 days in seconds
          });
        }
        
        session = result.data;
        sessionError = result.error;
      } catch (error) {
        console.error('[Emergency Access API] Error creating session:', error);
        sessionError = error;
      }
      
      if (sessionError || !session?.session) {
        console.error(`[Emergency Access API] Failed to create session: ${sessionError?.message}`);
        return new Response(null, {
          status: 302,
          headers: {
            'Location': `/join-room?code=${roomCode}&error=Failed+to+create+session`
          }
        });
      }
      
      console.log(`[Emergency Access API] Successfully created emergency access for ${studentName}`);
      
      // 6. Redirect to chat page with the room ID and set cookies
      const response = new Response(null, {
        status: 302,
        headers: {
          'Location': `/chat/${room.room_id}?emergency=true&uid=${userId}`
        }
      });
      
      // Set all possible auth cookies to maximize chances of success
      try {
        // Extract URL components for cookie name
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const projectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : 'sb';
        const cookiePrefix = `sb-${projectRef}`;
        
        // Set various cookie formats
        const headers = response.headers;
        const cookieOptions = 'Path=/; Max-Age=604800; SameSite=Lax';
        
        headers.append('Set-Cookie', 
          `${cookiePrefix}-auth-token=${JSON.stringify(session.session)}; ${cookieOptions}`);
        headers.append('Set-Cookie', 
          `supabase-auth-token=${JSON.stringify(session.session)}; ${cookieOptions}`);
        headers.append('Set-Cookie', 
          `auth-user-id=${userId}; ${cookieOptions}`);
        headers.append('Set-Cookie', 
          `${cookiePrefix}-auth-event=${JSON.stringify({
            type: 'SIGNED_IN',
            session: session.session
          })}; Max-Age=100; Path=/; SameSite=Lax`);
      } catch (cookieError) {
        console.error(`[Emergency Access API] Error setting cookies: ${cookieError}`);
        // Continue anyway - the redirect will still work
      }
      
      return response;
      
    } catch (error) {
      console.error('[Emergency Access API] Fatal error:', error);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `/join-room?code=${roomCode}&error=Server+error+during+emergency+access`
        }
      });
    }
    
  } catch (error) {
    console.error('[Emergency Access API] Request processing error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}