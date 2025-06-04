// Test script to verify the assessment endpoint is working
// Run with: node test_assessment_endpoint.js

const testAssessmentEndpoint = async () => {
  const baseUrl = 'http://localhost:3000'; // Adjust if needed
  
  // Test payload based on the actual data from your database
  const testPayload = {
    student_id: '9b768cfe-b87b-4576-b16f-843287278188',
    chatbot_id: 'a93eecf1-0289-4bdd-9986-e8d148c616bc',
    room_id: '9118ebba-6d95-4d94-9547-25575ebab39c',
    message_ids_to_assess: [] // This might be the issue - empty array
  };

  try {
    console.log('Testing assessment endpoint...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch(`${baseUrl}/api/assessment/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-assessment-source': 'test-script',
        'x-request-id': `test-${Date.now()}`
      },
      body: JSON.stringify(testPayload)
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing endpoint:', error);
  }
};

testAssessmentEndpoint();