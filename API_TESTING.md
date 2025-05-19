# Chat API Testing Scripts

This directory contains scripts to test the chat API endpoints of the ClassBots application.

## Quick Setup

1. Make sure you have Node.js installed
2. Install required dependencies:
   ```
   npm install node-fetch
   ```

## Basic Test Script

To run the basic test script:

```bash
node test-chat-api.js
```

This will test both GET and POST endpoints using default values.

## Advanced Test Script

The advanced script offers more features and better feedback:

```bash
node test-chat-api-advanced.js
```

### Command-line Options

You can customize the behavior with command-line arguments:

```bash
node test-chat-api-advanced.js --roomId=test_room_123 --userId=user_456 --chatbotId=chatbot_789 --message="Custom test message"
```

Available options:
- `--roomId`: The room ID to test
- `--userId`: The user ID to use for authentication
- `--chatbotId`: The chatbot ID to use
- `--baseUrl`: The base URL of your server (default: http://localhost:3000)
- `--directAccessKey`: The direct access key (default: from environment or 'directaccess_key')
- `--message`: The test message to send

### Interactive Mode

The advanced script also offers an interactive mode where you can type messages and see the responses in real-time.

### Environment Variables

You can also set defaults using environment variables:

```bash
export TEST_ROOM_ID=your_room_id
export TEST_USER_ID=your_user_id
export TEST_CHATBOT_ID=your_chatbot_id
export NEXT_PUBLIC_APP_URL=http://your-server-url
export DIRECT_ACCESS_ADMIN_KEY=your_direct_access_key
```

## Debugging Tips

1. Make sure your Next.js server is running
2. Check that the room ID, user ID, and chatbot ID are valid in your database
3. Verify that the direct access key matches your server configuration
4. If testing against a production environment, ensure you have the correct base URL

## Expected Output

For a successful test:
1. The GET request should return an array of messages
2. The POST request should either:
   - Return a streaming response with chat content
   - Return a JSON response with message details or error information

## Troubleshooting

If you encounter errors:
1. Verify database connectivity
2. Check server logs for detailed error messages
3. Ensure the user has proper permissions to access the room
4. Verify that the chatbot exists and is correctly configured