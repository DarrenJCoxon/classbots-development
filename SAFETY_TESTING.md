# Safety Message System Testing

This document provides instructions for testing the safety message system to ensure it's functioning correctly.

## Overview

The safety message system is a critical feature that detects when students mention potential concerns about self-harm, bullying, abuse, or other issues, and responds with appropriate support resources. This test verifies that:

1. The system properly detects safety concerns in user messages
2. The API correctly processes these safety concerns
3. Safety messages with resources are delivered to the user interface
4. Country-specific helplines are included when appropriate

## Running the Test Script

A test script is provided to automate testing of the safety message system. Follow these steps:

1. Start the development server:
   ```
   npm run dev
   ```

2. Before running the test script, you'll need to:
   - Update the `TEST_CONFIG` object in `test-safety-system.js` with valid values:
     - `ROOM_ID`: An existing room ID from your development database
     - `CHATBOT_ID`: An existing chatbot ID associated with the room
     - `USER_ID`: An existing student user ID with access to the room

3. Run the test script:
   ```
   node test-safety-system.js
   ```

4. The script will:
   - Send a normal message (shouldn't trigger safety system)
   - Send a message containing safety concern keywords
   - Check if the safety intervention was triggered
   - Query the safety message API to verify a safety message was created

## Manual Testing

You can also manually test the safety message system:

1. Log in as a student to a test room
2. Send a message containing keywords like "I feel depressed" or "I'm being bullied"
3. Verify that:
   - The system detects the concern
   - A support message appears with appropriate helplines
   - The normal chatbot response does not appear alongside it

## Debugging Tips

If the safety message system isn't working as expected:

1. Check the browser console logs for error messages
2. Verify the backend logs for safety detection information
3. Examine the `monitoring.ts` file to ensure the concern keywords are correctly configured
4. Check the `safety_notifications` table in the database to see if notifications are being created
5. Verify real-time channels are working properly for delivering notifications

## Expected Response Format

When the safety system is triggered, you should see a response with:

1. A compassionate acknowledgment of the concern
2. A note that a teacher has been notified
3. A list of relevant helplines with phone numbers and websites
4. Country-specific resources when available

## Updating Test Scenarios

If you need to add or modify test scenarios, update the `SAFETY_TRIGGER_MESSAGES` array in the test script with different concern phrases to verify detection across various categories.