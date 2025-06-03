#!/usr/bin/env node

// Simple script to test your DigitalOcean video server connection
// Usage: node test-video-server-connection.js YOUR-IP-ADDRESS

const https = require('https');
const http = require('http');

const serverIP = process.argv[2];

if (!serverIP) {
  console.log('❌ Please provide your DigitalOcean server IP address');
  console.log('Usage: node test-video-server-connection.js YOUR-IP-ADDRESS');
  console.log('Example: node test-video-server-connection.js 142.93.123.45');
  process.exit(1);
}

const testUrl = `http://${serverIP}:3000/api/health`;

console.log('🔍 Testing connection to video server...');
console.log(`📡 URL: ${testUrl}`);

const request = http.get(testUrl, (response) => {
  let data = '';

  response.on('data', (chunk) => {
    data += chunk;
  });

  response.on('end', () => {
    if (response.statusCode === 200) {
      console.log('✅ Connection successful!');
      console.log('📊 Server response:', JSON.parse(data));
      console.log('');
      console.log('🚀 Your video server is ready! Update your .env.local with:');
      console.log(`NEXT_PUBLIC_VIDEO_SERVER_URL=http://${serverIP}:3000`);
    } else {
      console.log(`❌ Server responded with status: ${response.statusCode}`);
      console.log('📄 Response:', data);
    }
  });
});

request.on('error', (error) => {
  console.log('❌ Connection failed:', error.message);
  console.log('');
  console.log('🔧 Troubleshooting steps:');
  console.log('1. Check if your DigitalOcean server is running: pm2 status');
  console.log('2. Make sure port 3000 is open on your firewall');
  console.log('3. Verify the IP address is correct');
  console.log('4. Add the health endpoint to your server.js (see digitalocean-video-server-health-update.js)');
});

request.setTimeout(10000, () => {
  console.log('❌ Connection timeout - server may be unreachable');
  request.destroy();
});