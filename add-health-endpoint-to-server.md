# Add Health Endpoint to Your DigitalOcean Video Server

## Step 1: SSH into your server
```bash
ssh root@64.227.46.251
```

## Step 2: Edit your server.js file
```bash
nano /var/www/skolr/app/server.js
```

## Step 3: Add this code AFTER your existing app setup but BEFORE your upload route

Add this code block:
```javascript
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'skolr-video-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    endpoints: {
      upload: '/api/video/upload',
      status: '/api/video/upload?videoId=<id>'
    }
  });
});
```

## Step 4: Save and exit
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

## Step 5: Restart your video server
```bash
pm2 restart video-api
```

## Step 6: Test the health endpoint
```bash
curl http://localhost:3000/api/health
```

You should see a JSON response with server status information.

## Step 7: Test from your local machine
Once the health endpoint is added, run this from your local machine:
```bash
node test-video-server-connection.js 64.227.46.251
```

This should now show a successful connection!