// Add this to your DigitalOcean server.js file
// You can copy this code and add it to your existing server.js

// Health check endpoint - add this BEFORE your existing routes
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

// Instructions to update your DigitalOcean server:
// 1. SSH into your DigitalOcean server:
//    ssh root@YOUR-REAL-IP
//
// 2. Edit your server.js file:
//    nano /var/www/skolr/app/server.js
//
// 3. Add the health endpoint code above to your server.js file
//    (add it after your app setup but before your existing routes)
//
// 4. Restart your server:
//    pm2 restart video-api
//
// 5. Test the health endpoint:
//    curl http://localhost:3000/api/health