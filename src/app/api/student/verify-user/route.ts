// src/app/api/student/verify-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query string
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        error: 'Missing required parameter: userId is required',
        valid: false
      }, { status: 400 });
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient();

    // Verify user exists
    try {
      const { data: userCheck, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (userError || !userCheck.user) {
        console.error('[API GET /verify-user] User not found:', userId, userError);
        return NextResponse.json({ 
          error: 'User not found',
          valid: false
        }, { status: 404 });
      }

      // Check for profile existence
      // We check for profile existence, but don't use its data directly
      const { error: profileError } = await supabaseAdmin
        .from('student_profiles')
        .select('user_id, role')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.warn('[API GET /verify-user] Profile not found for user:', userId);
        
        // If user exists in auth but not profile, create profile
        if (userCheck.user.user_metadata?.full_name) {
          const { error: insertError } = await supabaseAdmin
            .from('student_profiles')
            .insert({
              user_id: userId,
              full_name: userCheck.user.user_metadata.full_name,
              email: userCheck.user.email || '',
              role: userCheck.user.user_metadata.role || 'student'
            });

          if (insertError) {
            console.error('[API GET /verify-user] Error creating profile:', insertError);
          } else {
            console.log('[API GET /verify-user] Created profile for user:', userId);
          }
        }
      }

      // User exists, check for session
      try {
        // Create a session for the user - handle different Supabase versions
        let sessionData;
        let sessionError;
        
        try {
          // Try the newer API with createSession
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (supabaseAdmin.auth.admin as any).createSession({
            user_id: userId
          });
          sessionData = result.data;
          sessionError = result.error;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (createSessionError) {
          // Fall back to older signInWithUserId API
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fallbackResult = await (supabaseAdmin.auth.admin as any).signInWithUserId(
              userId,
              { expiresIn: 604800 } // 7 days
            );
            sessionData = fallbackResult.data;
            sessionError = fallbackResult.error;
          } catch (signInError) {
            console.error('[API GET /verify-user] Both session creation methods failed:', signInError);
            sessionError = signInError;
          }
        }

        if (sessionError) {
          console.warn('[API GET /verify-user] Could not create session:', sessionError);
          // Continue anyway - we'll proceed with just the user ID
        } else if (sessionData?.session) {
          // Add session cookie
          const response = NextResponse.json({ valid: true, userId });
          
          // Set auth cookies
          const supabaseCookieName = 'sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token';
          
          response.cookies.set(supabaseCookieName, JSON.stringify(sessionData.session), {
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            sameSite: 'lax',
            httpOnly: false
          });
          
          return response;
        }
      } catch (sessionError) {
        console.error('[API GET /verify-user] Session error:', sessionError);
        // Continue without session
      }

      return NextResponse.json({ valid: true, userId });
    } catch (err) {
      console.error('[API GET /verify-user] Error checking user:', err);
      return NextResponse.json({ 
        error: 'Failed to verify user',
        valid: false
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[API GET /verify-user] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        valid: false
      },
      { status: 500 }
    );
  }
}