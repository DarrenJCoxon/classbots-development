#!/usr/bin/env node
// Advanced script to test the chat API endpoint with command-line arguments
const fetch = require('node-fetch');
const readline = require('readline');

// Configuration with defaults
const config = {
  roomId: process.env.TEST_ROOM_ID || "test_room",
  userId: process.env.TEST_USER_ID || "test_user_id",
  chatbotId: process.env.TEST_CHATBOT_ID || "test_chatbot_id",
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  directAccessKey: process.env.DIRECT_ACCESS_ADMIN_KEY || 'directaccess_key',
  message: "Hello, this is a test message."
};

// Parse command-line arguments
process.argv.slice(2).forEach(arg => {
  const [key, value] = arg.split('=');
  if (key && value) {
    const trimmedKey = key.replace(/^--/, '');
    config[trimmedKey] = value;
  }
});

// Create interface for interactive mode
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function testChatGet() {
  const endpoint = `${config.baseUrl}/api/chat/${config.roomId}`;
  console.log(`\n[GET] Testing endpoint: ${endpoint}`);
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-direct-access-admin-key': config.directAccessKey,
        'x-bypass-auth-user-id': config.userId
      }
    });

    if (!response.ok) {
      console.error(`GET request failed with status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log(`GET Response Status: ${response.status}`);
    console.log(`Messages retrieved: ${data.length || 0}`);
    console.log('First 2 messages (if any):');
    console.log(JSON.stringify(data.slice(0, 2), null, 2));
    return true;
  } catch (error) {
    console.error('Error during GET request:', error.message);
    return false;
  }
}

async function testChatPost(messageContent) {
  const endpoint = `${config.baseUrl}/api/chat/${config.roomId}`;
  console.log(`\n[POST] Testing endpoint: ${endpoint}`);
  console.log(`Message content: "${messageContent}"`);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-direct-access-admin-key': config.directAccessKey,
        'x-bypass-auth-user-id': config.userId
      },
      body: JSON.stringify({
        content: messageContent,
        chatbot_id: config.chatbotId
      })
    });

    if (!response.ok && !response.headers.get('Content-Type')?.includes('text/event-stream')) {
      console.error(`POST request failed with status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      return false;
    }

    if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
      console.log('Receiving stream response...');
      
      // Handle stream response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        process.stdout.write('.'); // Show progress
        
        // Extract content from SSE format
        const dataMatches = chunk.match(/data: (.*?)(?:\n\n|$)/g);
        if (dataMatches) {
          for (const match of dataMatches) {
            try {
              const data = JSON.parse(match.replace(/^data: /, '').trim());
              if (data.content) {
                process.stdout.write(data.content);
                fullResponse += data.content;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      console.log('\nStream complete');
      console.log('Full response length:', fullResponse.length);
      return true;
    } else {
      // Handle JSON response
      const data = await response.json();
      console.log(`POST Response Status: ${response.status}`);
      console.log('Response Data:');
      console.log(JSON.stringify(data, null, 2));
      return true;
    }
  } catch (error) {
    console.error('Error during POST request:', error.message);
    return false;
  }
}

async function runInteractiveMode() {
  console.log('\n=== Interactive Chat Mode ===');
  console.log('Type your messages and press Enter to send');
  console.log('Type "exit" to quit');
  
  const askQuestion = () => {
    rl.question('> ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        return;
      }
      
      await testChatPost(input);
      askQuestion();
    });
  };
  
  askQuestion();
}

async function main() {
  console.log('=== Chat API Test ===');
  console.log('Configuration:');
  console.log(`- Base URL: ${config.baseUrl}`);
  console.log(`- Room ID: ${config.roomId}`);
  console.log(`- User ID: ${config.userId}`);
  console.log(`- Chatbot ID: ${config.chatbotId}`);
  
  // Test GET endpoint
  const getSuccess = await testChatGet();
  
  if (!getSuccess) {
    console.log('\nGET request failed, skipping POST test');
    return;
  }
  
  // Test POST endpoint with configured message
  await testChatPost(config.message);
  
  // Ask if user wants to enter interactive mode
  rl.question('\nEnter interactive mode? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      runInteractiveMode();
    } else {
      rl.close();
    }
  });
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});