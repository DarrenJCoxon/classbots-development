// src/lib/safety/generateSafetyResponse.ts
import fs from 'fs';
import path from 'path';

// Define the helplines data structure
interface HelplineEntry {
  name: string;
  phone?: string;
  website?: string;
  text_to?: string;
  text_msg?: string;
  short_desc: string;
}

// Define the full data structure
interface HelplineData {
  [countryCode: string]: HelplineEntry[];
}

// Helper function to load helplines data
function loadHelplines(): HelplineData {
  try {
    // Read the helplines data from the file
    const dataPath = path.join(process.cwd(), 'src/lib/safety/data/helplines.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const helplines = JSON.parse(rawData) as HelplineData;
    
    console.log(`[Safety] Successfully loaded helplines data from file with ${Object.keys(helplines).length} countries`);
    return helplines;
  } catch (error) {
    console.error('[Safety] Error loading helplines data:', error);
    // Provide a minimal fallback in case of error
    return {
      DEFAULT: [
        { name: "Emergency Services", short_desc: "Contact local emergency services if in immediate danger." },
        { name: "Talk to a Trusted Adult", short_desc: "Speak to a teacher, school counselor, parent, or another family member." }
      ]
    };
  }
}

// Normalize and validate country code
function normalizeCountryCode(countryCode: string | null): string {
  if (!countryCode || typeof countryCode !== 'string' || countryCode.trim() === '') {
    return 'DEFAULT';
  }
  
  // Convert to uppercase and trim
  let normalizedCode = countryCode.trim().toUpperCase();
  
  // Handle common aliases
  if (normalizedCode === 'UK') {
    normalizedCode = 'GB'; // Convert UK to GB (ISO standard)
  } else if (normalizedCode === 'UAE') {
    normalizedCode = 'AE'; // Convert UAE to AE (ISO standard)
  } else if (normalizedCode === 'USA') {
    normalizedCode = 'US'; // Convert USA to US (ISO standard)
  }
  
  return normalizedCode;
}

// Function to generate a supportive safety response with country-specific helplines
export function generateSafetyResponse(
  concernType: string, 
  countryCode: string | null,
  helplines?: HelplineData
): string {
  // Load helplines data if not provided
  const allHelplines = helplines || loadHelplines();
  
  // Normalize country code
  const effectiveCountryCode = normalizeCountryCode(countryCode);
  
  // Get helplines for this country (or fallback to DEFAULT)
  let countryHelplines = allHelplines[effectiveCountryCode];
  
  // If no helplines found for this country, use DEFAULT
  if (!countryHelplines || !Array.isArray(countryHelplines) || countryHelplines.length === 0) {
    console.log(`[Safety] No helplines found for country ${effectiveCountryCode}, using DEFAULT`);
    countryHelplines = allHelplines.DEFAULT || [];
  }
  
  // Format the concern type for display (e.g., "self_harm" -> "Self Harm")
  const concernTypeDisplay = concernType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Generate appropriate intro message based on concern type
  let introMessage = '';
  
  switch (concernType) {
    case 'self_harm':
      introMessage = 'I notice you may be having some difficult thoughts. Please know that you\'re not alone and help is available.';
      break;
    case 'bullying':
      introMessage = 'I understand you might be experiencing bullying, which can be really tough. You deserve support and there are people who can help.';
      break;
    case 'abuse':
      introMessage = 'I notice you may be in a difficult situation. Your safety is important, and there are resources available to support you.';
      break;
    case 'depression':
      introMessage = 'I understand you might be feeling down. Remember that these feelings can improve with the right support.';
      break;
    case 'family_issues':
      introMessage = 'Family challenges can be really difficult. It\'s important to know that support is available to help you through this time.';
      break;
    default:
      introMessage = 'I notice you might be going through a difficult time. It\'s important to reach out for support when needed.';
  }
  
  // Standard teacher awareness sentence
  const teacherAwareness = 'Remember, your teacher can see this conversation and is here to support you. Please feel comfortable reaching out to them or another trusted adult if you need help.';
  
  // Format helplines section
  let helplinesSection = '';
  
  countryHelplines.forEach(helpline => {
    helplinesSection += `* ${helpline.name}`;
    
    if (helpline.phone) {
      helplinesSection += ` - Phone: ${helpline.phone}`;
    } else if (helpline.text_to && helpline.text_msg) {
      helplinesSection += ` - Text: ${helpline.text_msg} to ${helpline.text_to}`;
    } else if (helpline.website) {
      helplinesSection += ` - Website: ${helpline.website}`;
    }
    
    // Add short description if available
    if (helpline.short_desc) {
      helplinesSection += ` (${helpline.short_desc})`;
    }
    
    helplinesSection += '\n';
  });
  
  // Closing message
  const closingMessage = 'Help is available.';
  
  // Combine all parts with appropriate spacing
  const fullResponse = `${introMessage} ${teacherAwareness}\n\n${helplinesSection}\n${closingMessage}`;
  
  return fullResponse;
}