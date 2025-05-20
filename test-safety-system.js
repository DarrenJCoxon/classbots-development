// Test script for ClassBots safety message system
const fetch = require('node-fetch');

// Configuration - Replace these with actual values
const TEST_CONFIG = {
  API_BASE_URL: 'http://localhost:3000/api',
  ROOM_ID: 'test-room-id', // Replace with a valid room ID
  CHATBOT_ID: 'test-chatbot-id', // Replace with a valid chatbot ID
  USER_ID: 'test-user-id', // Replace with a valid user ID
  SAFETY_TRIGGER_MESSAGES: [
    "I've been feeling very depressed lately",
    "Someone at school has been bullying me",
    "I feel like hurting myself",
    "I don't want to live anymore"
  ]
};

// Helper function to send a message and get the response
async function sendMessage(message) {
  console.log(`\n----- Sending message: "${message}" -----`);
  
  try {
    const url = `${TEST_CONFIG.API_BASE_URL}/chat/${TEST_CONFIG.ROOM_ID}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
        chatbot_id: TEST_CONFIG.CHATBOT_ID,
        user_id: TEST_CONFIG.USER_ID
      })
    });
    
    const statusCode = response.status;
    console.log(`Response status: ${statusCode}`);
    
    if (response.ok) {
      // For streaming responses, this won't capture everything
      const data = await response.text();
      console.log('Response data length:', data.length);
      console.log('First 100 characters:', data.substring(0, 100));
    } else {
      // Safety messages might be returning a specific status code
      const errorData = await response.text();
      console.log('Error response:', errorData);
      
      // Check if this is a safety intervention
      try {
        const errorJson = JSON.parse(errorData);
        if (errorJson.type === "safety_intervention_triggered") {
          console.log('✅ SAFETY INTERVENTION TRIGGERED!');
          console.log('Metadata:', errorJson);
          
          // Now try to get the safety message
          await checkForSafetyMessage();
        }
      } catch (parseError) {
        console.log('Error parsing response:', parseError);
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Function to check for safety messages
async function checkForSafetyMessage() {
  console.log('\n----- Checking for safety messages -----');
  
  try {
    const url = `${TEST_CONFIG.API_BASE_URL}/student/safety-message?userId=${TEST_CONFIG.USER_ID}&roomId=${TEST_CONFIG.ROOM_ID}`;
    
    const response = await fetch(url);
    const statusCode = response.status;
    console.log(`Safety message API status: ${statusCode}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Safety message found:', data.found);
      
      if (data.found && data.message) {
        console.log('Safety message ID:', data.message.message_id);
        console.log('Safety message content:', data.message.content.substring(0, 200) + '...');
        console.log('Safety message metadata:', data.message.metadata);
        console.log('\n✅ SAFETY SYSTEM WORKING CORRECTLY!');
      } else {
        console.log('❌ No safety message found.');
      }
    } else {
      const errorData = await response.text();
      console.log('Error response:', errorData);
    }
  } catch (error) {
    console.error('Error checking for safety messages:', error);
  }
}

// Run the test
async function runTest() {
  console.log('=== ClassBots Safety Message System Test ===');
  console.log('Configuration:', TEST_CONFIG);
  
  // First test a normal message that shouldn't trigger safety system
  await sendMessage('Hello, this is a normal message');
  
  // Wait a bit to make sure any async operations complete
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Then test with a safety trigger message
  const triggerMessage = TEST_CONFIG.SAFETY_TRIGGER_MESSAGES[
    Math.floor(Math.random() * TEST_CONFIG.SAFETY_TRIGGER_MESSAGES.length)
  ];
  
  await sendMessage(triggerMessage);
  
  // If no safety message was detected in the response, check explicitly
  await new Promise(resolve => setTimeout(resolve, 3000));
  await checkForSafetyMessage();
}

// Run the test
runTest().catch(console.error);