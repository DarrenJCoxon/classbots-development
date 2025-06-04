// src/app/api/health/queue/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { memoryQueue } from '@/lib/queue/memory-queue';
import Redis from 'ioredis';

export async function GET(request: NextRequest) {
  try {
    // Get queue metrics
    const waiting = await memoryQueue.getWaitingCount();
    const active = await memoryQueue.getActiveCount();
    const completed = await memoryQueue.getCompletedCount();
    const failed = await memoryQueue.getFailedCount();
    const delayed = await memoryQueue.getDelayedCount();
    
    const queueHealth = {
      waiting,
      active,
      completed,
      failed,
      delayed
    };
    
    // Test Redis connection
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null
    });
    
    let redisStatus = 'unknown';
    try {
      await redis.ping();
      redisStatus = 'connected';
    } catch (error) {
      redisStatus = 'disconnected';
    } finally {
      redis.disconnect();
    }
    
    const status = {
      service: 'memory-queue',
      status: redisStatus === 'connected' && queueHealth.waiting < 1000 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      queue: {
        ...queueHealth,
        redis: redisStatus
      },
      thresholds: {
        maxWaiting: 1000,
        maxActive: 50,
        maxDelayed: 500
      }
    };
    
    const httpStatus = status.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(status, { status: httpStatus });
  } catch (error) {
    console.error('[Queue Health] Error:', error);
    return NextResponse.json({
      service: 'memory-queue',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}