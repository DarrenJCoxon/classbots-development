import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withRateLimit, RateLimits } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

// Wrap the handler with rate limiting
export const GET = withRateLimit(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const check = searchParams.get('check');

      // Show rate limit info
      if (check === 'ratelimit') {
        return NextResponse.json({ 
          status: 'ok',
          message: 'Rate limiting is active',
          limits: {
            strict: '10 requests per minute',
            standard: '100 requests per minute',
            relaxed: '300 requests per minute',
            chat: '60 messages per minute',
            upload: '10 uploads per hour'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Regular health check logic
      const supabase = await createServerSupabaseClient();
      
      const { error } = await supabase
        .from('schools')
        .select('count')
        .limit(1);

      if (error) {
        return NextResponse.json({ 
          status: 'error', 
          message: 'Database connection failed',
          error: error.message,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }

      return NextResponse.json({ 
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  },
  RateLimits.standard // Use standard rate limit (100/min)
);