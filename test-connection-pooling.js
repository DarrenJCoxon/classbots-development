// test-connection-pooling.js
// Run this with: node test-connection-pooling.js

// Change the port number if your server runs on a different port
const PORT = 3000; // Change this if needed (e.g., 3001)
const BASE_URL = `http://localhost:${PORT}/api/health`;

async function testEndpoint(name, url, iterations = 100) {
  console.log(`\nTesting ${name}...`);
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    try {
      const response = await fetch(url);
      const data = await response.json();
      const elapsed = Date.now() - start;
      times.push(elapsed);
      
      if (i === 0) {
        console.log('First response:', data);
      }
      
      if (i % 10 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      console.error(`Error on iteration ${i}:`, error.message);
    }
  }
  
  console.log('\n');
  
  // Calculate statistics
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
  
  console.log(`Results for ${name}:`);
  console.log(`- Average: ${avg.toFixed(2)}ms`);
  console.log(`- Median: ${median}ms`);
  console.log(`- Min: ${min}ms`);
  console.log(`- Max: ${max}ms`);
  console.log(`- Total time: ${times.reduce((a, b) => a + b, 0)}ms`);
  
  return { avg, median, min, max };
}

async function checkPoolStats() {
  try {
    const response = await fetch(`${BASE_URL}?check=pool`);
    const data = await response.json();
    console.log('\nConnection Pool Stats:', data.poolStats);
  } catch (error) {
    console.error('Could not check pool stats:', error.message);
  }
}

async function main() {
  console.log('Connection Pooling Performance Test');
  console.log('===================================');
  
  // Test current implementation
  console.log('\n1. Testing CURRENT implementation (no pooling)');
  await testEndpoint('Current', BASE_URL, 50);
  
  // Check pool stats
  await checkPoolStats();
  
  console.log('\n\nTo test the pooled version:');
  console.log('1. Rename route.ts to route-old.ts');
  console.log('2. Rename route-pooled.ts to route.ts');
  console.log('3. Restart the server');
  console.log('4. Run this test again');
}

main().catch(console.error);