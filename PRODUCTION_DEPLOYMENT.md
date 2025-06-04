# Production Deployment Guide

## Memory Queue System

### Prerequisites
- Redis instance (Redis Cloud, AWS ElastiCache, or self-hosted)
- Node.js 18+ for worker processes
- PM2 or similar process manager

### Environment Variables
```bash
# Production Redis (use TLS connection)
REDIS_URL=rediss://username:password@your-redis-host:6379
REDIS_TLS_ENABLED=true

# Increase concurrency for production
QUEUE_WORKER_CONCURRENCY=20
MEMORY_SAVE_RATE_LIMIT=200

# Connection pooling
DB_POOL_MAX=50
```

### Deployment Steps

#### 1. Deploy Redis
For production, use a managed Redis service:
- **Redis Cloud**: Recommended for ease of use
- **AWS ElastiCache**: Good for AWS deployments
- **DigitalOcean Managed Redis**: Cost-effective option

#### 2. Deploy Worker Processes
```bash
# Build the worker
npm run worker:build

# Using PM2
pm2 start dist/lib/queue/worker.js -i 2 --name "memory-worker"

# Or using systemd service
sudo cp memory-worker.service /etc/systemd/system/
sudo systemctl enable memory-worker
sudo systemctl start memory-worker
```

#### 3. Example PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'classbots-web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'memory-worker',
      script: 'dist/lib/queue/worker.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

#### 4. Monitoring
- Set up alerts for queue depth > 1000
- Monitor Redis memory usage
- Track worker process health
- Use `/api/health/queue` endpoint for automated monitoring

#### 5. Scaling
- **Vertical**: Increase `QUEUE_WORKER_CONCURRENCY`
- **Horizontal**: Add more worker instances
- **Redis**: Use Redis Cluster for >100k jobs/hour

### Security Considerations
1. Use Redis AUTH password
2. Enable TLS for Redis connections
3. Restrict Redis access to worker IPs only
4. Rotate Redis passwords regularly

### Backup & Recovery
1. Enable Redis persistence (RDB + AOF)
2. Regular Redis backups
3. Test recovery procedures
4. Keep job retry data for 7 days