// src/app/api/debug-cache/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/utils/cache';
import { createSuccessResponse, createErrorResponse, ErrorCodes } from '@/lib/utils/api-responses';

export async function GET(request: NextRequest) {
  try {
    // Check for admin key in production
    const adminKey = request.headers.get('x-admin-key');
    if (process.env.NODE_ENV === 'production' && adminKey !== process.env.ADMIN_SECRET_KEY) {
      return createErrorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    const stats = cache.getStats();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    let result: any = { stats };

    if (action === 'clear') {
      cache.clear();
      result = { 
        ...result, 
        message: 'Cache cleared successfully',
        statsAfterClear: cache.getStats()
      };
    } else if (action === 'cleanup') {
      const cleanedCount = cache.cleanup();
      result = { 
        ...result, 
        message: `Cleaned up ${cleanedCount} expired entries`,
        statsAfterCleanup: cache.getStats()
      };
    }

    return createSuccessResponse(result);
  } catch (error) {
    console.error('[Debug Cache] Error:', error);
    return createErrorResponse('Failed to get cache stats', 500, ErrorCodes.DATABASE_ERROR);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for admin key in production
    const adminKey = request.headers.get('x-admin-key');
    if (process.env.NODE_ENV === 'production' && adminKey !== process.env.ADMIN_SECRET_KEY) {
      return createErrorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    const body = await request.json();
    const { action, tag, key } = body;

    let result: any = {};

    if (action === 'invalidate-tag' && tag) {
      const count = cache.invalidateByTag(tag);
      result = { 
        message: `Invalidated ${count} entries with tag: ${tag}`,
        invalidatedCount: count
      };
    } else if (action === 'invalidate-key' && key) {
      const success = cache.invalidate(key);
      result = { 
        message: success ? `Invalidated key: ${key}` : `Key not found: ${key}`,
        success
      };
    } else {
      return createErrorResponse('Invalid action or missing parameters', 400, ErrorCodes.VALIDATION_ERROR);
    }

    result.stats = cache.getStats();
    return createSuccessResponse(result);
  } catch (error) {
    console.error('[Debug Cache] Error:', error);
    return createErrorResponse('Failed to perform cache operation', 500, ErrorCodes.DATABASE_ERROR);
  }
}