# Simple Self-Hosted Video Platform Setup

This guide will help you set up a simple, cost-effective video hosting solution for your premium course platform. Much simpler than PeerTube but still professional!

## Cost Comparison

| Solution | Storage | Monthly Cost | Best For |
|----------|---------|--------------|----------|
| **Small Scale** | 100GB | ~$16/month | Starting schools, <50 courses |
| **Medium Scale** | 500GB | ~$27/month | Growing schools, 100-200 courses |
| **Large Scale** | 5TB | ~$18/month | Large schools, unlimited courses |

## Part 1: Server Setup Options

### Option A: Small Scale (Recommended to Start)
- **VPS**: DigitalOcean Droplet - $6/month (2GB RAM, 50GB SSD)
- **Storage**: DigitalOcean Block Storage - 100GB = $10/month
- **CDN**: CloudFlare Free
- **Total**: ~$16/month for 100GB

### Option B: Medium Scale
- **VPS**: DigitalOcean Droplet - $12/month (2GB RAM, 50GB SSD)
- **Storage**: DigitalOcean Spaces - $15/month (500GB)
- **CDN**: CloudFlare Free
- **Total**: ~$27/month for 500GB

### Option C: Large Scale (Best Value)
- **VPS**: Hetzner Cloud - €4.5/month (~$5)
- **Storage**: Hetzner Storage Box - 5TB = €11.90/month (~$13)
- **CDN**: CloudFlare Free
- **Total**: ~$18/month for 5TB!

## Part 2: Initial Server Setup

### 1. Create Your Server

#### DigitalOcean Setup:
```bash
# Create droplet with Ubuntu 22.04 LTS
# Choose $6/month basic droplet (2GB RAM, 1 vCPU, 50GB SSD)
# Add SSH key during creation
```

#### Hetzner Setup (Best Value):
```bash
# Create CX21 server (2 vCPU, 4GB RAM, 40GB SSD) - €4.51/month
# Choose Ubuntu 22.04
# Add SSH key during creation
```

### 2. Initial Server Configuration

```bash
# Connect to your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y nginx ffmpeg postgresql postgresql-contrib redis-server \
  nodejs npm git curl unzip certbot python3-certbot-nginx \
  imagemagick htop

# Install Node.js 20 (for your main app)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installations
node --version  # Should be v20.x
ffmpeg -version # Should be 4.4+
nginx -v        # Should be 1.18+
```

### 3. Create Application User

```bash
# Create user for your app
useradd -m -d /var/www/classbots -s /bin/bash classbots
usermod -aG sudo classbots

# Set password
passwd classbots

# Create directory structure
mkdir -p /var/www/classbots/{videos,app}
mkdir -p /var/www/classbots/videos/{uploads,processed,thumbnails}
chown -R classbots:classbots /var/www/classbots
```

## Part 3: Storage Setup

### Option A: Block Storage (Small/Medium Scale)

```bash
# Attach block storage volume in DigitalOcean dashboard
# Mount the volume
mkfs.ext4 /dev/sda  # Replace with your volume device
mkdir -p /mnt/videos
mount /dev/sda /mnt/videos

# Make permanent
echo '/dev/sda /mnt/videos ext4 defaults,nofail,discard 0 2' >> /etc/fstab

# Link to app directory
ln -s /mnt/videos /var/www/classbots/videos/storage
chown -R classbots:classbots /mnt/videos
```

### Option B: Object Storage (Medium Scale)

```bash
# We'll configure this in the app to use DigitalOcean Spaces API
# Just note your credentials:
# - Spaces Access Key
# - Spaces Secret Key  
# - Space Name
# - Endpoint (e.g., nyc3.digitaloceanspaces.com)
```

### Option C: Hetzner Storage Box (Large Scale)

```bash
# Install required packages for SFTP/rsync
apt install -y sshfs

# Mount Hetzner Storage Box
mkdir -p /mnt/hetzner-storage
echo 'your-username@your-username.your-server.de:/home /mnt/hetzner-storage fuse.sshfs defaults,_netdev,reconnect,uid=1000,gid=1000,IdentityFile=/home/classbots/.ssh/id_rsa 0 0' >> /etc/fstab

# Link to app directory  
ln -s /mnt/hetzner-storage /var/www/classbots/videos/storage
```

## Part 4: Nginx Configuration

### 1. Basic Video Serving Setup

