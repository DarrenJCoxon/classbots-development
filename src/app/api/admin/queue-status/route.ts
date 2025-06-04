import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getQueueMetrics, isQueueHealthy } from '@/lib/queue/memory-queue';

export const dynamic = 'force-dynamic';

// GET: Get queue metrics and health status
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is a teacher (admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Get queue metrics
    const [metrics, isHealthy] = await Promise.all([
      getQueueMetrics(),
      isQueueHealthy()
    ]);

    // Calculate additional stats
    const processingRate = metrics.completed > 0 ? 
      (metrics.completed / (metrics.completed + metrics.failed)) * 100 : 0;

    return NextResponse.json({
      healthy: isHealthy,
      metrics: {
        ...metrics,
        processingRate: processingRate.toFixed(2),
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || '6379',
        connected: isHealthy
      },
      worker: {
        concurrency: process.env.MEMORY_WORKER_CONCURRENCY || '10',
        environment: process.env.NODE_ENV
      }
    });

  } catch (error) {
    console.error('Queue status error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get queue status',
        healthy: false
      },
      { status: 500 }
    );
  }
}