// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url); // Added origin for constructing absolute URLs
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/auth', origin)); // Use origin
    }
    
    // Get user data to determine redirect
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Wait for profile to be created by trigger
      // This delay might still be needed if your trigger isn't instant
      await new Promise(resolve => setTimeout(resolve, 500)); 
      
      const { data: profile, error: profileError } = await supabase // Added error handling for profile fetch
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error(`Error fetching profile for user ${user.id} in auth callback:`, profileError.message);
        // Fallback to home or a generic error page if profile fetch fails criticaly
        return NextResponse.redirect(new URL('/', origin));
      }
      
      // Get redirect URL from query params or use role-based default
      // Important: Ensure 'redirect' param doesn't create open redirect vulnerabilities.
      // For now, we assume it's from trusted sources like our own app.
      const redirectToParam = searchParams.get('redirect');
      
      if (redirectToParam) {
        // Basic validation for redirectToParam to prevent open redirect
        // Ensure it's a relative path or a path starting with our app's origin
        if (redirectToParam.startsWith('/') || redirectToParam.startsWith(origin)) {
            try {
                 // If redirectToParam is already absolute and matches origin, or relative, new URL() works.
                // If it's absolute but different origin, new URL() will use it as base, potentially wrong.
                // Better to construct carefully.
                const finalRedirectUrl = redirectToParam.startsWith('/') 
                                        ? new URL(redirectToParam, origin) 
                                        : new URL(redirectToParam); // Assumes it's already a valid absolute URL matching origin

                // Final check to ensure it's still within our app domain if it was absolute
                if (finalRedirectUrl.origin === origin) {
                    console.log(`[Auth Callback] Redirecting to specified param: ${finalRedirectUrl.toString()}`);
                    return NextResponse.redirect(finalRedirectUrl);
                } else {
                    console.warn(`[Auth Callback] Invalid redirect param origin: ${redirectToParam}. Defaulting.`);
                }
            } catch (e) {
                console.warn(`[Auth Callback] Error parsing redirect param: ${redirectToParam}. Defaulting.`, e);
            }
        } else {
             console.warn(`[Auth Callback] Potentially unsafe redirect param: ${redirectToParam}. Defaulting.`);
        }
      }
      
      // Role-based redirect
      if (profile?.role === 'teacher') {
        console.log('[Auth Callback] Redirecting teacher to /teacher-dashboard');
        return NextResponse.redirect(new URL('/teacher-dashboard', origin));
      } else if (profile?.role === 'student') {
        console.log('[Auth Callback] Redirecting student to /student/dashboard');
        return NextResponse.redirect(new URL('/student/dashboard', origin)); // <<< MODIFIED LINE
      } else {
        console.warn(`[Auth Callback] User ${user.id} has no role or unknown role: ${profile?.role}. Redirecting to /.`);
        return NextResponse.redirect(new URL('/', origin));
      }
    } else {
        console.log('[Auth Callback] No user found after exchanging code. Redirecting to /auth.');
        return NextResponse.redirect(new URL('/auth', origin));
    }
  }

  console.log('[Auth Callback] No code found in request. Redirecting to /.');
  // Default redirect if no code or other issues
  return NextResponse.redirect(new URL('/', origin));
}