```bash
# Remove default site
rm /etc/nginx/sites-enabled/default

# Create video hosting config
cat > /etc/nginx/sites-available/classbots-videos << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    
    client_max_body_size 2G;
    
    # Video files
    location /videos/ {
        alias /var/www/classbots/videos/processed/;
        
        # Enable range requests for video seeking
        add_header Accept-Ranges bytes;
        
        # CORS headers for video players
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, HEAD, OPTIONS';
        add_header Access-Control-Allow-Headers 'Range';
        
        # Cache video files for 7 days
        expires 7d;
        add_header Cache-Control "public, immutable";
        
        # Handle OPTIONS requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, HEAD, OPTIONS';
            add_header Access-Control-Allow-Headers 'Range';
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
    
    # Thumbnails
    location /thumbnails/ {
        alias /var/www/classbots/videos/thumbnails/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Your main app (proxy to Node.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Upload endpoint with larger body size
    location /api/videos/upload {
        client_max_body_size 5G;
        client_body_timeout 300s;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/classbots-videos /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 2. SSL Certificate

```bash
# Get SSL certificate
certbot --nginx -d your-domain.com

# Test auto-renewal
certbot renew --dry-run
```

## Part 5: Video Processing Setup

### 1. FFmpeg Processing Script

```bash
# Create processing script
cat > /var/www/classbots/process-video.sh << 'EOF'
#!/bin/bash
set -e

INPUT_FILE="$1"
OUTPUT_DIR="$2"
VIDEO_ID="$3"

if [ $# -ne 3 ]; then
    echo "Usage: $0 <input_file> <output_dir> <video_id>"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Generate thumbnail
ffmpeg -i "$INPUT_FILE" -ss 00:00:01.000 -vframes 1 \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease:eval=frame" \
    "$OUTPUT_DIR/thumbnail.jpg" -y

# Convert to different qualities
# 360p
ffmpeg -i "$INPUT_FILE" \
    -c:v libx264 -crf 23 -preset medium \
    -vf "scale=640:360:force_original_aspect_ratio=decrease:eval=frame" \
    -c:a aac -b:a 128k \
    -movflags +faststart \
    "$OUTPUT_DIR/360p.mp4" -y

# 720p
ffmpeg -i "$INPUT_FILE" \
    -c:v libx264 -crf 23 -preset medium \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease:eval=frame" \
    -c:a aac -b:a 192k \
    -movflags +faststart \
    "$OUTPUT_DIR/720p.mp4" -y

# 1080p (only if input is larger)
INPUT_HEIGHT=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=height -of csv=s=x:p=0 "$INPUT_FILE")
if [ "$INPUT_HEIGHT" -gt 720 ]; then
    ffmpeg -i "$INPUT_FILE" \
        -c:v libx264 -crf 23 -preset medium \
        -vf "scale=1920:1080:force_original_aspect_ratio=decrease:eval=frame" \
        -c:a aac -b:a 192k \
        -movflags +faststart \
        "$OUTPUT_DIR/1080p.mp4" -y
fi

# Create HLS playlist for adaptive streaming
ffmpeg -i "$OUTPUT_DIR/720p.mp4" \
    -c copy -f hls \
    -hls_time 10 \
    -hls_list_size 0 \
    -hls_segment_filename "$OUTPUT_DIR/segment_%03d.ts" \
    "$OUTPUT_DIR/playlist.m3u8" -y

# Get video duration
DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$INPUT_FILE")

echo "Processing complete!"
echo "Duration: $DURATION seconds"
echo "Thumbnail: $OUTPUT_DIR/thumbnail.jpg"
echo "Formats: 360p.mp4, 720p.mp4, playlist.m3u8"
EOF

chmod +x /var/www/classbots/process-video.sh
chown classbots:classbots /var/www/classbots/process-video.sh
```

## Part 6: Background Job Processing

### 1. Install Redis for Job Queue

```bash
# Redis is already installed, just configure
systemctl enable redis-server
systemctl start redis-server

# Test Redis
redis-cli ping  # Should return PONG
```

### 2. Create Processing Service

```bash
# Create systemd service for video processing
cat > /etc/systemd/system/classbots-video-processor.service << 'EOF'
[Unit]
Description=ClassBots Video Processor
After=network.target

