// src/lib/safety/safety.test.ts
import { generateSafetyResponse } from './generateSafetyResponse';

// Mock the fs module since we're not actually reading from the file system in tests
jest.mock('fs', () => ({
  readFileSync: jest.fn(() => JSON.stringify({
    "US": [
      { "name": "Childhelp USA", "phone": "1-800-422-4453", "website": "childhelp.org", "short_desc": "Child abuse prevention & treatment" },
      { "name": "National Suicide & Crisis Lifeline", "phone": "988", "website": "988lifeline.org", "short_desc": "24/7 crisis support" },
    ],
    "GB": [
      { "name": "Childline", "phone": "0800 1111", "website": "childline.org.uk", "short_desc": "Support for children & young people" },
    ],
    "DEFAULT": [
      { "name": "Emergency Services", "short_desc": "Contact local emergency services if in immediate danger." },
      { "name": "Talk to a Trusted Adult", "short_desc": "Speak to a teacher, school counselor, parent, or another family member." },
    ]
  })),
}));

// Sample helplines data for direct testing
const testHelplines = {
  "US": [
    { "name": "Childhelp USA", "phone": "1-800-422-4453", "website": "childhelp.org", "short_desc": "Child abuse prevention & treatment" },
    { "name": "National Suicide & Crisis Lifeline", "phone": "988", "website": "988lifeline.org", "short_desc": "24/7 crisis support" },
  ],
  "GB": [
    { "name": "Childline", "phone": "0800 1111", "website": "childline.org.uk", "short_desc": "Support for children & young people" },
  ],
  "DEFAULT": [
    { "name": "Emergency Services", "short_desc": "Contact local emergency services if in immediate danger." },
    { "name": "Talk to a Trusted Adult", "short_desc": "Speak to a teacher, school counselor, parent, or another family member." },
  ]
};

describe('Safety Message Generation', () => {
  test('Generates proper safety message with US helplines', () => {
    const response = generateSafetyResponse('self_harm', 'US', testHelplines);
    
    // Check that response contains the intro message
    expect(response).toContain('I notice you may be having some difficult thoughts');
    
    // Check that response contains teacher awareness message
    expect(response).toContain('your teacher can see this conversation');
    
    // Check that response contains US-specific helplines
    expect(response).toContain('Childhelp USA');
    expect(response).toContain('1-800-422-4453');
    
    // Check format for phone number
    expect(response).toContain('Phone: 1-800-422-4453');
    
    // Check that response includes a closing message
    expect(response).toContain('Help is available');
  });

  test('Generates proper safety message with GB helplines', () => {
    const response = generateSafetyResponse('bullying', 'GB', testHelplines);
    
    // Check that response contains the intro message
    expect(response).toContain('bullying');
    
    // Check that response contains GB-specific helplines
    expect(response).toContain('Childline');
    expect(response).toContain('0800 1111');
    
    // Check that response does not contain US-specific helplines
    expect(response).not.toContain('Childhelp USA');
  });

  test('Handles null country code with DEFAULT helplines', () => {
    const response = generateSafetyResponse('depression', null, testHelplines);
    
    // Check that response uses DEFAULT helplines
    expect(response).toContain('Emergency Services');
    expect(response).toContain('Talk to a Trusted Adult');
    
    // Check that response does not contain country-specific helplines
    expect(response).not.toContain('Childhelp USA');
    expect(response).not.toContain('Childline');
  });

  test('Handles country code aliases', () => {
    // UK should map to GB
    const response = generateSafetyResponse('bullying', 'UK', testHelplines);
    
    // Check that response contains GB-specific helplines
    expect(response).toContain('Childline');
    expect(response).toContain('0800 1111');
  });

  test('Contains concern-specific language', () => {
    // Check self-harm response contains appropriate language
    const selfHarmResponse = generateSafetyResponse('self_harm', 'US', testHelplines);
    expect(selfHarmResponse).toContain('difficult thoughts');
    
    // Check bullying response contains appropriate language
    const bullyingResponse = generateSafetyResponse('bullying', 'US', testHelplines);
    expect(bullyingResponse).toContain('bullying');
    
    // Check depression response contains appropriate language
    const depressionResponse = generateSafetyResponse('depression', 'US', testHelplines);
    expect(depressionResponse).toContain('feeling down');
  });
});