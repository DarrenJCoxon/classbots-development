// src/app/api/auth/student-pin-login/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    
    // Get parameters from request
    const { user_id, pin_code } = await request.json();
    
    // Validate inputs
    if (!user_id || !pin_code) {
      return NextResponse.json({ 
        error: 'Missing user_id or pin_code'
      }, { status: 400 });
    }
    
    // Verify PIN matches in profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, pin_code')
      .eq('user_id', user_id)
      .single();
      
    if (profileError || !profile) {
      console.error('Error looking up profile:', profileError);
      return NextResponse.json({ 
        error: 'User not found'
      }, { status: 404 });
    }
    
    // Verify PIN matches
    if (profile.pin_code !== pin_code) {
      return NextResponse.json({ 
        error: 'Incorrect PIN' 
      }, { status: 403 });
    }
    
    // Create a new session for the user using the admin API
    // Note: In newer Supabase versions, admin.createSession was replaced with admin.signInWithUserId
    console.log('Creating session for user_id:', user_id);
    
    // Check which method is available based on Supabase version
    // Use Record<string, unknown> instead of any for better type safety
    let sessionData: Record<string, unknown> | null = null;
    let sessionError: unknown = null;
    
    try {
      // Try the simplest direct approach first - using service key to get a direct token
      try {
        console.log('Trying service key approach first');
        
        // Get the user details first to ensure they exist
        const { data: userDetails, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
        
        if (userError || !userDetails?.user) {
          console.error('Error getting user details:', userError);
          throw new Error('User not found');
        }
        // userError is used above to check validity, so this isn't an unused variable
        
        // Don't use service role key directly in the browser
        // Instead, let's try to use an admin API to generate a token
        
        // Just get email and try to use emailLink instead
        const { email } = userDetails.user;
        if (!email) {
          throw new Error('User has no email address');
        }
        
        // Try to create a sign-in link (and use the token directly without redirecting)
        // This is more secure than exposing the service role key
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/student/dashboard`
          }
        });
        
        if (signInError || !signInData?.properties?.hashed_token) {
          throw new Error('Failed to generate login token');
        }
        
        // Use the token to sign in
        const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
          email: email,
          token: signInData.properties.hashed_token,
          type: 'magiclink'
        });
        
        if (verifyError) {
          throw new Error('Failed to verify token: ' + verifyError.message);
        }
        
        sessionData = verifyData;
        
        console.log('Created admin token session');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // error variable is caught but not used explicitly
        console.log('Direct token approach failed, trying other methods');
      }
      
      // If direct approach failed, try the standard methods
      if (!sessionData) {
        try {
          console.log('Trying alternative session creation methods');
          // @ts-expect-error - We're handling API differences at runtime
          const adminAuthFn = supabaseAdmin.auth.admin.createSession || supabaseAdmin.auth.admin.signInWithUserId;
          
          if (!adminAuthFn) {
            throw new Error('No compatible session creation method found');
          }
          
          // Try the function with both argument styles
          let result;
          try {
            // Try createSession style first
            result = await adminAuthFn({ 
              user_id: user_id,
              expires_in: 604800 // 7 days in seconds 
            });
          } catch {
            // If that fails, try signInWithUserId style
            result = await adminAuthFn(
              user_id,
              { expiresIn: 604800 } // 7 days in seconds
            );
          }
          
          sessionData = result.data;
          sessionError = result.error;
        } catch (error) {
          console.error('Error in session creation:', error);
          sessionError = error;
        }
      }
      // Try with alternative method for older versions
      // Try direct sign-in approach (if createSession is not available but we can get the user's email)
      else {
        console.log('Using direct student lookup for sign-in');
        
        // Get the student's email from the profiles and auth.users table
        const { data: userData, error: userError } = await supabaseAdmin
          .from('profiles')
          .select('user_id, email, full_name')
          .eq('user_id', user_id)
          .single();
          
        if (userError || !userData?.email) {
          console.error('Error finding student:', userError);
          
          // Try looking directly in auth.users table
          const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(user_id);
          
          if (authUserError || !authUser?.user?.email) {
            console.error('Error finding user in auth:', authUserError);
            throw new Error('Could not find user email for authentication');
          }
          
          // Use the email from auth.users
          const signInResult = await supabaseAdmin.auth.signInWithPassword({
            email: authUser.user.email,
            password: `PINLOGIN-${pin_code}`, // We don't actually know their password
          });
          
          if (signInResult.error) {
            // If password login fails, try a magic link approach
            if (typeof supabaseAdmin.auth.admin.generateLink === 'function') {
              console.log('Attempting passwordless login with magic link');
              
              const linkResult = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: authUser.user.email,
                options: {
                  redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/student/dashboard`,
                }
              });
              
              if (linkResult.data?.properties?.hashed_token) {
                const otpResult = await supabaseAdmin.auth.verifyOtp({
                  email: authUser.user.email,
                  token: linkResult.data.properties.hashed_token,
                  type: 'magiclink',
                });
                
                sessionData = otpResult.data;
                sessionError = otpResult.error;
              } else {
                throw new Error('Failed to generate magic link');
              }
            } else {
              console.error('No authentication methods available');
              throw new Error('Cannot authenticate: method not available');
            }
          } else {
            sessionData = signInResult.data;
            sessionError = signInResult.error;
          }
        } else {
          // Use the email from profiles
          console.log('Found student email, attempting to authenticate');
          
          if (typeof supabaseAdmin.auth.admin.generateLink === 'function') {
            // Passwordless auth approach
            const linkResult = await supabaseAdmin.auth.admin.generateLink({
              type: 'magiclink',
              email: userData.email,
              options: {
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/student/dashboard`,
              }
            });
            
            if (linkResult.data?.properties?.hashed_token) {
              const otpResult = await supabaseAdmin.auth.verifyOtp({
                email: userData.email,
                token: linkResult.data.properties.hashed_token,
                type: 'magiclink',
              });
              
              sessionData = otpResult.data;
              sessionError = otpResult.error;
            } else {
              throw new Error('Failed to generate magic link');
            }
          } else {
            throw new Error('No authentication methods available');
          }
        }
      }
      
      // If we got here without a session, log available methods to help with debugging
      if (!sessionData) {
        console.error('Admin auth methods not available:', 
          supabaseAdmin.auth.admin ? Object.keys(supabaseAdmin.auth.admin) : 'admin not available',
          'Auth methods:', Object.keys(supabaseAdmin.auth)
        );
        throw new Error('No compatible authentication method available');
      }
    } catch (err) {
      console.error('Session creation error:', err);
      sessionError = err;
    }
    
    if (sessionError) {
      const errorMessage = sessionError instanceof Error 
        ? sessionError.message 
        : JSON.stringify(sessionError);
        
      console.error('Error creating session:', errorMessage);
      
      return NextResponse.json({ 
        error: `Failed to create session: ${errorMessage}`,
        details: sessionError
      }, { status: 500 });
    }
    
    // Return success with cookies
    // Handle sessionData typing safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = sessionData && (sessionData as any).session ? {
      // Send a simplified version of the session back to the client for debugging
      // Don't include the actual tokens for security
      user: {
        id: user_id, // We know the user_id from input
        email: '',   // Don't need to expose email
        role: 'student'
      },
      expires_at: Math.floor(Date.now() / 1000) + 604800 // 7 days from now
    } : null;
    
    const response = NextResponse.json({ 
      success: true,
      redirect_to: '/student/dashboard', // Explicitly tell client where to redirect
      session: session
    });
    
    console.log('Standard student login successful for user:', user_id);
    
    // Check and set the session cookie
    // Note: We might have different session data structures based on the auth method used
    console.log('Session data available:', !!sessionData);
    console.log('Session object available:', !!sessionData?.session);
    
    // Add session info to response for debug
    response.headers.set('X-Session-Status', sessionData?.session ? 'available' : 'missing');
    
    if (sessionData?.session) {
      console.log('Setting cookies for session...');
      console.log('Session data keys:', Object.keys(sessionData));
      console.log('Session object keys:', Object.keys(sessionData.session));
      
      // Extract project reference from Supabase URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      let cookiePrefix = 'sb';
      
      try {
        if (supabaseUrl) {
          const url = new URL(supabaseUrl);
          const hostname = url.hostname;
          const projectRef = hostname.split('.')[0];
          
          if (projectRef) {
            cookiePrefix = 'sb-' + projectRef;
          }
        }
      } catch (urlError) {
        console.error('Error parsing Supabase URL:', urlError);
        cookiePrefix = 'sb-auth';
      }
      
      console.log(`Using cookie prefix: ${cookiePrefix}`);
      
      // Set auth token cookie
      const sessionJson = JSON.stringify(sessionData.session);
      console.log(`Session data length: ${sessionJson.length} characters`);
      
      try {
        // Set up the cookies exactly like Supabase expects them
        // Cookie names are very important and must match exactly
        response.cookies.set(`${cookiePrefix}-auth-token`, sessionJson, {
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 1 week
          sameSite: 'lax',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        });
        
        // This is the most important cookie - the client SDK looks for this one
        response.cookies.set('supabase-auth-token', sessionJson, {
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
          sameSite: 'lax',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        });
        
        // Event cookie for client-side auth state sync
        response.cookies.set(`${cookiePrefix}-auth-event`, JSON.stringify({
          type: 'SIGNED_IN',
          session: sessionData.session
        }), {
          path: '/',
          maxAge: 100, // Very short-lived
          sameSite: 'lax',
          httpOnly: false
        });
        
        // Our custom cookie to track user ID
        response.cookies.set('auth-user-id', user_id, {
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
          sameSite: 'lax',
          httpOnly: false
        });
        
        console.log('Cookies set successfully');
      } catch (cookieError) {
        console.error('Error setting cookies:', cookieError);
      }
    } else {
      console.warn('No session data available to set cookies');
    }
    
    return response;
  } catch (error) {
    console.error('Student PIN login error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to log in' },
      { status: 500 }
    );
  }
}