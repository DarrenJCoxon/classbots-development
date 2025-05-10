// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/auth', request.url));
    }
    
    // Get user data to determine redirect
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Wait for profile to be created by trigger
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      // Get redirect URL from query params or use role-based default
      const redirectTo = searchParams.get('redirect');
      
      if (redirectTo) {
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
      
      // Role-based redirect
      if (profile?.role === 'teacher') {
        return NextResponse.redirect(new URL('/teacher-dashboard', request.url));
      } else if (profile?.role === 'student') {
        return NextResponse.redirect(new URL('/student', request.url));
      }
    }
  }

  // Default redirect if no specific route
  return NextResponse.redirect(new URL('/', request.url));
}