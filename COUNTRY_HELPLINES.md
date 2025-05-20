# Country-Specific Helplines System

This document provides information about the country-specific helplines feature in the safety messaging system.

## Overview

The safety message system is designed to detect potential concerns in student messages and respond with appropriate support resources. To make these resources more relevant to users worldwide, we provide country-specific helplines based on the user's location.

## Supported Countries

The system currently supports the following countries:

| Country Code | Country Name         | Number of Helplines |
|--------------|----------------------|--------------------|
| US           | United States        | 4                  |
| GB           | United Kingdom       | 4                  |
| CA           | Canada               | 3                  |
| AU           | Australia            | 3                  |
| IE           | Ireland              | 3                  |
| FR           | France               | 3                  |
| ES           | Spain                | 2                  |
| IT           | Italy                | 2                  |
| PT           | Portugal             | 2                  |
| DE           | Germany              | 2                  |
| GR           | Greece               | 2                  |
| AE           | United Arab Emirates | 2                  |
| MY           | Malaysia             | 2                  |
| NZ           | New Zealand          | 4                  |
| DEFAULT      | Default International| 3                  |

## New Zealand Helplines

Recently added New Zealand helplines include:

1. **Youthline**
   - Phone: 0800 376 633
   - Text: 234
   - Website: youthline.co.nz
   - Description: 24/7 service for young people 12-24 years

2. **What's Up**
   - Phone: 0800 942 8787
   - Website: whatsup.co.nz
   - Description: Phone counseling for ages 5-18, 11am-11pm daily

3. **Kidsline**
   - Phone: 0800 54 37 54 (0800 KIDSLINE)
   - Description: New Zealand's only 24/7 helpline run by youth volunteers

4. **1737 Need to Talk?**
   - Phone/Text: 1737
   - Website: 1737.org.nz
   - Description: Free national counseling service, available anytime

## How Country Detection Works

1. **Teacher Sign-up**: When teachers sign up, they can select their country from the dropdown menu. This country code is stored with their profile.

2. **API Calls**: The country code is passed to the API via:
   - Request headers (`x-country-code`)
   - Request body (`country_code` parameter)

3. **Processing Pipeline**:
   - The system extracts the country code from the request
   - It normalizes the code (converting to uppercase, handling aliases like "UK" → "GB")
   - It looks up the appropriate helplines for that country
   - If no match is found, it falls back to default international helplines

4. **Safety Message Generation**:
   - When a safety concern is detected, the system includes country-specific helplines in the response
   - These helplines appear in a special safety message format in the chat UI

## Testing the Feature

The system includes tools for testing country-specific helplines:

1. **Test Safety Page**: Visit `/test-safety` in the application to use a dedicated testing interface:
   - Select a country from the dropdown menu
   - Send test messages that would trigger safety concerns
   - Verify that the appropriate country-specific helplines appear in the response

2. **API Testing Script**: Use the `test-safety-system.js` script for direct API testing:
   - Configure the script with desired country code
   - Run the script to send test messages
   - Check the API responses for the correct safety messages

## Adding New Countries

To add support for a new country:

1. **Add the country's helplines to `monitoring.ts`**:
   ```javascript
   "XX": [
     { "name": "Helpline Name", "phone": "1234-567-890", "website": "website.com", "short_desc": "Description" },
     // Additional helplines...
   ],
   ```

2. **Add the country to the mapping in `SafetyMessage.tsx`**:
   ```javascript
   const COUNTRY_NAMES: Record<string, string> = {
     // Existing entries...
     'XX': 'Country Name',
   };
   ```

3. **Add the country to the dropdown in `AuthForm.tsx`**:
   ```jsx
   <option value="XX">Country Name</option>
   ```

4. **Test the new country** using the tools described above.

## Fallback Mechanism

If a country code doesn't match any supported countries, or if no country code is provided, the system automatically falls back to the DEFAULT helplines which are general international resources.