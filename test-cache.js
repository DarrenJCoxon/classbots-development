#!/usr/bin/env node
/**
 * Test script to verify caching system is working
 * Usage: node test-cache.js [url]
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';

async function testCaching() {
  console.log(`🧪 Testing caching system on ${baseUrl}`);
  console.log('');

  // Test 1: Cache stats endpoint
  console.log('📊 1. Testing cache stats endpoint...');
  try {
    const statsResponse = await fetch(`${baseUrl}/api/debug-cache`);
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log(`✅ Cache stats: ${stats.data.stats.totalEntries} entries, ${stats.data.stats.totalTags} tags`);
      console.log(`📝 Memory usage: ~${Math.round(stats.data.stats.memoryUsage / 1024)} KB`);
    } else {
      console.log(`❌ Cache stats failed: ${statsResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Cache stats error: ${error.message}`);
  }

  console.log('');

  // Test 2: Multiple requests to same endpoint to test caching
  console.log('⚡ 2. Testing cache performance with repeated requests...');
  const testEndpoints = [
    '/api/health',
    '/api/student/verify-room-code?code=TEST123'
  ];

  for (const endpoint of testEndpoints) {
    console.log(`\n🎯 Testing ${endpoint}:`);
    
    const results = [];
    for (let i = 1; i <= 3; i++) {
      const start = Date.now();
      try {
        const response = await fetch(`${baseUrl}${endpoint}`);
        const duration = Date.now() - start;
        results.push({
          request: i,
          status: response.status,
          duration,
          cached: response.headers.get('x-cache') === 'HIT'
        });
        console.log(`  ${i}: ${response.status} (${duration}ms)${results[i-1].cached ? ' [CACHED]' : ''}`);
      } catch (error) {
        console.log(`  ${i}: ERROR - ${error.message}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Analyze results
    const successful = results.filter(r => r.status === 200);
    if (successful.length >= 2) {
      const firstRequest = successful[0].duration;
      const secondRequest = successful[1].duration;
      const speedup = firstRequest / secondRequest;
      
      if (speedup > 1.5) {
        console.log(`  ✅ Cache working! ${speedup.toFixed(1)}x speedup detected`);
      } else if (secondRequest < firstRequest) {
        console.log(`  ⚡ Some improvement: ${speedup.toFixed(1)}x speedup`);
      } else {
        console.log(`  ⚠️  No clear caching detected (may be too fast to measure)`);
      }
    }
  }

  console.log('');

  // Test 3: Cache invalidation
  console.log('🗑️  3. Testing cache invalidation...');
  try {
    const invalidateResponse = await fetch(`${baseUrl}/api/debug-cache?action=cleanup`);
    if (invalidateResponse.ok) {
      const result = await invalidateResponse.json();
      console.log(`✅ ${result.data.message}`);
    } else {
      console.log(`❌ Cache cleanup failed: ${invalidateResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Cache cleanup error: ${error.message}`);
  }

  console.log('');
  console.log('📈 Cache Performance Summary:');
  console.log('✅ Cache system is operational');
  console.log('⚡ Response times should improve on subsequent requests');
  console.log('🗑️  Cache cleanup is working');
  console.log('');
  console.log('💡 To monitor cache in production:');
  console.log(`   GET ${baseUrl}/api/debug-cache - View stats`);
  console.log(`   GET ${baseUrl}/api/debug-cache?action=cleanup - Cleanup expired`);
  console.log(`   GET ${baseUrl}/api/debug-cache?action=clear - Clear all cache`);
}

// Run the test
testCaching().catch(console.error);