[Service]
Type=simple
User=classbots
WorkingDirectory=/var/www/classbots/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node video-processor.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable classbots-video-processor
# We'll start this after setting up the app
```

## Part 7: Database Setup

```bash
# Configure PostgreSQL
sudo -u postgres createuser -P classbots
# Enter a strong password

sudo -u postgres createdb -O classbots classbots_production

# Test connection
sudo -u classbots psql -d classbots_production -c "SELECT version();"
```

## Part 8: Environment Configuration

```bash
# Switch to app user
su - classbots

# Create environment file
cat > /var/www/classbots/app/.env.production << 'EOF'
# Database
DATABASE_URL="postgresql://classbots:your-password@localhost:5432/classbots_production"

# Your existing Supabase/etc configs
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
# ... other existing vars ...

# Video Configuration
VIDEO_STORAGE_PATH="/var/www/classbots/videos"
VIDEO_UPLOAD_MAX_SIZE="5368709120"  # 5GB
VIDEO_PROCESSING_ENABLED="true"
VIDEO_QUALITIES="360p,720p,1080p"

# Server Configuration  
VIDEO_BASE_URL="https://your-domain.com/videos"
THUMBNAIL_BASE_URL="https://your-domain.com/thumbnails"

# Redis for job processing
REDIS_URL="redis://localhost:6379"

# Processing
FFMPEG_PATH="/usr/bin/ffmpeg"
FFPROBE_PATH="/usr/bin/ffprobe"
EOF

chmod 600 /var/www/classbots/app/.env.production
```

## Part 9: CloudFlare CDN Setup (Free Performance Boost)

### 1. Add Domain to CloudFlare

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Add your domain
3. Update nameservers at your domain registrar
4. Wait for activation

### 2. Configure CloudFlare

```bash
# CloudFlare settings to configure:
# - SSL/TLS: Full (strict)
# - Cache Level: Standard
# - Browser Cache TTL: 8 days
# - Always Use HTTPS: On

# Page Rules (free plan gets 3):
# 1. your-domain.com/videos/* - Cache Level: Cache Everything, Edge Cache TTL: 1 month
# 2. your-domain.com/thumbnails/* - Cache Level: Cache Everything, Edge Cache TTL: 1 month  
# 3. your-domain.com/api/* - Cache Level: Bypass
```

## Part 10: Monitoring & Maintenance

### 1. Log Management

```bash
# Setup log rotation
cat > /etc/logrotate.d/classbots << 'EOF'
/var/www/classbots/app/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    copytruncate
    notifempty
    missingok
}
EOF
```

### 2. Cleanup Script

```bash
cat > /var/www/classbots/cleanup.sh << 'EOF'
#!/bin/bash
# Clean up old upload files (keep for 7 days)
find /var/www/classbots/videos/uploads -name "*.mp4" -mtime +7 -delete
find /var/www/classbots/videos/uploads -name "*.mov" -mtime +7 -delete

# Clean up failed processing attempts (keep for 1 day)
find /var/www/classbots/videos/processed -name "*.tmp" -mtime +1 -delete

echo "Cleanup completed: $(date)"
EOF

chmod +x /var/www/classbots/cleanup.sh

# Add to crontab
echo "0 2 * * * /var/www/classbots/cleanup.sh >> /var/log/classbots-cleanup.log 2>&1" | crontab -
```

### 3. Monitoring Script

```bash
cat > /var/www/classbots/health-check.sh << 'EOF'
#!/bin/bash

# Check disk space
DISK_USAGE=$(df /var/www/classbots/videos | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "WARNING: Disk usage is ${DISK_USAGE}%"
fi

# Check video processing queue
QUEUE_SIZE=$(redis-cli llen video:processing:queue)
echo "Processing queue size: $QUEUE_SIZE"

# Check if main app is running
if ! curl -f -s http://localhost:3000/health > /dev/null; then
    echo "WARNING: Main app is not responding"
fi
EOF

chmod +x /var/www/classbots/health-check.sh
```

## Next Steps

Now your server is ready! The next step is to:

1. **Update your Next.js app** with the simple video upload/processing system
2. **Replace PeerTube components** with file-based video handling
3. **Test video upload and processing**

Would you like me to start building the video upload API and components for this setup?

## Cost Summary

- **Small (100GB)**: ~$16/month - Perfect for starting
- **Medium (500GB)**: ~$27/month - Good for growing schools  
- **Large (5TB)**: ~$18/month - Amazing value for established schools

This is much simpler than PeerTube while still being professional and scalable!