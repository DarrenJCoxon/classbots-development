#!/usr/bin/env node
/**
 * Standalone worker process for memory queue processing
 * Run this as a separate process: node dist/lib/queue/worker.js
 * Or with tsx: npx tsx src/lib/queue/worker.ts
 */

import { startMemoryWorker } from './memory-worker';

console.log('[Worker] Starting memory queue worker...');
console.log('[Worker] Environment:', process.env.NODE_ENV || 'production');
console.log('[Worker] Redis Host:', process.env.REDIS_HOST || 'localhost');
console.log('[Worker] Concurrency:', process.env.MEMORY_WORKER_CONCURRENCY || '10');

// Start the worker
startMemoryWorker();

// Health check endpoint (optional)
if (process.env.WORKER_HEALTH_PORT) {
  const http = require('http');
  const port = parseInt(process.env.WORKER_HEALTH_PORT);
  
  http.createServer(async (req: any, res: any) => {
    if (req.url === '/health') {
      try {
        const { getQueueMetrics } = require('./memory-queue');
        const metrics = await getQueueMetrics();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', metrics }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'unhealthy', error: String(error) }));
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }).listen(port, () => {
    console.log(`[Worker] Health check server listening on port ${port}`);
  });
}