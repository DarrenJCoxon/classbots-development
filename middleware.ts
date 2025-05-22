// middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import { verifyUserMatchesUrlParam } from '@/lib/supabase/auth-helpers';

// Rate limiting storage (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number; blockUntil?: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  api: { requests: 60, windowMs: 60 * 1000 }, // 60 requests per minute for API
  general: { requests: 120, windowMs: 60 * 1000 }, // 120 requests per minute for pages
  strict: { requests: 10, windowMs: 60 * 1000 }, // 10 requests per minute for sensitive endpoints
};

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitMap.entries()) {
      if (now > data.resetTime && (!data.blockUntil || now > data.blockUntil)) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000); // Clean every 5 minutes
}

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // RATE LIMITING - First line of defense
  if (!pathname.startsWith('/_next') && !pathname.includes('favicon.ico')) {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0]?.trim() || realIp || '127.0.0.1';
    
    const key = `${ip}:${pathname.startsWith('/api') ? 'api' : 'general'}`;
    
    // Determine rate limit based on endpoint sensitivity
    let limit = RATE_LIMITS.general;
    if (pathname.startsWith('/api')) {
      if (pathname.includes('/chat/') || 
          pathname.includes('/debug-')) {
        limit = RATE_LIMITS.strict; // Sensitive endpoints
      } else {
        limit = RATE_LIMITS.api; // Regular API endpoints (includes auth)
      }
    }
    
    const now = Date.now();
    let rateLimitData = rateLimitMap.get(key);
    
    if (!rateLimitData) {
      rateLimitData = { count: 0, resetTime: now + limit.windowMs };
      rateLimitMap.set(key, rateLimitData);
    }
    
    // Reset counter if window has expired
    if (now > rateLimitData.resetTime) {
      rateLimitData.count = 0;
      rateLimitData.resetTime = now + limit.windowMs;
      if (rateLimitData.blockUntil) delete rateLimitData.blockUntil;
    }
    
    // Check if currently blocked
    if (rateLimitData.blockUntil && now < rateLimitData.blockUntil) {
      console.warn(`[Rate Limit] Blocked request from ${ip} to ${pathname}`);
      return new NextResponse('Rate limit exceeded - temporarily blocked', { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitData.blockUntil - now) / 1000).toString(),
          'X-RateLimit-Limit': limit.requests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(rateLimitData.blockUntil / 1000).toString(),
        }
      });
    }
    
    // Check rate limit
    if (rateLimitData.count >= limit.requests) {
      // Block for 5 minutes after exceeding limit
      rateLimitData.blockUntil = now + (5 * 60 * 1000);
      console.warn(`[Rate Limit] EXCEEDED: ${ip} made ${rateLimitData.count} requests to ${pathname}, blocking for 5 minutes`);
      
      return new NextResponse('Rate limit exceeded', { 
        status: 429,
        headers: {
          'Retry-After': '300', // 5 minutes
          'X-RateLimit-Limit': limit.requests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(rateLimitData.blockUntil / 1000).toString(),
        }
      });
    }
    
    // Increment counter
    rateLimitData.count++;
    
    console.log(`[Rate Limit] ${ip} -> ${pathname}: ${rateLimitData.count}/${limit.requests}`);
  }
  
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
      
      // NEW: Check for identity mismatch: user trying to access another user's resources
      // Only check this for routes that might have studentId or userId parameters
      const studentPathPatterns = [
        '/room/', 
        '/student/'
      ];
      
      const checkIdentityMismatch = studentPathPatterns.some(pattern => pathname.includes(pattern));
      
      if (checkIdentityMismatch && user) {
        console.log(`[Middleware] Checking identity match for route: ${pathname}`);
        
        const { authorized, redirect, user: authUser, urlUserId } = await verifyUserMatchesUrlParam(request);
        
        if (!authorized && redirect) {
          console.log(`[Middleware] Unauthorized access detected: User ${authUser?.id} attempting to access ${urlUserId} via ${pathname}`);
          
          // Log this security incident for future auditing
          if (authUser && urlUserId) {
            try {
              // You could add actual security logging here in production
              console.warn(`[SECURITY WARNING] User ${authUser.id} attempted unauthorized access to ${urlUserId}`);
            } catch (logError) {
              console.error('[Middleware] Failed to log security incident:', logError);
            }
          }
          
          return redirect;
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