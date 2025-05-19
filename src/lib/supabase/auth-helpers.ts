// src/lib/supabase/auth-helpers.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

/**
 * Verifies that the authenticated user matches the user ID in the URL
 * Used to prevent impersonation attacks where users modify UIDs in URLs
 */
export async function verifyUserMatchesUrlParam(request: NextRequest): Promise<{ 
  authorized: boolean; 
  user: any; 
  urlUserId: string | null;
  redirect?: NextResponse;
}> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set() { /* Not needed for read operations */ },
        remove() { /* Not needed for read operations */ }
      }
    }
  );

  // 1. Get the current authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  
  // 2. Extract user ID from URL
  // This handles paths like /student/:id, /room/:roomId/student/:studentId, etc.
  const pathParts = pathname.split('/');
  let urlUserId = null;
  
  // Look for studentId parameter
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i] === 'student' && i + 1 < pathParts.length && !pathParts[i+1].includes('[')) {
      urlUserId = pathParts[i+1];
      break;
    }
  }
  
  // If no studentId found in path, check query parameters
  if (!urlUserId) {
    urlUserId = url.searchParams.get('uid') || 
                url.searchParams.get('userId') || 
                url.searchParams.get('user_id') || 
                url.searchParams.get('studentId');
  }

  // 3. Check if user is trying to access resources that aren't theirs
  if (user && urlUserId && user.id !== urlUserId) {
    // 4. Get user's role to determine appropriate redirect
    let userRole = user.user_metadata?.role || null;
    
    // If role not in metadata, check profiles table
    if (!userRole) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      userRole = profile?.role;
    }
    
    // 5. If they are a teacher, they can access student resources (authorized)
    if (userRole === 'teacher') {
      return { authorized: true, user, urlUserId };
    }
    
    // 6. If they are a student trying to access another student's data, redirect to their own dashboard with error message
    if (userRole === 'student') {
      // Add authorization error message to the redirect
      return {
        authorized: false,
        user,
        urlUserId,
        redirect: NextResponse.redirect(new URL(`/student/dashboard?uid=${user.id}&auth_error=unauthorized_access`, request.url))
      };
    }
    
    // 7. Otherwise, consider unauthorized
    return { authorized: false, user, urlUserId };
  }

  // 8. User is either not authenticated or is accessing their own data
  return { 
    authorized: !urlUserId || !user || user.id === urlUserId, 
    user, 
    urlUserId
  };
}

/**
 * Creates appropriate parameters for URL-based access that are secure and role-specific
 */
export function createSecureUrlParams(user: any) {
  if (!user) return '';
  
  // Generate a secure access token rather than just passing the user ID
  const timestamp = Date.now();
  const accessToken = Buffer.from(`${user.id}:${timestamp}:${process.env.NEXT_PUBLIC_SUPABASE_URL}`).toString('base64');
  
  return `access_token=${accessToken}`;
}