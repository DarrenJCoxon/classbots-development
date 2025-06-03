# EXACT Steps to Add Health Endpoint to Your DigitalOcean Server

## Your Current server.js file probably looks like this:

```javascript
const express = require('express');
const multer = require('multer');
const cors = require('cors');
// ... other imports

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());

// Your existing upload endpoint
app.post('/api/video/upload', upload.single('video'), async (req, res) => {
  // ... your upload code
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Video API server running on port ${PORT}`);
});
```

## ADD THIS CODE - Insert AFTER the middleware setup but BEFORE your upload endpoint:

```javascript
// Health check endpoint - ADD THIS BLOCK
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

## Step-by-Step Instructions:

### 1. SSH into your DigitalOcean server:
```bash
ssh root@64.227.46.251
```

### 2. Navigate to your app directory:
```bash
cd /var/www/skolr/app
```

### 3. Look at your current server.js file:
```bash
cat server.js
```

### 4. Edit the file:
```bash
nano server.js
```

### 5. In the nano editor:
- Use arrow keys to navigate
- Find the line with your middleware setup (after `app.use(cors())` etc.)
- Press Enter to create a new line
- Copy and paste the health endpoint code above
- Make sure it's BEFORE your existing `/api/video/upload` route

### 6. Save and exit:
- Press `Ctrl + X`
- Press `Y` to confirm save
- Press `Enter`

### 7. Restart your server:
```bash
pm2 restart video-api
```

### 8. Test it works:
```bash
curl http://localhost:3000/api/health
```

You should see JSON output with server status.

## After adding the health endpoint, your server.js should look like this:

```javascript
const express = require('express');
const multer = require('multer');
const cors = require('cors');
// ... other imports

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());

// Health check endpoint - NEWLY ADDED
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

// Your existing upload endpoint (unchanged)
app.post('/api/video/upload', upload.single('video'), async (req, res) => {
  // ... your upload code
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Video API server running on port ${PORT}`);
});
```