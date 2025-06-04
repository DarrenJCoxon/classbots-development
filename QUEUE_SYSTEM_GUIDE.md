# Memory Processing Queue System

This guide explains the robust queue system implementation for handling memory processing at scale.

## Overview

The queue system uses Bull (Redis-based queue) to handle thousands of concurrent memory processing jobs with:
- Connection pooling
- Retry logic with exponential backoff
- Priority-based processing
- Real-time monitoring
- Graceful shutdown

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   API Route │────>│ Redis Queue │────>│   Worker    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                     │
                           │                     ▼
                           │              ┌─────────────┐
                           └─────────────>│  Database   │
                                         └─────────────┘
```

## Setup Instructions

### 1. Start Redis

```bash
# Using Docker (recommended)
npm run redis:start

# Or manually with Docker
docker run -d -p 6379:6379 --name classbots-redis redis:7-alpine

# Or install locally
brew install redis
redis-server
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.queue.example .env.local
```

Add to your `.env.local`:
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Worker Configuration
MEMORY_WORKER_CONCURRENCY=10
WORKER_HEALTH_PORT=3001
```

### 3. Start the Worker

```bash
# Development (with auto-reload)
npm run worker:dev

# Production
npm run worker:prod

# Or run multiple workers
npm run worker & npm run worker & npm run worker
```

## Queue Features

### Connection Pooling
- Maintains up to 50 Supabase connections
- Reuses connections for better performance
- Automatically cleans up stale connections

### Retry Logic
- 3 retry attempts with exponential backoff
- Initial delay: 2 seconds
- Separate retry logic for database and API calls

### Priority Processing
- High priority: Long conversations (>20 messages)
- Normal priority: Standard conversations
- Low priority: Short conversations

### Monitoring

1. **Queue Metrics API**: `/api/admin/queue-status`
   ```json
   {
     "healthy": true,
     "metrics": {
       "waiting": 15,
       "active": 10,
       "completed": 1250,
       "failed": 3,
       "processingRate": "99.76"
     }
   }
   ```

2. **Redis Commander GUI**: 
   ```bash
   npm run queue:monitor
   # Open http://localhost:8081
   ```

3. **Worker Health Check**: `http://localhost:3001/health`

## API Changes

The memory API now returns immediately with a job ID:

```javascript
// Old response
{
  "success": true,
  "memory": { ... }
}

// New response
{
  "success": true,
  "jobId": "123",
  "status": "queued",
  "message": "Memory processing has been queued"
}
```

Check job status:
```
PATCH /api/student/memory?jobId=123
```

## Scaling Considerations

### Vertical Scaling
- Increase `MEMORY_WORKER_CONCURRENCY` (default: 10)
- Add more CPU/RAM to worker server

### Horizontal Scaling
- Run multiple worker processes
- Deploy workers on separate servers
- Use Redis Cluster for >100k jobs/hour

### Performance Tuning
```env
# For high load
MEMORY_WORKER_CONCURRENCY=50
QUEUE_MAX_COMPLETED_JOBS=10000
QUEUE_MAX_FAILED_JOBS=50000

# For low memory
MEMORY_WORKER_CONCURRENCY=5
QUEUE_MAX_COMPLETED_JOBS=100
QUEUE_MAX_FAILED_JOBS=500
```

## Deployment

### Production Checklist
- [ ] Redis configured with persistence
- [ ] Worker process managed by PM2/systemd
- [ ] Monitoring alerts configured
- [ ] Backup strategy for Redis
- [ ] Rate limiting on API endpoints

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'memory-worker',
    script: 'dist/lib/queue/worker.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      MEMORY_WORKER_CONCURRENCY: 20
    }
  }]
}
```

### Docker Deployment
```dockerfile
# Dockerfile.worker
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/lib/queue/worker.js"]
```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis is running: `redis-cli ping`
   - Verify connection settings in `.env.local`

2. **Jobs Stuck in Queue**
   - Check worker logs: `npm run worker:dev`
   - Verify worker health: `curl localhost:3001/health`

3. **High Memory Usage**
   - Reduce `MEMORY_WORKER_CONCURRENCY`
   - Lower `QUEUE_MAX_COMPLETED_JOBS`

### Debug Mode
```bash
LOG_LEVEL=debug npm run worker:dev
```

## Monitoring Dashboard

Access queue metrics at `/api/admin/queue-status` (requires admin auth).

Example monitoring script:
```javascript
setInterval(async () => {
  const res = await fetch('/api/admin/queue-status');
  const data = await res.json();
  
  if (data.metrics.waiting > 100) {
    console.warn('Queue backlog detected!');
  }
  
  if (data.metrics.failed > 10) {
    console.error('High failure rate!');
  }
}, 60000);
```