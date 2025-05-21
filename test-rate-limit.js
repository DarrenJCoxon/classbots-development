#!/usr/bin/env node
/**
 * Test script to verify rate limiting is working
 * Usage: node test-rate-limit.js [url] [requests]
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';
const maxRequests = parseInt(process.argv[3]) || 15;

async function testRateLimit() {
  console.log(`🧪 Testing rate limiting on ${baseUrl}`);
  console.log(`📡 Making ${maxRequests} requests to /api/health`);
  console.log('⏱️  Expected: Rate limit after 10 requests (strict API limit)');
  console.log('');

  const results = [];
  
  for (let i = 1; i <= maxRequests; i++) {
    try {
      const start = Date.now();
      const response = await fetch(`${baseUrl}/api/health`, {
        headers: {
          'User-Agent': 'RateLimit-Test-Script'
        }
      });
      const duration = Date.now() - start;
      
      const status = response.status;
      const statusText = response.statusText;
      const retryAfter = response.headers.get('Retry-After');
      const remaining = response.headers.get('X-RateLimit-Remaining');
      
      console.log(`${i.toString().padStart(2)}: ${status} ${statusText} (${duration}ms)` + 
                  (remaining ? ` | Remaining: ${remaining}` : '') +
                  (retryAfter ? ` | Retry-After: ${retryAfter}s` : ''));
      
      results.push({ 
        request: i, 
        status, 
        duration, 
        remaining: remaining ? parseInt(remaining) : null,
        retryAfter: retryAfter ? parseInt(retryAfter) : null
      });
      
      // If we hit rate limit, stop testing
      if (status === 429) {
        console.log('');
        console.log('🚫 Rate limit triggered!');
        console.log(`⏹️  Stopped at request ${i}/${maxRequests}`);
        break;
      }
      
      // Small delay between requests to be nice
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`${i.toString().padStart(2)}: ERROR - ${error.message}`);
      results.push({ request: i, error: error.message });
    }
  }
  
  console.log('');
  console.log('📊 Test Summary:');
  const successful = results.filter(r => r.status === 200);
  const rateLimited = results.filter(r => r.status === 429);
  const errors = results.filter(r => r.error);
  
  console.log(`✅ Successful requests: ${successful.length}`);
  console.log(`🚫 Rate limited requests: ${rateLimited.length}`);
  console.log(`❌ Error requests: ${errors.length}`);
  
  if (rateLimited.length > 0) {
    console.log('');
    console.log('✅ Rate limiting is working correctly!');
    const firstRateLimit = rateLimited[0];
    console.log(`🎯 Rate limit triggered at request #${firstRateLimit.request}`);
    if (firstRateLimit.retryAfter) {
      console.log(`⏰ Retry after: ${firstRateLimit.retryAfter} seconds`);
    }
  } else if (successful.length === maxRequests) {
    console.log('');
    console.log('⚠️  Rate limiting may not be working - all requests succeeded');
    console.log('💡 Try increasing the number of requests or check if rate limits are disabled');
  }
}

// Run the test
testRateLimit().catch(console.error);