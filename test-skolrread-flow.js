// Test SkolrRead Session Creation Flow
// This script tests the complete flow of creating and viewing a SkolrRead session

const API_BASE = 'http://localhost:3000/api';

// Test data
const TEST_ROOM_ID = 'test-room-id'; // Replace with actual room ID
const TEST_CHATBOT_ID = 'test-chatbot-id'; // Replace with actual chatbot ID
const TEST_AUTH_TOKEN = 'your-auth-token'; // Replace with actual auth token

async function testSkolrReadFlow() {
  console.log('🚀 Starting SkolrRead flow test...\n');

  try {
    // Step 1: Test health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    console.log('');

    // Step 2: Create a new SkolrRead session
    console.log('2️⃣ Creating SkolrRead session...');
    const createSessionPayload = {
      roomId: TEST_ROOM_ID,
      chatbotId: TEST_CHATBOT_ID,
      title: 'Test Reading Session',
      description: 'This is a test reading session',
      documentInfo: {
        name: 'test-document.pdf',
        path: 'test-path/test-document.pdf',
        type: 'pdf',
        size: 1024000, // 1MB
        url: '/test.pdf'
      }
    };

    console.log('📤 Request payload:', JSON.stringify(createSessionPayload, null, 2));

    const createResponse = await fetch(`${API_BASE}/teacher/skolrread`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
      },
      body: JSON.stringify(createSessionPayload)
    });

    const createData = await createResponse.json();
    console.log('📥 Response status:', createResponse.status);
    console.log('📥 Response data:', JSON.stringify(createData, null, 2));

    if (!createResponse.ok) {
      console.error('❌ Failed to create session:', createData.error);
      return;
    }

    const sessionId = createData.session?.id;
    console.log('✅ Session created with ID:', sessionId);
    console.log('');

    // Step 3: Fetch the created session
    if (sessionId) {
      console.log('3️⃣ Fetching created session...');
      const fetchResponse = await fetch(`${API_BASE}/teacher/skolrread/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        }
      });

      const fetchData = await fetchResponse.json();
      console.log('📥 Fetch status:', fetchResponse.status);
      console.log('📥 Session data:', JSON.stringify(fetchData, null, 2));

      if (!fetchResponse.ok) {
        console.error('❌ Failed to fetch session:', fetchData.error);
      } else {
        console.log('✅ Session fetched successfully');
        
        // Check if document URL is present
        if (fetchData.mainDocument?.url) {
          console.log('✅ Document URL:', fetchData.mainDocument.url);
        } else {
          console.log('⚠️  No document URL found in session');
        }
      }
    }

    // Step 4: List all sessions for the room
    console.log('\n4️⃣ Listing all sessions for room...');
    const listResponse = await fetch(`${API_BASE}/teacher/skolrread?roomId=${TEST_ROOM_ID}`, {
      headers: {
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
      }
    });

    const listData = await listResponse.json();
    console.log('📥 List status:', listResponse.status);
    console.log('📥 Sessions count:', Array.isArray(listData) ? listData.length : 0);
    
    if (Array.isArray(listData) && listData.length > 0) {
      console.log('📥 First session:', JSON.stringify(listData[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Instructions for use
console.log('📝 Instructions:');
console.log('1. Update TEST_ROOM_ID with an actual room ID from your database');
console.log('2. Update TEST_CHATBOT_ID with an actual chatbot ID from your database');
console.log('3. Update TEST_AUTH_TOKEN with a valid auth token');
console.log('4. Make sure the development server is running on port 3000');
console.log('5. Run this script with: node test-skolrread-flow.js\n');

// Run the test
testSkolrReadFlow();