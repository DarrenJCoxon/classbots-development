// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const codeVerifier = searchParams.get('code_verifier');

  if (code) {
    const supabase = await createServerSupabaseClient();
    let authResult;
    
    // Check if code_verifier is provided (PKCE flow)
    // Handle API compatibility issues between Supabase versions
    try {
      if (codeVerifier) {
        // Newer Supabase versions accept the code verifier as an option
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        authResult = await (supabase.auth as any).exchangeCodeForSession(code, { 
          codeVerifier: codeVerifier 
        });
      } else {
        authResult = await supabase.auth.exchangeCodeForSession(code);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // If above fails, try the older method
      authResult = await supabase.auth.exchangeCodeForSession(code);
    }
    
    const { error } = authResult;
    
    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/auth', origin));
    }
    
    // Get user data to determine redirect
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      console.log(`[Auth Callback] User authenticated: ${user.id}`);
      console.log(`[Auth Callback] User metadata:`, user.user_metadata);
      
      // Wait for profile to be created by trigger
      // This delay might still be needed if your trigger isn't instant
      await new Promise(resolve => setTimeout(resolve, 500)); 
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      // Get redirect URL from query params or use role-based default
      const redirectToParam = searchParams.get('redirect');
      let redirectTarget = '';
      
      // First, check safe redirect parameter
      if (redirectToParam && (redirectToParam.startsWith('/') || redirectToParam.startsWith(origin))) {
        try {
            const finalRedirectUrl = redirectToParam.startsWith('/') 
                                    ? new URL(redirectToParam, origin) 
                                    : new URL(redirectToParam);

            if (finalRedirectUrl.origin === origin) {
                console.log(`[Auth Callback] Will redirect to specified param: ${finalRedirectUrl.toString()}`);
                redirectTarget = finalRedirectUrl.toString();
            }
        } catch (e) {
            console.warn(`[Auth Callback] Error parsing redirect param: ${redirectToParam}`, e);
        }
      }
      
      // If no redirect param or it wasn't valid, determine by role
      if (!redirectTarget) {
        // Check profile role first
        const profileRole = profile?.role;
        
        // If profile has no role or profile error, check user metadata
        const metadataRole = user.user_metadata?.role;
        
        console.log(`[Auth Callback] Profile role: "${profileRole}", Metadata role: "${metadataRole}"`);
        
        // Always ensure profile existence with admin client
        const supabaseAdmin = createAdminClient();
        
        // If profile error or missing role, attempt to repair using metadata
        if (profileError || !profileRole) {
          if (metadataRole) {
            try {
              // Create/update profile based on metadata - add essential fields
              const email = user.email || `${user.id}@example.com`;
              console.log(`[Auth Callback] Repairing profile for user ${user.id}, email ${email}, role ${metadataRole}`);
              
              // For teachers especially, ensure they have a valid profile
              await supabaseAdmin.from('profiles').upsert({
                user_id: user.id,
                email: email,  // Email is marked NOT NULL in the schema, must provide it
                role: metadataRole,
                full_name: user.user_metadata?.full_name || 'User',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id'
              });
              console.log(`[Auth Callback] Fixed profile for user ${user.id} with role ${metadataRole}`);
            } catch (fixError) {
              console.error('[Auth Callback] Failed to fix profile:', fixError);
            }
          }
        }
        
        // Determine final redirect based on role (with fallbacks)
        const effectiveRole = profileRole || metadataRole;
        
        if (effectiveRole === 'teacher') {
          redirectTarget = `/teacher-dashboard?_t=${Date.now()}`;
          console.log('[Auth Callback] Redirecting teacher to dashboard');
        } else if (effectiveRole === 'student') {
          redirectTarget = `/student/dashboard?_t=${Date.now()}`;
          console.log('[Auth Callback] Redirecting student to dashboard');
        } else {
          // No role found anywhere, default to home
          redirectTarget = '/';
          console.warn(`[Auth Callback] No role found for user ${user.id}. Redirecting to home.`);
        }
      }
      
      // Final redirect
      return NextResponse.redirect(new URL(redirectTarget, origin));
    } else {
      console.log('[Auth Callback] No user found after exchanging code. Redirecting to /auth.');
      return NextResponse.redirect(new URL('/auth', origin));
    }
  }

  console.log('[Auth Callback] No code found in request. Redirecting to /.');
  // Default redirect if no code or other issues
  return NextResponse.redirect(new URL('/', origin));
}