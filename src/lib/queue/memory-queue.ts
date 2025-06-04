import Bull from 'bull';
import Redis from 'ioredis';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Create Redis clients for Bull
const createRedisClient = () => new Redis(redisConfig);

// Memory processing queue configuration
export const memoryQueue = new Bull('memory-processing', {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: {
    removeOnComplete: {
      age: 24 * 3600, // keep completed jobs for 24 hours
      count: 1000, // keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 24 * 3600, // keep failed jobs for 24 hours
      count: 5000, // keep max 5000 failed jobs
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // initial delay of 2 seconds
    },
  },
});

// Queue event listeners for monitoring
memoryQueue.on('error', (error) => {
  console.error('[Memory Queue] Error:', error);
});

memoryQueue.on('waiting', (jobId) => {
  console.log(`[Memory Queue] Job ${jobId} is waiting`);
});

memoryQueue.on('active', (job) => {
  console.log(`[Memory Queue] Job ${job.id} is active`);
});

memoryQueue.on('completed', (job, result) => {
  console.log(`[Memory Queue] Job ${job.id} completed`);
});

memoryQueue.on('failed', (job, err) => {
  console.error(`[Memory Queue] Job ${job.id} failed:`, err);
});

memoryQueue.on('stalled', (job) => {
  console.warn(`[Memory Queue] Job ${job.id} stalled`);
});

// Queue metrics for monitoring
export async function getQueueMetrics() {
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    memoryQueue.getWaitingCount(),
    memoryQueue.getActiveCount(),
    memoryQueue.getCompletedCount(),
    memoryQueue.getFailedCount(),
    memoryQueue.getDelayedCount(),
    memoryQueue.getPausedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
    total: waiting + active + delayed + paused,
  };
}

// Graceful shutdown
export async function gracefulShutdown() {
  console.log('[Memory Queue] Shutting down gracefully...');
  await memoryQueue.close();
}

// Health check
export async function isQueueHealthy(): Promise<boolean> {
  try {
    await memoryQueue.isReady();
    return true;
  } catch (error) {
    console.error('[Memory Queue] Health check failed:', error);
    return false;
  }
}

// Job types
export interface MemoryJobData {
  userId: string;
  roomId: string;
  memory: {
    content: string;
    embedding?: number[];
    metadata?: Record<string, any>;
  };
  priority?: 'low' | 'normal' | 'high';
}

export interface MemoryJobResult {
  success: boolean;
  memoryId?: string;
  error?: string;
}