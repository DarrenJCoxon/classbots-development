// Simple script to test the chat API endpoint
const fetch = require('node-fetch');

async function testChatEndpoint() {
  // Configuration
  const roomId = "test_room"; // Replace with a valid room ID from your database
  const directAccessKey = process.env.DIRECT_ACCESS_ADMIN_KEY || 'directaccess_key';
  const userId = "test_user_id"; // Replace with a valid user ID
  const chatbotId = "test_chatbot_id"; // Replace with a valid chatbot ID

  // Base URL (modify as needed for your environment)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const endpoint = `${baseUrl}/api/chat/${roomId}`;

  console.log(`Testing chat endpoint: ${endpoint}`);

  try {
    // First, test GET request
    const getResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-direct-access-admin-key': directAccessKey,
        'x-bypass-auth-user-id': userId
      }
    });

    const getResponseData = await getResponse.json();
    console.log('GET Response Status:', getResponse.status);
    console.log('GET Response Data:', JSON.stringify(getResponseData, null, 2));

    // Then, test POST request
    const postResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-direct-access-admin-key': directAccessKey,
        'x-bypass-auth-user-id': userId
      },
      body: JSON.stringify({
        content: "Hello, this is a test message.",
        chatbot_id: chatbotId
      })
    });

    if (postResponse.headers.get('Content-Type')?.includes('text/event-stream')) {
      console.log('POST Response: Stream received');
      
      // Handle stream response
      const reader = postResponse.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        console.log('Stream chunk:', chunk);
      }
      
      console.log('Stream complete');
    } else {
      // Handle JSON response
      const postResponseData = await postResponse.json();
      console.log('POST Response Status:', postResponse.status);
      console.log('POST Response Data:', JSON.stringify(postResponseData, null, 2));
    }
  } catch (error) {
    console.error('Error testing chat endpoint:', error);
  }
}

// Run the test
testChatEndpoint().catch(console.error);