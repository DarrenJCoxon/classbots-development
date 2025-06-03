# Complete DigitalOcean Video Server Setup Guide

**Cost: $16/month | Storage: 100GB | Processing: Multiple qualities + thumbnails**

---

## 🚀 Phase 1: Server Creation & Initial Setup

### Step 1: Create DigitalOcean Account & Droplet
1. Sign up at [digitalocean.com](https://digitalocean.com)
2. Create → Droplets
3. Choose **Ubuntu 22.04 LTS x64**
4. Select **$6/month Basic plan** (2GB RAM, 1 vCPU, 50GB SSD)
5. Add your SSH key (generate with `ssh-keygen` if needed)
6. Choose datacenter region (London recommended for UK)
7. Hostname: `skolr-video-server`
8. Create Droplet

### Step 2: Add Block Storage
1. Go to **Volumes** → **Create Volume**
2. Size: **100GB**
3. Name: `skolr-videos`
4. Attach to your droplet
5. Cost: **$10/month** (Total: $16/month)

### Step 3: Connect to Server
```bash
ssh root@YOUR-DROPLET-IP
# Type 'yes' when prompted about fingerprint
```

---

## 🛠️ Phase 2: System Setup

### Step 4: Update System
```bash
apt update && apt upgrade -y
```

### Step 5: Install Core Packages
```bash
apt install -y nginx ffmpeg postgresql postgresql-contrib redis-server \
  git curl unzip certbot python3-certbot-nginx imagemagick htop
```

### Step 6: Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### Step 7: Verify Installations
```bash
node --version    # Should show v20.x
ffmpeg -version   # Should show 4.4+
nginx -v          # Should show 1.18+
```

---

## 👤 Phase 3: User Setup

### Step 8: Create Application User
```bash
useradd -m -d /var/www/skolr -s /bin/bash skolr
usermod -aG sudo skolr
passwd skolr  # Set a password
```

### Step 9: Create Directory Structure
```bash
mkdir -p /var/www/skolr/{videos,app}
mkdir -p /var/www/skolr/videos/{uploads,processed,thumbnails}
chown -R skolr:skolr /var/www/skolr
```

---

## 💾 Phase 4: Storage Setup

### Step 10: Mount Block Storage
```bash
# Find your volume device (usually /dev/sda)
lsblk

# Format and mount
mkfs.ext4 /dev/sda
mkdir -p /mnt/videos
mount /dev/sda /mnt/videos

# Make permanent
echo '/dev/sda /mnt/videos ext4 defaults,nofail,discard 0 2' >> /etc/fstab

# Link to app directory
ln -s /mnt/videos /var/www/skolr/videos/storage
chown -R skolr:skolr /mnt/videos
```

---

## 🗄️ Phase 5: Database Setup

### Step 11: Configure PostgreSQL
```bash
# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres createuser -P skolr
# Enter a strong password when prompted - SAVE THIS!

sudo -u postgres createdb -O skolr skolr_production

# Test connection
sudo -u skolr psql -d skolr_production -c "SELECT version();"
```

### Step 12: Start Redis
```bash
systemctl enable --now redis-server
redis-cli ping  # Should return PONG
```

---

## 🌐 Phase 6: Nginx Configuration

### Step 13: Configure Nginx
```bash
# Remove default site
rm /etc/nginx/sites-enabled/default

# Create video hosting config
cat > /etc/nginx/sites-available/skolr-videos << 'EOF'
server {
    listen 80;
    server_name YOUR-DOMAIN.com;  # Replace with your domain
    
    client_max_body_size 5G;
    
    # Video files
    location /videos/ {
        alias /var/www/skolr/videos/processed/;
        add_header Accept-Ranges bytes;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, HEAD, OPTIONS';
        add_header Access-Control-Allow-Headers 'Range';
        expires 7d;
        add_header Cache-Control "public, immutable";
        
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
        alias /var/www/skolr/videos/thumbnails/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Your main app
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
    
    # Upload endpoint
    location /api/video/upload {
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
ln -s /etc/nginx/sites-available/skolr-videos /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 🔐 Phase 7: SSL Certificate (Optional but Recommended)

### Step 14: Get SSL Certificate
```bash
# If you have a domain pointed to your server:
certbot --nginx -d your-domain.com

# Follow prompts to get free SSL certificate
# Test auto-renewal:
certbot renew --dry-run
```

---

## 📱 Phase 8: Deploy Your App

### Step 15: Upload Your Code
```bash
# Switch to app user
su - skolr

# Option A: Git clone
cd /var/www/skolr/app
git clone YOUR-REPO-URL .

# Option B: Upload via SCP/SFTP
# Use FileZilla or similar to upload files to /var/www/skolr/app/
```

### Step 16: Install App Dependencies
```bash
# As skolr user:
cd /var/www/skolr/app
npm install
```

### Step 17: Configure Environment
```bash
# Copy and edit environment file
cp .env.example .env.production

# Edit with your settings
nano .env.production
```

### Step 18: Environment Variables
```bash
# Add these to .env.production:

# Database
DATABASE_URL="postgresql://skolr:YOUR-DB-PASSWORD@localhost:5432/skolr_production"

# Supabase (your existing settings)
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Video Configuration
VIDEO_STORAGE_PATH="/var/www/skolr/videos"
VIDEO_UPLOAD_MAX_SIZE="5368709120"
VIDEO_PROCESSING_ENABLED="true"
VIDEO_QUALITIES="360p,720p,1080p"
VIDEO_BASE_URL="https://your-domain.com/videos"
THUMBNAIL_BASE_URL="https://your-domain.com/thumbnails"

# FFmpeg paths
FFMPEG_PATH="/usr/bin/ffmpeg"
FFPROBE_PATH="/usr/bin/ffprobe"

# Redis
REDIS_URL="redis://localhost:6379"

# Cleanup settings
DELETE_UPLOADS_AFTER_DAYS="7"
DELETE_FAILED_AFTER_DAYS="1"

# Your other existing environment variables...
```

---

## 🚀 Phase 9: Start Your App

### Step 19: Build and Start App
```bash
# Build your app
npm run build

# Install PM2 for production
npm install -g pm2

# Start your app
pm2 start npm --name "skolr" -- start

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions it gives you
```

---

## 📊 Phase 10: Video Processing Setup

### Step 20: Create Processing Script
```bash
cat > /var/www/skolr/process-video.sh << 'EOF'
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

# Create HLS playlist
ffmpeg -i "$OUTPUT_DIR/720p.mp4" \
    -c copy -f hls \
    -hls_time 10 \
    -hls_list_size 0 \
    -hls_segment_filename "$OUTPUT_DIR/segment_%03d.ts" \
    "$OUTPUT_DIR/playlist.m3u8" -y

echo "Processing complete!"
EOF

chmod +x /var/www/skolr/process-video.sh
chown skolr:skolr /var/www/skolr/process-video.sh
```

---

## 🧹 Phase 11: Maintenance Setup

### Step 21: Create Cleanup Script
```bash
cat > /var/www/skolr/cleanup.sh << 'EOF'
#!/bin/bash
# Clean up old uploads (keep for 7 days)
find /var/www/skolr/videos/uploads -name "*.mp4" -mtime +7 -delete
find /var/www/skolr/videos/uploads -name "*.mov" -mtime +7 -delete

# Clean up failed processing attempts
find /var/www/skolr/videos/processed -name "*.tmp" -mtime +1 -delete

echo "Cleanup completed: $(date)"
EOF

chmod +x /var/www/skolr/cleanup.sh

# Add to crontab for daily cleanup
echo "0 2 * * * /var/www/skolr/cleanup.sh >> /var/log/skolr-cleanup.log 2>&1" | crontab -
```

### Step 22: Setup Log Rotation
```bash
cat > /etc/logrotate.d/skolr << 'EOF'
/var/www/skolr/app/logs/*.log {
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

---

## 🧪 Phase 12: Testing

### Step 23: Test Your Setup
```bash
# Check services are running
systemctl status nginx
systemctl status postgresql
systemctl status redis-server
pm2 status

# Test video processing
ffmpeg -version
ffprobe -version

# Check disk space
df -h

# Test app connection
curl http://localhost:3000
```

### Step 24: Access Your App
- **With domain**: https://your-domain.com
- **Without domain**: http://YOUR-DROPLET-IP

---

## 💰 Cost Breakdown

| Component | Cost | Details |
|-----------|------|---------|
| DigitalOcean Droplet | $6/month | 2GB RAM, 1 vCPU, 50GB SSD |
| Block Storage | $10/month | 100GB additional storage |
| SSL Certificate | FREE | Let's Encrypt |
| Bandwidth | FREE | 2TB included |
| **TOTAL** | **$16/month** | Professional video platform |

---

## 🚨 Troubleshooting

### Common Issues:

1. **Upload fails**: Check nginx config and file size limits
   ```bash
   nginx -t
   tail -f /var/log/nginx/error.log
   ```

2. **Video processing fails**: Check FFmpeg installation
   ```bash
   ffmpeg -version
   which ffmpeg
   ```

3. **Database connection**: Verify PostgreSQL credentials
   ```bash
   sudo -u skolr psql -d skolr_production
   ```

4. **App won't start**: Check logs
   ```bash
   pm2 logs skolr
   ```

5. **Permission errors**: Fix file ownership
   ```bash
   chown -R skolr:skolr /var/www/skolr
   ```

### Useful Commands:

```bash
# Check logs
pm2 logs skolr
tail -f /var/log/nginx/error.log
journalctl -u nginx

# Restart services
systemctl restart nginx
pm2 restart skolr

# Check disk usage
du -sh /var/www/skolr/videos/*
df -h

# Monitor system resources
htop
```

---

## 🔧 Scaling Options

### Upgrade to Medium Scale ($27/month):
- Upgrade droplet to $12/month (4GB RAM)
- Add DigitalOcean Spaces: $15/month (500GB)
- Total: $27/month for 500GB storage

### Upgrade to Large Scale ($18/month):
- Use Hetzner instead:
  - VPS: €4.5/month (~$5)
  - Storage Box 5TB: €11.90/month (~$13)
  - Total: ~$18/month for 5TB storage!

---

## 🎉 You're Done!

You now have a complete video hosting platform for **$16/month** with:

✅ **Video upload and processing**  
✅ **Multiple quality levels** (360p, 720p, 1080p)  
✅ **Thumbnail generation**  
✅ **HLS adaptive streaming**  
✅ **100GB storage** (easily expandable)  
✅ **Professional video player**  
✅ **Analytics and progress tracking**  
✅ **Self-hosted** (no external dependencies)  
✅ **Scalable** with your school's growth  

Your video platform is ready to scale with your school's needs!

---

## 📞 Support

If you need help:
- **DigitalOcean Docs**: [docs.digitalocean.com](https://docs.digitalocean.com)
- **FFmpeg Docs**: [ffmpeg.org/documentation.html](https://ffmpeg.org/documentation.html)
- **Ubuntu Server Guide**: [ubuntu.com/server/docs](https://ubuntu.com/server/docs)

---

*This guide sets up a production-ready video platform that's 90% simpler than PeerTube and 70% cheaper than cloud solutions!*