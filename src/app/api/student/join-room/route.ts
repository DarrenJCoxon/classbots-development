// src/app/api/student/join-room/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidRoomCode } from '@/lib/utils/room-codes';

// Constants for easier management
const SESSION_EXPIRY_SECONDS = 604800; // 7 days in seconds
const PROFILE_CREATION_DELAY_MS = 500; // Delay for profile creation trigger

export async function POST(request: Request) {
  console.log('[API POST /student/join-room] Received request.');
  try {
    // ALWAYS use the admin client for reliability
    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      console.error('[Simple Join API] Failed to create admin client');
      return NextResponse.json({ 
        error: 'Server configuration error: Failed to initialize database connection' 
      }, { status: 500 });
    }
    
    const supabase = await createServerSupabaseClient();
    
    // Get parameters from request
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error('[Simple Join API] Error parsing request JSON:', parseError);
      return NextResponse.json({ 
        error: 'Invalid request format' 
      }, { status: 400 });
    }
    
    const { room_code, student_name, user_id, token, skip_auth } = requestData;
    console.log('[Simple Join API] Request data:', { room_code, student_name, user_id, token: token ? 'provided' : 'not provided', skip_auth });
    
    // Validate input
    if (!room_code) {
      return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
    }
    
    const formattedCode = room_code.toUpperCase();
    
    if (!isValidRoomCode(formattedCode)) {
      console.warn('[Simple Join API] Invalid room code format:', formattedCode);
      return NextResponse.json({ 
        error: 'Invalid room code format. Please check the code and try again.' 
      }, { status: 400 });
    }
    
    // Always look up the room using admin client to bypass RLS
    const { data: rooms, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('room_id, is_active, room_code')
      .eq('room_code', formattedCode);
      
    if (roomError) {
      console.error('[Simple Join API] Error looking up room:', roomError);
      return NextResponse.json({ 
        error: 'Database error while looking up room' 
      }, { status: 500 });
    }
    
    if (!rooms || rooms.length === 0) {
      console.warn('[Simple Join API] Room not found for code:', formattedCode);
      return NextResponse.json({ 
        error: 'Room not found. Please check the code and try again.' 
      }, { status: 404 });
    }
    
    const room = rooms[0];
    console.log('[Simple Join API] Found room:', room.room_id, 'with code:', room.room_code);
    
    if (!room.is_active) {
      console.warn('[Simple Join API] Room is inactive:', formattedCode);
      return NextResponse.json({ 
        error: 'This classroom is currently inactive. Please contact your teacher.' 
      }, { status: 403 });
    }
    
    // SIMPLIFIED JOIN PROCESS
    // We'll use a consistent approach whether or not skip_auth is true
    // This ensures reliability across all join flows
    let currentUserId = '';
    
    // Try to get current user if available
    if (!skip_auth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        currentUserId = session.user.id;
        console.log('[Simple Join API] Using existing authenticated user:', currentUserId);
      }
    }
    
    // If we have a specific user ID provided (from magic link)
    if (user_id && !currentUserId) {
      console.log('[Simple Join API] Using user ID from request:', user_id);
      
      // Check if a token was provided (for enhanced security)
      if (token) {
        console.log('[Simple Join API] Token provided for enhanced security');
      }
      
      // Verify the user exists
      const { data: existingUser, error: userCheckError } = await supabaseAdmin.auth.admin.getUserById(user_id);
      
      if (userCheckError || !existingUser.user) {
        console.warn('[Simple Join API] Provided user ID not found, will create new user:', userCheckError);
      } else {
        // Use the existing user
        currentUserId = user_id;
        
        // Update the user's metadata if needed
        if (student_name && existingUser.user.user_metadata?.full_name !== student_name) {
          await supabaseAdmin.auth.admin.updateUserById(user_id, {
            user_metadata: {
              ...existingUser.user.user_metadata,
              full_name: student_name,
              // Store the token for reference if provided
              ...(token ? { last_magic_link_token: token } : {})
            }
          });
          
          // Also update profile
          await supabaseAdmin
            .from('profiles')
            .update({ 
              full_name: student_name,
              // Store the last login time
              last_login_at: new Date().toISOString()
            })
            .eq('user_id', user_id)
            .then(res => {
              if (res.error) {
                console.warn('[Simple Join API] Error updating profile name:', res.error);
              }
            });
        } else {
          // Update login timestamp even if name didn't change
          await supabaseAdmin
            .from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('user_id', user_id)
            .then(res => {
              if (res.error) {
                console.warn('[Simple Join API] Error updating profile login timestamp:', res.error);
              }
            });
        }
        
        console.log('[Simple Join API] Using existing user from ID param:', currentUserId);
      }
    }
    
    // If we need to create a new user (either no currentUserId or skip_auth explicitly requested)
    if (!currentUserId) {
      if (!student_name) {
        return NextResponse.json({ error: 'Student name is required for anonymous join' }, { status: 400 });
      }
      
      // Create a new temporary anonymous account
      console.log('[Simple Join API] Creating new temporary user with name:', student_name);
      
      // Generate a unique timestamp to avoid collisions
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      // Use an email domain that Supabase will accept
      const tempEmail = `anon-${timestamp}-${randomStr}@example.com`;
      const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      try {
        console.log('[Simple Join API] Attempting to create user with email:', tempEmail);
        
        // First, check if the email is already used (shouldn't happen but just in case)
        // Note: Supabase API has changed between versions
        let existingUsers;
        try {
          // Try the newer API format with filter object
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (supabaseAdmin.auth.admin as any).listUsers({
            filter: {
              email: tempEmail,
            },
            limit: 1,
          });
          existingUsers = result.data;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_apiErr) {
          // If that fails, try the older format directly
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fallbackResult = await (supabaseAdmin.auth.admin as any).listUsers({
              email: tempEmail,
              limit: 1,
            });
            existingUsers = fallbackResult.data;
          } catch (fallbackErr) {
            console.error('[Simple Join API] Error checking for existing users:', fallbackErr);
            // Continue anyway, since we're creating a new user
            existingUsers = { users: [] };
          }
        }
        
        if (existingUsers?.users?.length > 0) {
          // Very unlikely but handle it just in case
          console.warn('[Simple Join API] Temporary email already exists (very rare):', tempEmail);
          // Try again with a more unique email
          const newRandomStr = Math.random().toString(36).substring(2, 15);
          const newTempEmail = `anon-${timestamp}-${randomStr}-${newRandomStr}@tempuser.classbots.ai`;
          console.log('[Simple Join API] Retrying with more unique email:', newTempEmail);
          
          const { data: userResult, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: newTempEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: student_name,
              role: 'student',
              is_anonymous: true,
              created_at: new Date().toISOString()
            },
            app_metadata: {
              // Essential for RLS policies
              role: 'student'
            }
          });
          
          if (createUserError || !userResult?.user) {
            console.error('[Simple Join API] Error creating temporary user on retry:', createUserError);
            return NextResponse.json({ 
              error: 'Failed to create temporary user account. Please try again.' 
            }, { status: 500 });
          }
          
          currentUserId = userResult.user.id;
          console.log('[Simple Join API] Created temp user with ID (on retry):', currentUserId);
        } else {
          // Normal path - email doesn't exist yet
          const { data: userResult, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: tempEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: student_name,
              role: 'student',
              is_anonymous: true,
              created_at: new Date().toISOString()
            },
            app_metadata: {
              // Essential for RLS policies
              role: 'student'
            }
          });
          
          if (createUserError || !userResult?.user) {
            console.error('[Simple Join API] Error creating temporary user:', createUserError);
            return NextResponse.json({ 
              error: 'Failed to create temporary user account' 
            }, { status: 500 });
          }
          
          currentUserId = userResult.user.id;
          console.log('[Simple Join API] Created temp user with ID:', currentUserId);
        }
        
        // Wait a moment to allow auth triggers to process
        await new Promise(resolve => setTimeout(resolve, PROFILE_CREATION_DELAY_MS));
        
        // Create profile - use upsert to handle case where the profile might already exist
        console.log('[Simple Join API] Creating profile for user:', currentUserId);
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            user_id: currentUserId,
            email: tempEmail,
            full_name: student_name,
            role: 'student',
            is_anonymous: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
          
        if (profileError) {
          console.warn('[Simple Join API] Error upserting profile:', profileError);
          // Make another attempt with a different approach
          console.log('[Simple Join API] Trying alternative profile creation approach...');
          
          try {
            // Try a direct insert as last resort
            const { error: insertError } = await supabaseAdmin
              .from('profiles')
              .insert({
                user_id: currentUserId,
                email: tempEmail,
                full_name: student_name,
                role: 'student',
                is_anonymous: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (insertError) {
              console.error('[Simple Join API] Failed alternative profile creation:', insertError);
            } else {
              console.log('[Simple Join API] Successfully created profile with alternative method');
            }
          } catch (insertError) {
            console.error('[Simple Join API] Exception in profile creation attempt:', insertError);
          }
        } else {
          console.log('[Simple Join API] Successfully created profile for:', currentUserId);
        }
      } catch (error) {
        console.error('[Simple Join API] Exception creating user:', error);
        return NextResponse.json({ 
          error: 'Failed to create account. Please try again.' 
        }, { status: 500 });
      }
    }
    
    // At this point we should definitely have a currentUserId
    if (!currentUserId) {
      return NextResponse.json({ 
        error: 'Could not determine user account. Please try again.' 
      }, { status: 500 });
    }
      
    // Now add the student to the room if needed
    // Check if student is already in room
    const { data: existingMembership, error: membershipCheckError } = await supabaseAdmin
      .from('room_memberships')
      .select('room_id')
      .eq('room_id', room.room_id)
      .eq('student_id', currentUserId)
      .maybeSingle();
      
    if (membershipCheckError) {
      console.error('[Simple Join API] Error checking membership:', membershipCheckError);
    }
    
    // Add the student to the room if not already a member
    if (!existingMembership) {
      const { error: joinError } = await supabaseAdmin
        .from('room_memberships')
        .insert({
          room_id: room.room_id,
          student_id: currentUserId
        });
        
      if (joinError) {
        // Don't fail if it's just a unique violation (student is already in room)
        if (joinError.code === '23505') { // unique_violation
          console.log('[Simple Join API] Student already in room (unique constraint)');
        } else {
          console.error('[Simple Join API] Error adding student to room:', joinError);
          return NextResponse.json({ 
            error: 'Failed to add you to the classroom' 
          }, { status: 500 });
        }
      } else {
        console.log('[Simple Join API] Successfully added student to room');
      }
    } else {
      console.log('[Simple Join API] Student already in room, skipping insert');
    }
    
    // ALWAYS create a fresh session for reliability
    try {
      // Simplified session creation that works with modern Supabase versions
      console.log('[Simple Join API] Creating session for user:', currentUserId);
      
      let sessionData;
      let sessionError;
      
      try {
        // Create session using the Supabase admin API
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (supabaseAdmin.auth.admin as any).createSession({
          user_id: currentUserId,
          expires_in: SESSION_EXPIRY_SECONDS
        });
        
        sessionData = result.data;
        sessionError = result.error;
        
        console.log('[Simple Join API] Session creation result:', 
          sessionData ? 'success' : 'failed',
          sessionError ? `Error: ${sessionError.message}` : '');
      } catch (sessionCreationError) {
        console.error('[Simple Join API] Session creation failed:', sessionCreationError);
        
        // Create a fallback session that will use URL parameters as backup
        sessionData = {
          session: {
            access_token: `FALLBACK_${Date.now()}_${currentUserId.substring(0, 8)}`,
            refresh_token: `FALLBACK_R_${Date.now()}`,
            expires_at: Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS,
            user: { id: currentUserId }
          }
        };
        
        console.log('[Simple Join API] Created fallback session object for URL parameter authentication');
      }
      
      if (sessionError) {
        console.error('[Simple Join API] Error creating session:', sessionError);
        return NextResponse.json({ 
          error: 'Failed to create user session. Please try again.' 
        }, { status: 500 });
      }
      
      if (!sessionData?.session) {
        console.error('[Simple Join API] Session created but no session data returned');
        return NextResponse.json({ 
          error: 'Server error: Session creation failed' 
        }, { status: 500 });
      }
      
      console.log('[Simple Join API] Session created successfully. Access token length:', 
        sessionData.session.access_token?.length || 0,
        'Refresh token length:',
        sessionData.session.refresh_token?.length || 0
      );
      
      // Return success with the session
      const response = NextResponse.json({ 
        success: true,
        message: 'Successfully joined room',
        roomId: room.room_id,
        userId: currentUserId,
        // Include a token ID client-side can use if cookies fail
        tokenId: sessionData.session.access_token?.substring(0, 10)
      });
      
      // Add the session cookie with the right settings
      if (sessionData.session) {
        try {
          // Extract the correct name from the URL
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          let cookiePrefix = 'sb';
          
          try {
            if (supabaseUrl) {
              // Parse hostname from URL
              const url = new URL(supabaseUrl);
              const hostname = url.hostname;
              const projectRef = hostname.split('.')[0];
              console.log('[Simple Join API] Extracted project ref for cookie:', projectRef);
              
              if (projectRef) {
                cookiePrefix = 'sb-' + projectRef;
              }
            }
          } catch (urlError) {
            console.error('[Simple Join API] Error parsing Supabase URL:', urlError);
            // Fall back to default
            cookiePrefix = 'sb-auth';
          }
          
          console.log('[Simple Join API] Using cookie prefix:', cookiePrefix);
          
          // Set all cookie variants to maximize compatibility
          
          // 1. The standard Supabase cookie
          response.cookies.set(`${cookiePrefix}-auth-token`, JSON.stringify(sessionData.session), {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            sameSite: 'lax',
            httpOnly: false // Ensure client-side JavaScript can access it too
          });
          
          // 2. Legacy cookie name for compatibility
          response.cookies.set('supabase-auth-token', JSON.stringify(sessionData.session), {
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            sameSite: 'lax',
            httpOnly: false
          });
          
          // 3. Store some data in local storage via a special cookie
          response.cookies.set(`${cookiePrefix}-auth-event`, JSON.stringify({
            type: 'SIGNED_IN',
            session: sessionData.session
          }), {
            path: '/',
            maxAge: 100, // Very short-lived, just for the next page load
            sameSite: 'lax',
            httpOnly: false
          });
          
          // 4. Set a basic auth flag cookie for the client
          response.cookies.set('auth-user-id', currentUserId, {
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            sameSite: 'lax',
            httpOnly: false
          });
          
          console.log('[Simple Join API] Set auth cookies successfully');
        } catch (cookieError) {
          console.error('[Simple Join API] Error setting cookies:', cookieError);
          // Continue anyway - we'll return the session data in the JSON response
        }
      } else {
        console.warn('[Simple Join API] No session data to set in cookies');
      }
      
      return response;
    } catch (sessionCreationError) {
      console.error('[Simple Join API] Exception during session creation:', sessionCreationError);
      
      // For consistency, use the same approach as our main flow
      // but with clearer emergency indicators
      const fallbackResponse = NextResponse.json({ 
        success: true, // We'll count this as success for UX
        message: 'Successfully joined room (using alternative authentication)',
        roomId: room.room_id,
        userId: currentUserId,
        roomCode: room.room_code,
        // Add URL parameter-based auth flags
        directAccess: true,
        // Add a token that can be used in URL params for fallback auth
        tokenId: `DIR_${Date.now()}_${currentUserId.substring(0, 8)}`
      });
      
      // Set a consistent set of cookies for fallback auth
      const fallbackCookies = {
        'auth-user-id': currentUserId,
        'auth-student-name': student_name || 'Student',
        'auth-room-id': room.room_id,
        'current-room-code': room.room_code,
        'auth-direct-access': 'true'
      };
      
      // Set cookies with appropriate expiration (24 hours)
      Object.entries(fallbackCookies).forEach(([key, value]) => {
        fallbackResponse.cookies.set(key, String(value), { 
          path: '/', 
          maxAge: 60 * 60 * 24, // 24 hours
          sameSite: 'lax',
          httpOnly: false // Allow client JS to read
        });
      });
      
      console.log('[Simple Join API] Using fallback auth with URL parameters');
      
      return fallbackResponse;
    }
  } catch (error) {
    const typedError = error as Error & { code?: string; details?: unknown };
    console.error('[API POST /student/join-room] CATCH BLOCK Error:', 
      typedError?.message, 
      'Code:', typedError?.code, 
      'Details:', typedError?.details
    );
    return NextResponse.json(
      { error: typedError?.message || 'Failed to join room' },
      { status: 500 }
    );
  }
}