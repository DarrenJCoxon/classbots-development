// test-rate-limiting.js
// Run with: node test-rate-limiting.js

const PORT = 3000; // Change if your server runs on a different port
const BASE_URL = `http://localhost:${PORT}/api/health`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRateLimit() {
  console.log('Testing Rate Limiting');
  console.log('====================\n');
  
  console.log('1. First, check that rate limiting is active:');
  try {
    const response = await fetch(`${BASE_URL}?check=ratelimit`);
    const data = await response.json();
    console.log('Rate limit info:', data);
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nMake sure your dev server is running on port', PORT);
    return;
  }
  
  console.log('\n2. Making 10 rapid requests (should all succeed):');
  for (let i = 1; i <= 10; i++) {
    try {
      const response = await fetch(BASE_URL);
      const headers = {
        limit: response.headers.get('X-RateLimit-Limit'),
        remaining: response.headers.get('X-RateLimit-Remaining'),
        reset: response.headers.get('X-RateLimit-Reset')
      };
      console.log(`Request ${i}: Status ${response.status}, Remaining: ${headers.remaining || 'N/A'}`);
    } catch (error) {
      console.error(`Request ${i} failed:`, error.message);
    }
  }
  
  console.log('\n3. Making 100 more requests to hit the limit:');
  let hitLimit = false;
  for (let i = 11; i <= 110; i++) {
    try {
      const response = await fetch(BASE_URL);
      
      if (response.status === 429) {
        const data = await response.json();
        console.log(`\n🛑 Rate limit hit at request ${i}!`);
        console.log('Response:', data);
        console.log('Retry-After:', response.headers.get('Retry-After'), 'seconds');
        hitLimit = true;
        break;
      }
      
      if (i % 10 === 0) {
        const remaining = response.headers.get('X-RateLimit-Remaining');
        console.log(`Request ${i}: OK, Remaining: ${remaining || 'N/A'}`);
      }
    } catch (error) {
      console.error(`Request ${i} failed:`, error.message);
    }
  }
  
  if (!hitLimit) {
    console.log('\n⚠️  Rate limit not hit - check implementation');
  } else {
    console.log('\n✅ Rate limiting is working correctly!');
  }
  
  console.log('\n4. Waiting 60 seconds for rate limit to reset...');
  await sleep(60000);
  
  console.log('5. Testing after reset:');
  try {
    const response = await fetch(BASE_URL);
    console.log(`Status: ${response.status} - Rate limit should be reset`);
    const remaining = response.headers.get('X-RateLimit-Remaining');
    console.log(`Remaining requests: ${remaining || 'N/A'}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test different IP addresses
async function testMultipleClients() {
  console.log('\n\nTesting Multiple Clients');
  console.log('========================\n');
  
  console.log('Simulating requests from different IPs:');
  
  const clients = [
    { name: 'Client A', headers: { 'X-Forwarded-For': '192.168.1.1' } },
    { name: 'Client B', headers: { 'X-Forwarded-For': '192.168.1.2' } },
    { name: 'Client C', headers: { 'X-Forwarded-For': '192.168.1.3' } }
  ];
  
  for (const client of clients) {
    let count = 0;
    for (let i = 1; i <= 5; i++) {
      try {
        const response = await fetch(BASE_URL, { headers: client.headers });
        if (response.status === 200) count++;
      } catch (error) {
        // Ignore
      }
    }
    console.log(`${client.name} (${client.headers['X-Forwarded-For']}): ${count}/5 requests succeeded`);
  }
}

async function main() {
  console.log('Rate Limiting Test Suite');
  console.log('========================\n');
  console.log('Testing endpoint:', BASE_URL);
  console.log('Rate limit: 100 requests per minute\n');
  
  console.log('To test the rate-limited version:');
  console.log('1. cd src/app/api/health');
  console.log('2. mv route.ts route-backup.ts');
  console.log('3. mv route-rate-limited.ts route.ts');
  console.log('4. Restart your dev server');
  console.log('5. Run this test\n');
  
  await testRateLimit();
  // await testMultipleClients(); // Uncomment to test multiple clients
}

main().catch(console.error);