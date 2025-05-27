// src/lib/rate-limiter/index.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter
 * For production with multiple servers, use Redis instead
 */

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
  skipAuth?: boolean; // Skip rate limiting for authenticated users
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store rate limit data in memory
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Default key generator - uses IP address or user ID
 */
async function defaultKeyGenerator(req: NextRequest): Promise<string> {
  // Try to get IP from various headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  // For authenticated endpoints, use user ID if available
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    // In a real implementation, decode the JWT to get user ID
    // For now, use a hash of the auth header
    return `auth:${Buffer.from(authHeader).toString('base64').substring(0, 16)}`;
  }
  
  return `ip:${ip}`;
}

/**
 * Rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    skipAuth = false,
    keyGenerator = defaultKeyGenerator
  } = config;

  return async function rateLimiter(req: NextRequest): Promise<NextResponse | null> {
    try {
      // Skip rate limiting for authenticated users if configured
      if (skipAuth && req.headers.get('authorization')) {
        return null; // Continue to the route handler
      }

      // Generate rate limit key
      const key = typeof keyGenerator === 'function' 
        ? await keyGenerator(req)
        : await defaultKeyGenerator(req);

      const now = Date.now();
      const windowStart = now - windowMs;

      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);
      
      if (!entry || entry.resetTime < now) {
        // Create new entry
        entry = {
          count: 1,
          resetTime: now + windowMs
        };
        rateLimitStore.set(key, entry);
      } else {
        // Increment count
        entry.count++;
      }

      // Check if limit exceeded
      if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        
        return NextResponse.json(
          {
            error: message,
            retryAfter,
            limit: maxRequests,
            remaining: 0,
            reset: new Date(entry.resetTime).toISOString()
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': entry.resetTime.toString(),
              'Retry-After': retryAfter.toString()
            }
          }
        );
      }

      // Add rate limit headers to help clients
      const remaining = maxRequests - entry.count;
      
      // Return null to continue to the route handler
      // The headers will be added by the route wrapper
      return null;
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, allow the request through
      return null;
    }
  };
}

/**
 * Common rate limit configurations
 */
export const RateLimits = {
  // Strict: 10 requests per minute (for auth endpoints)
  strict: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many authentication attempts. Please try again in a minute.'
  }),
  
  // Standard: 100 requests per minute (for API endpoints)
  standard: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Rate limit exceeded. Please slow down your requests.'
  }),
  
  // Relaxed: 300 requests per minute (for read-heavy endpoints)
  relaxed: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300,
    message: 'Too many requests. Please try again shortly.'
  }),
  
  // Chat: 60 messages per minute per user
  chat: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    message: 'Sending messages too quickly. Please slow down.'
  }),
  
  // Upload: 10 uploads per hour
  upload: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Upload limit reached. Please try again later.'
  })
};

/**
 * Helper to wrap route handlers with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  rateLimiter: ReturnType<typeof createRateLimiter>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // Check rate limit
    const rateLimitResponse = await rateLimiter(req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // Call the original handler
    const response = await handler(req, context);
    
    // Add rate limit headers to successful responses
    const key = await defaultKeyGenerator(req);
    const entry = rateLimitStore.get(key);
    if (entry) {
      const remaining = Math.max(0, 100 - entry.count); // Adjust based on limit
      response.headers.set('X-RateLimit-Limit', '100');
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', entry.resetTime.toString());
    }
    
    return response;
  };
}