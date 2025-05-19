// middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Print full URL for debugging
  console.log(`[Middleware] Processing request: ${request.url}`);
  
  // HIGHEST PRIORITY: Before anything else, check if teacher is trying to access student dashboard
  // This is a blanket redirect regardless of how they got there
  try {
    // Skip this check for static assets and API routes
    if (!pathname.startsWith('/_next') && 
        !pathname.startsWith('/api') && 
        !pathname.includes('favicon.ico')) {
      
      // Create the client to check user details
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set() { /* Not needed */ },
            remove() { /* Not needed */ }
          }
        }
      );
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // If we have a user and they're trying to access the student dashboard
      if (user && pathname.startsWith('/student/dashboard')) {
        console.log(`[Middleware] User ${user.id} trying to access ${pathname} - checking role`);
        
        // First check if we can directly detect they are a teacher from metadata
        if (user.user_metadata?.role === 'teacher') {
          console.log(`[Middleware] Teacher detected from metadata, redirecting away from student dashboard`);
          return NextResponse.redirect(new URL('/teacher-dashboard', request.url));
        }
        
        // If not, check their profile as well
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.role === 'teacher') {
          console.log(`[Middleware] Teacher detected from profile, redirecting away from student dashboard`);
          return NextResponse.redirect(new URL('/teacher-dashboard', request.url));
        }
      }
    }
  } catch (error) {
    console.error('[Middleware] Error in teacher detection check:', error);
    // Continue processing if there's an error
  }
  
  // For normal route protection and dashboard access
  try {
    // Check for login/auth routes that shouldn't redirect
    const isAuthPage = pathname === '/auth' || pathname.startsWith('/auth/');
    const isHomePage = pathname === '/';
    const isPublicRoute = isAuthPage || isHomePage || pathname === '/student-login';
    
    // Check for timestamp parameter indicating a fresh redirect
    const hasTimestamp = url.searchParams.has('_t');
    
    // If it's a direct redirect from auth, just continue
    if (hasTimestamp) {
      console.log(`[Middleware] Allowing timestamp redirect to ${pathname}`);
      return NextResponse.next();
    }
    
    // For non-public routes, check authentication
    if (!isPublicRoute) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set() { /* Not needed */ },
            remove() { /* Not needed */ }
          }
        }
      );
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Not authenticated, redirect to auth
        console.log(`[Middleware] User not authenticated, redirecting to /auth from ${pathname}`);
        return NextResponse.redirect(new URL('/auth', request.url));
      }
    }
  } catch (error) {
    console.error('[Middleware] Error in route protection:', error);
    // Continue to session update
  }
  
  // Update session as usual for all routes
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Make sure to include API routes for auth session to be available everywhere
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/(.*)'
  ],
};