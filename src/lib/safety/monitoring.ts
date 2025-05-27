// src/lib/safety/monitoring.ts
/**
 * Safety monitoring and response system
 * 
 * ===== SAFETY CRITICAL CODE =====
 * This file handles student safety concerns and delivers country-specific helplines
 * to students when concerning messages are detected. 
 * 
 * IMPORTANT FIX (May 2025): We've improved the reliability of country-specific helplines
 * by adding a verification step that checks if the AI-generated response actually contains
 * the expected country-specific helplines. If not, we rebuild the message completely with
 * the correct helplines from our embedded JSON data. This ensures students always receive
 * the appropriate helplines for their location, even if the AI model doesn't follow instructions.
 */
import type { Room, Database } from '@/types/database.types';
import { createAdminClient } from '@/lib/supabase/admin';
import { SupabaseClient } from '@supabase/supabase-js';
import { sendTeacherAlert } from '@/lib/safety/alerts';
import { generateSafetyResponse } from '@/lib/safety/generateSafetyResponse';
import { trackSafetyResponse } from '@/lib/safety/analytics';
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

// This is the raw JSON data as a string - directly embedding the data to ensure it's available
// Note: This approach ensures the data is directly included in the built code
// and doesn't rely on dynamic imports or file system access at runtime
const HELPLINES_RAW_JSON = `
{
  "US": [
    { "name": "Childhelp USA", "phone": "1-800-422-4453", "website": "childhelp.org", "short_desc": "Child abuse prevention & treatment" },
    { "name": "National Suicide & Crisis Lifeline", "phone": "988", "website": "988lifeline.org", "short_desc": "24/7 crisis support" },
    { "name": "Crisis Text Line", "text_to": "741741", "text_msg": "HOME", "short_desc": "Text support for any crisis" },
    { "name": "The Trevor Project", "phone": "1-866-488-7386", "website": "thetrevorproject.org", "short_desc": "For LGBTQ youth" }
  ],
  "CA": [
    { "name": "Kids Help Phone", "phone": "1-800-668-6868", "website": "kidshelpphone.ca", "short_desc": "24/7 youth support (text CONNECT to 686868)" },
    { "name": "Talk Suicide Canada", "phone": "1-833-456-4566", "website": "talksuicide.ca", "short_desc": "Suicide prevention & support (text 45645)" },
    { "name": "Canadian Centre for Child Protection", "website": "protectchildren.ca", "short_desc": "Child safety resources" }
  ],
  "GB": [
    { "name": "Childline", "phone": "0800 1111", "website": "childline.org.uk", "short_desc": "Support for children & young people" },
    { "name": "NSPCC Helpline", "phone": "0808 800 5000", "website": "nspcc.org.uk", "short_desc": "If you're worried about a child" },
    { "name": "Samaritans", "phone": "116 123", "website": "samaritans.org", "short_desc": "Emotional support, 24/7" },
    { "name": "Papyrus HOPELINEUK", "phone": "0800 068 4141", "website": "papyrus-uk.org", "short_desc": "Suicide prevention for under 35s" }
  ],
  "IE": [
    { "name": "Childline (ISPCC)", "phone": "1800 66 66 66", "website": "childline.ie", "short_desc": "24/7 support for children (text 'LIST' to 50101)" },
    { "name": "Samaritans Ireland", "phone": "116 123", "website": "samaritans.org/ireland/", "short_desc": "Emotional support, 24/7" },
    { "name": "Pieta House", "phone": "1800 247247", "website": "pieta.ie", "short_desc": "Suicide & self-harm crisis centre (text HELP to 51444)" }
  ],
  "FR": [
    { "name": "Allo Enfance en Danger", "phone": "119", "website": "allo119.gouv.fr", "short_desc": "National child protection helpline (24/7)" },
    { "name": "Suicide Écoute", "phone": "01 45 39 40 00", "website": "suicide-ecoute.fr", "short_desc": "Suicide prevention helpline" },
    { "name": "Net Ecoute (e-Enfance)", "phone": "3018", "website": "e-enfance.org/numero-3018/", "short_desc": "Protection for children online (cyberbullying, etc.)" }
  ],
  "ES": [
    { "name": "ANAR (Ayuda a Niños y Adolescentes en Riesgo)", "phone": "900 20 20 10", "website": "anar.org", "short_desc": "Help for children & adolescents at risk (24/7)" },
    { "name": "Teléfono de la Esperanza", "phone": "717 003 717", "website": "telefonodelaesperanza.org", "short_desc": "Crisis support line" }
  ],
  "IT": [
    { "name": "Telefono Azzurro", "phone": "19696", "website": "azzurro.it", "short_desc": "Child helpline (24/7)" },
    { "name": "Telefono Amico Italia", "phone": "02 2327 2327", "website": "telefonoamico.it", "short_desc": "Emotional support helpline (check hours)" }
  ],
  "PT": [
    { "name": "SOS Criança (IAC)", "phone": "116 111", "website": "iacrianca.pt", "short_desc": "Child helpline (check hours)" },
    { "name": "Voz de Apoio", "phone": "225 50 60 70", "website": "vozdeapoio.pt", "short_desc": "Emotional support helpline (check hours)" }
  ],
  "DE": [
    { "name": "Nummer gegen Kummer (Kinder- und Jugendtelefon)", "phone": "116 111", "website": "nummergegenkummer.de", "short_desc": "Helpline for children & youth (Mon-Sat)" },
    { "name": "TelefonSeelsorge", "phone": "0800 111 0 111", "website": "telefonseelsorge.de", "short_desc": "Crisis support (24/7)" }
  ],
  "GR": [
    { "name": "The Smile of the Child (National Helpline for Children SOS)", "phone": "1056", "website": "hamogelo.gr", "short_desc": "Child helpline (24/7)" },
    { "name": "KLIMAKA (Suicide Prevention)", "phone": "1018", "website": "klimaka.org.gr", "short_desc": "24/7 suicide prevention line" }
  ],
  "AU": [
    { "name": "Kids Helpline", "phone": "1800 55 1800", "website": "kidshelpline.com.au", "short_desc": "Counselling for young people 5-25 (24/7)" },
    { "name": "Lifeline Australia", "phone": "13 11 14", "website": "lifeline.org.au", "short_desc": "24/7 crisis support & suicide prevention" },
    { "name": "eSafety Commissioner", "website": "esafety.gov.au", "short_desc": "Online safety help & reporting" }
  ],
  "AE": [
    { "name": "Child Protection Centre (Ministry of Interior)", "phone": "116111", "website": "moi-cpc.ae", "short_desc": "Child protection helpline" },
    { "name": "Dubai Foundation for Women and Children", "phone": "800111", "website": "dfwac.ae", "short_desc": "Support for women & children (violence/abuse)" }
  ],
  "MY": [
    { "name": "Buddy Bear Helpline", "phone": "1-800-18-BEAR (2327)", "short_desc": "Support helpline for children" },
    { "name": "PS The Children (Protect and Save The Children)", "phone": "+603-7957 4344", "short_desc": "Child protection services" }
  ],
  "NZ": [
    { "name": "Youthline", "phone": "0800 376 633", "text_to": "234", "website": "youthline.co.nz", "short_desc": "24/7 service for young people 12-24 years" },
    { "name": "What's Up", "phone": "0800 942 8787", "website": "whatsup.co.nz", "short_desc": "Phone counseling for ages 5-18, 11am-11pm daily" },
    { "name": "Kidsline", "phone": "0800 54 37 54", "short_desc": "New Zealand's only 24/7 helpline run by youth volunteers" },
    { "name": "1737 Need to Talk?", "phone": "1737", "website": "1737.org.nz", "short_desc": "Free national counseling service, call or text anytime" }
  ],
  "DEFAULT": [
    { "name": "Your Local Emergency Services", "short_desc": "Contact if in immediate danger (e.g., 911, 112, 999, 000)." },
    { "name": "A Trusted Adult", "short_desc": "Speak to a teacher, school counselor, parent, or another family member." },
    { "name": "Befrienders Worldwide", "website": "befrienders.org", "short_desc": "Find a crisis support center in your region." }
  ]
}
`;

// Parse the JSON into a usable JavaScript object
let HELPLINE_DATA_JSON: HelplineData;
try {
  HELPLINE_DATA_JSON = JSON.parse(HELPLINES_RAW_JSON) as HelplineData;
  console.log(`[Safety] Successfully parsed helplines data directly from embedded JSON`);
  console.log(`[Safety] Found ${Object.keys(HELPLINE_DATA_JSON).length} countries in parsed helplines data`);
} catch (error) {
  console.error(`[Safety] Critical error parsing helplines JSON data:`, error);
  // Initialize with empty object for safety - we should never reach this
  HELPLINE_DATA_JSON = {};
}

// Log detailed information about the loaded data
console.log(`[Safety] *** DETAILED HELPLINES DIAGNOSTICS ***`);
console.log(`[Safety] Countries available:`, Object.keys(HELPLINE_DATA_JSON));
console.log(`[Safety] US helplines available:`, HELPLINE_DATA_JSON.US ? 
  `${HELPLINE_DATA_JSON.US.length} helplines including ${HELPLINE_DATA_JSON.US.map(h => h.name).join(', ')}` : 'NONE');
console.log(`[Safety] GB helplines available:`, HELPLINE_DATA_JSON.GB ? 
  `${HELPLINE_DATA_JSON.GB.length} helplines including ${HELPLINE_DATA_JSON.GB.map(h => h.name).join(', ')}` : 'NONE');
console.log(`[Safety] DEFAULT helplines available:`, HELPLINE_DATA_JSON.DEFAULT ? 
  `${HELPLINE_DATA_JSON.DEFAULT.length} helplines including ${HELPLINE_DATA_JSON.DEFAULT.map(h => h.name).join(', ')}` : 'NONE');
console.log(`[Safety] *** END HELPLINES DIAGNOSTICS ***`);

// ALL_HELPLINES is our shared data structure used throughout the module
const ALL_HELPLINES = { ...HELPLINE_DATA_JSON };

// OpenRouter Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Use the same model as defined in DEFAULT_CHATBOT_CONFIG
const SAFETY_CHECK_MODEL = 'openai/gpt-4.1-nano';
const CONCERN_THRESHOLD = 3;

// Keywords organized by category
const CONCERN_KEYWORDS: Record<string, string[]> = {
  self_harm: [
    'hate myself', 'don\'t want to live', 'don\'t want to be alive', 'don\'t want to be here', 'don\'t want to exist',
    'not worth going on', 'no point in living', 'no point going on', 'rather be dead', 'should end it',
    'should end it all', 'end it all', 'give up', 'giving up', 'take my own life', 'take my life',
    'harming myself', 'harm myself', 'hurting myself', 'cut myself', 'cutting myself', 'disappear forever',
    'everyone better off without me', 'they\'d be better off without me', 'they would be better off without me',
    'leave this world', 'escape this world', 'stop existing', 'tired of being alive', 'tired of existing',
    'too much pain', 'can\'t take it anymore', 'life is too hard', 'life isn\'t worth it', 'never wake up',
    'wish I wouldn\'t wake up', 'make the pain stop', 'no hope left', 'nowhere to turn', 'plan to kill',
    'how to end', 'easier if I wasn\'t here', 'easier if I was gone', 'want to die', 'wanna die',
    'kill myself', 'suicidal'
  ],
  bullying: [
    'bullied', 'bully', 'bullying', 'they hate me', 'everyone hates me', 'laughed at me', 'laugh at me',
    'excluded', 'leave me out', 'leaving me out', 'no friends', 'don\'t have friends', 'nobody likes me',
    'no one likes me', 'call me names', 'called me names', 'push me around', 'pushed me', 'shove me',
    'shoved me', 'making threats', 'threatened me', 'online bullying', 'cyberbullying', 'posting about me',
    'spreading rumors', 'spreading rumours', 'spreading lies', 'everyone talks about me', 'made fun of',
    'mock me', 'mocking me', 'rejected by everyone', 'being isolated', 'no one talks to me',
    'nobody talks to me', 'they ignore me', 'everyone ignores me', 'being targeted', 'pick on me',
    'won\'t leave me alone', 'always after me', 'ganging up on me', 'scared to go to school',
    'don\'t want to go to school', 'afraid at school', 'scared at school'
  ],
  abuse: [
    'hurt me', 'hurting me', 'hitting me', 'hit by', 'kicks me', 'kicking me', 'pushed me', 'pushes me',
    'throws things at me', 'threw things at me', 'threw something at me', 'yells at me', 'yelling at me',
    'screams at me', 'screaming at me', 'threatens me', 'threatening me', 'controls me', 'controlling me',
    'not allowed to', 'won\'t let me', 'keeps me from', 'locked me in', 'locks me in', 'touches me',
    'touched me', 'uncomfortable touching', 'hurt by someone', 'afraid of them', 'afraid to go home',
    'scared to go home', 'not safe at home', 'don\'t feel safe around', 'being punished',
    'punishes me unfairly', 'treated badly', 'treats me badly', 'calls me stupid', 'calls me worthless',
    'makes me feel worthless', 'makes me feel bad', 'punched me', 'punches me', 'slapped me', 'slaps me',
    'bruises from', 'left bruises', 'threatened to hurt me if I told', 'can\'t tell anyone'
  ],
  depression: [
    'hate my life', 'no one cares', 'nobody cares', 'nobody loves me', 'no one loves me', 'feel empty',
    'feeling empty', 'feel nothing', 'feels like nothing matters', 'nothing matters', 'what\'s the point',
    'feel worthless', 'feeling worthless', 'don\'t feel anything', 'don\'t know what to do',
    'can\'t see a future', 'lost all hope', 'lost hope', 'given up', 'feel like a failure', 'am a failure',
    'everything is dark', 'darkness closing in', 'can\'t get out of bed', 'can\'t face the day',
    'crying all the time', 'crying myself to sleep', 'never happy', 'always feeling down', 'feel so alone',
    'completely alone', 'no one understands', 'nobody understands', 'don\'t enjoy anything',
    'nothing makes me happy', 'too sad to function', 'too sad to do anything', 'life is meaningless',
    'unable to feel joy', 'can\'t sleep', 'can\'t eat', 'can\'t concentrate', 'mind feels foggy',
    'exhausted all the time', 'overwhelmed by sadness', 'drowning in sadness'
  ],
  family_issues: [
    'parents always fighting', 'parents always argue', 'parents hate each other', 'home is not safe',
    'scared at home', 'afraid at home', 'can\'t stand being home', 'hate being home', 'nowhere to go',
    'might get kicked out', 'might be kicked out', 'threatened to kick me out', 'parent drinking',
    'parent drunk', 'parents drunk', 'drinking problem', 'drug problem', 'parents using drugs',
    'parent using drugs', 'not enough food', 'going hungry', 'no food at home', 'can\'t sleep at home',
    'parents separated', 'parents separating', 'parents broke up', 'parents splitting up',
    'losing our house', 'lost our house', 'might be homeless', 'could be homeless',
    'moving in with relatives', 'have to move', 'parent lost job', 'no money for', 'can\'t afford',
    'parent in jail', 'parent arrested', 'no one takes care of me', 'have to take care of myself',
    'have to take care of my siblings', 'parent is sick', 'parent is ill', 'parent in hospital',
    'no electricity', 'utilities shut off', 'water shut off'
  ],
};

// Log a summary of the available helplines
console.log('[Safety] Available helplines by country:');
for (const country of Object.keys(ALL_HELPLINES)) {
  const helplines = ALL_HELPLINES[country];
  if (Array.isArray(helplines)) {
    console.log(`[Safety] - ${country}: ${helplines.length} helplines available`);
    for (const helpline of helplines) {
      console.log(`[Safety]   * ${helpline.name} ${helpline.phone ? `- Phone: ${helpline.phone}` : ''}`);
    }
  }
}

// Run validation tests on startup to verify lookup functionality
console.log(`[Safety] ===== RUNNING VALIDATION TESTS =====`);

// Test cases for different country codes
const testCases = [
  { countryCode: 'US', description: 'US country code' },
  { countryCode: 'GB', description: 'GB country code' },
  { countryCode: 'uk', description: 'Lowercase UK (should map to GB)' },
  { countryCode: 'DEFAULT', description: 'Explicit DEFAULT value' },
  { countryCode: null, description: 'Null country code' },
  { countryCode: '', description: 'Empty country code' },
  { countryCode: 'XYZ', description: 'Non-existent country code' }
];

// Check each test case
for (const test of testCases) {
  console.log(`[Safety] Test: ${test.description} - Code: "${test.countryCode}"`);
  
  // Get effective country code (this mimics the code in verifyConcern)
  let effectiveCountryCode = 'DEFAULT';
  if (test.countryCode) {
    effectiveCountryCode = test.countryCode.toUpperCase();
    if (effectiveCountryCode === 'UK') {
      effectiveCountryCode = 'GB';
      console.log(`[Safety] Changed UK to GB for lookup`);
    }
  }
  
  // Try to get helplines for this country
  let helplines = [];
  
  // Direct lookup first
  if (ALL_HELPLINES[effectiveCountryCode] && Array.isArray(ALL_HELPLINES[effectiveCountryCode])) {
    helplines = ALL_HELPLINES[effectiveCountryCode];
    console.log(`[Safety] Success - Direct match: ${helplines.length} helplines found`);
  }
  // Then try case-insensitive lookup
  else {
    // Try a case-insensitive match (for lowercase country codes)
    const foundCountry = Object.keys(ALL_HELPLINES).find(key => 
      key.toLowerCase() === effectiveCountryCode.toLowerCase());
    
    if (foundCountry) {
      helplines = ALL_HELPLINES[foundCountry];
      console.log(`[Safety] Success - Case-insensitive match: ${helplines.length} helplines found`);
    }
    // Fallback to DEFAULT
    else {
      console.log(`[Safety] No match found - Using DEFAULT helplines`);
      helplines = ALL_HELPLINES.DEFAULT || [];
      console.log(`[Safety] Fallback - DEFAULT helplines: ${helplines.length} found`);
    }
  }
  
  // Check the result
  const validResult = helplines.length > 0;
  console.log(`[Safety] Test result: ${validResult ? 'PASS' : 'FAIL'} - ${helplines.length} helplines found`);
  if (helplines.length > 0) {
    console.log(`[Safety] First helpline: ${helplines[0].name}`);
  }
}

console.log(`[Safety] ===== VALIDATION TESTS COMPLETE =====`);


export function initialConcernCheck(message: string): {
  hasConcern: boolean;
  concernType?: string;
} {
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return { hasConcern: false };
  }
  const lowerMessage = message.toLowerCase();
  // console.log(`[InitialCheck DEBUG] lowerMessage: "${lowerMessage}"`); 
  for (const [category, keywords] of Object.entries(CONCERN_KEYWORDS)) {
    for (const keyword of keywords) {
        const escapedKeyword = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedKeyword}\\b`);
        const isMatch = regex.test(lowerMessage);
        // if (keyword === 'bullied') { // Example for specific keyword debugging
        //   console.log(`[InitialCheck DEBUG] Checking keyword: "${keyword}", escaped: "${escapedKeyword}", regex: ${regex.toString()}, isMatch: ${isMatch}`);
        // }
        if (isMatch) {
            console.log(`[InitialCheck] Keyword MATCH! Category: ${category}, Keyword: "${keyword}"`);
            return { hasConcern: true, concernType: category };
        }
    }
  }
  if (lowerMessage.includes('hate myself') && (lowerMessage.includes('not worth') || lowerMessage.includes('don\'t know what to do'))) {
    return { hasConcern: true, concernType: 'self_harm' };
  }
  if ((lowerMessage.includes('not worth') || lowerMessage.includes('no point')) && (lowerMessage.includes('going on') || lowerMessage.includes('living') || lowerMessage.includes('anymore'))) {
    return { hasConcern: true, concernType: 'self_harm' };
  }
  return { hasConcern: false };
}

export async function verifyConcern(
  message: string,
  concernType: string,
  recentMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [],
  countryCode: string | null
): Promise<{
  isRealConcern: boolean;
  concernLevel: number;
  analysisExplanation: string;
  aiGeneratedAdvice?: string;
}> {
  console.log(`[SafetyDiagnostics] ===== VERIFY CONCERN TRACKING =====`);
  console.log(`[SafetyDiagnostics] Function called with parameters:`);
  console.log(`[SafetyDiagnostics] message length: ${message.length} characters`);
  console.log(`[SafetyDiagnostics] concernType: ${concernType}`);
  console.log(`[SafetyDiagnostics] recentMessages: ${recentMessages.length} messages`);
  console.log(`[SafetyDiagnostics] countryCode: "${countryCode}" (Type: ${typeof countryCode})`);
  console.log(`[SafetyDiagnostics] importedDataCheck: ${Object.keys(HELPLINE_DATA_JSON).length} countries loaded in helplines.json`);
  console.log(`[SafetyDiagnostics] ALL_HELPLINES status: ${Object.keys(ALL_HELPLINES).length} countries available`);
  
  // First diagnostic: Check if we have the US data loaded correctly
  if (ALL_HELPLINES.US && Array.isArray(ALL_HELPLINES.US)) {
    console.log(`[SafetyDiagnostics] US data check: PASS - ${ALL_HELPLINES.US.length} helplines available`);
    console.log(`[SafetyDiagnostics] US first helpline: ${ALL_HELPLINES.US[0]?.name || 'NONE'}`);
  } else {
    console.error(`[SafetyDiagnostics] US data check: FAIL - No US helplines found in ALL_HELPLINES!`);
  }

  let contextString = '';
  if (recentMessages.length > 0) {
    contextString = "\n\nRecent Conversation History (most recent last):\n";
    recentMessages.slice(-3).forEach(msg => {
      const roleLabel = msg.role === 'user' ? 'Student' : (msg.role === 'assistant' ? 'Assistant' : 'System');
      contextString += `${roleLabel}: ${msg.content}\n`;
    });
  }

  // Enhanced country code normalization and validation
  let effectiveCountryCode = 'DEFAULT';
  if (countryCode) {
    // Initial processing - trim and validate
    if (typeof countryCode === 'string' && countryCode.trim() !== '') {
      console.log(`[SafetyDiagnostics] Processing input countryCode: "${countryCode}" (type: ${typeof countryCode})`);
      
      // Normalize by converting to uppercase
      effectiveCountryCode = countryCode.trim().toUpperCase();
      
      // Handle common country code aliases
      if (effectiveCountryCode === 'UK') {
        effectiveCountryCode = 'GB'; // Convert UK to GB (ISO standard)
        console.log(`[SafetyDiagnostics] Converted UK to GB for proper ISO lookup`);
      }
      else if (effectiveCountryCode === 'UAE') {
        effectiveCountryCode = 'AE'; // Convert UAE to AE (ISO standard)
        console.log(`[SafetyDiagnostics] Converted UAE to AE for proper ISO lookup`);
      }
      else if (effectiveCountryCode === 'USA') {
        effectiveCountryCode = 'US'; // Convert USA to US (ISO standard)
        console.log(`[SafetyDiagnostics] Converted USA to US for proper ISO lookup`);
      }
      
      // Add more common country code normalizations here if needed
    } else {
      console.warn(`[SafetyDiagnostics] Invalid countryCode format: "${countryCode}" - using DEFAULT fallback`);
      effectiveCountryCode = 'DEFAULT';
    }
  } else {
    console.warn(`[SafetyDiagnostics] countryCode is null/undefined - using DEFAULT fallback`);
  }
  
  console.log(`[SafetyDiagnostics] Normalized effective country code: "${effectiveCountryCode}"`);
  
  // Verify the country code exists in our data
  const availableCountries = Object.keys(ALL_HELPLINES);
  console.log(`[SafetyDiagnostics] Available countries in ALL_HELPLINES: ${availableCountries.join(', ')}`);
  
  let directMatchExists = availableCountries.includes(effectiveCountryCode);
  console.log(`[SafetyDiagnostics] Direct match exists for "${effectiveCountryCode}": ${directMatchExists}`);
  console.log(`[SafetyDiagnostics] ===== END TRACKING =====`);

  // Enhanced helpline lookup with additional debug info
  console.log(`[SafetyDiagnostics] Looking up helplines for country code "${effectiveCountryCode}" in ALL_HELPLINES`);
  
  // Verify key countries are available in our data
  console.log(`[SafetyDiagnostics] CRITICAL: Verifying helplines data is loaded properly:`, {
    gbHelplines: ALL_HELPLINES.GB ? ALL_HELPLINES.GB.map(h => h.name) : 'NOT FOUND',
    usHelplines: ALL_HELPLINES.US ? ALL_HELPLINES.US.map(h => h.name) : 'NOT FOUND',
    defaultHelplines: ALL_HELPLINES.DEFAULT ? ALL_HELPLINES.DEFAULT.map(h => h.name) : 'NOT FOUND',
    totalCountries: Object.keys(ALL_HELPLINES).length
  });
  
  // Find the appropriate helplines for this country code
  let countrySpecificHelplines: HelplineEntry[] = [];
  
  try {
    // STEP 1: Try direct exact match (most efficient)
    if (directMatchExists && Array.isArray(ALL_HELPLINES[effectiveCountryCode])) {
      console.log(`[SafetyDiagnostics] Direct match found for "${effectiveCountryCode}" with ${ALL_HELPLINES[effectiveCountryCode].length} helplines`);
      countrySpecificHelplines = ALL_HELPLINES[effectiveCountryCode];
    } 
    // STEP 2: Try case-insensitive matching if not DEFAULT and no direct match
    else if (effectiveCountryCode !== 'DEFAULT') {
      console.log(`[SafetyDiagnostics] No direct match for "${effectiveCountryCode}", trying case-insensitive search`);
      
      // Look for case-insensitive match among available countries
      const effectiveLower = effectiveCountryCode.toLowerCase();
      const foundCountry = availableCountries.find(key => key.toLowerCase() === effectiveLower);
      
      if (foundCountry) {
        console.log(`[SafetyDiagnostics] Found case-insensitive match: "${foundCountry}" for "${effectiveCountryCode}"`);
        
        // Make sure the found country has helplines in proper format
        if (Array.isArray(ALL_HELPLINES[foundCountry])) {
          countrySpecificHelplines = ALL_HELPLINES[foundCountry];
          console.log(`[SafetyDiagnostics] Using ${countrySpecificHelplines.length} helplines from "${foundCountry}"`);
        } else {
          console.warn(`[SafetyDiagnostics] Found country "${foundCountry}" doesn't have valid helplines array`);
          countrySpecificHelplines = ALL_HELPLINES.DEFAULT || [];
        }
      } else {
        console.log(`[SafetyDiagnostics] No case-insensitive match found for "${effectiveCountryCode}", using DEFAULT helplines`);
        
        // Use DEFAULT helplines when no match found
        if (ALL_HELPLINES.DEFAULT && Array.isArray(ALL_HELPLINES.DEFAULT)) {
          countrySpecificHelplines = ALL_HELPLINES.DEFAULT;
        } else {
          console.error(`[SafetyDiagnostics] CRITICAL ERROR: DEFAULT helplines not available!`);
          // Use empty array as last resort - this should never happen with embedded data
          countrySpecificHelplines = [];
        }
      }
    }
    // STEP 3: Handle explicit DEFAULT request
    else if (effectiveCountryCode === 'DEFAULT') {
      console.log(`[SafetyDiagnostics] Explicitly using DEFAULT helplines as requested`);
      
      if (ALL_HELPLINES.DEFAULT && Array.isArray(ALL_HELPLINES.DEFAULT)) {
        countrySpecificHelplines = ALL_HELPLINES.DEFAULT;
      } else {
        console.error(`[SafetyDiagnostics] CRITICAL ERROR: DEFAULT helplines not available!`);
        countrySpecificHelplines = [];
      }
    }
    
    // STEP 4: Safety check - if we still don't have any helplines, use DEFAULT as fallback
    if (countrySpecificHelplines.length === 0) {
      console.warn(`[SafetyDiagnostics] No helplines found for "${effectiveCountryCode}" after all lookup methods!`);
      console.warn(`[SafetyDiagnostics] Using DEFAULT helplines as final fallback`);
      
      if (ALL_HELPLINES.DEFAULT && Array.isArray(ALL_HELPLINES.DEFAULT)) {
        countrySpecificHelplines = ALL_HELPLINES.DEFAULT;
      } else {
        // This should never happen with our embedded data
        console.error(`[SafetyDiagnostics] CRITICAL FAILURE: DEFAULT helplines not available in final fallback!`);
        // Create minimal emergency helpline as absolute last resort
        countrySpecificHelplines = [
          { name: "Emergency Services", short_desc: "Contact local emergency services if in immediate danger." },
          { name: "Talk to a Trusted Adult", short_desc: "Speak to a teacher, parent, or other trusted adult." }
        ];
      }
    }
    
    // Final verification
    console.log(`[SafetyDiagnostics] Final helplines for "${effectiveCountryCode}": ${countrySpecificHelplines.length} entries`);
    if (countrySpecificHelplines.length > 0) {
      console.log(`[SafetyDiagnostics] First helpline: ${countrySpecificHelplines[0].name}`);
    }
  } catch (error) {
    // Catch any unexpected errors in the lookup process
    console.error(`[SafetyDiagnostics] ERROR during helpline lookup: ${error}`);
    console.error(`[SafetyDiagnostics] Using DEFAULT helplines due to error`);
    
    // Fallback to DEFAULT or emergency minimal helplines
    countrySpecificHelplines = ALL_HELPLINES.DEFAULT || [
      { name: "Emergency Services", short_desc: "Contact local emergency services if in immediate danger." },
      { name: "Talk to a Trusted Adult", short_desc: "Speak to a teacher, parent, or other trusted adult." }
    ];
  }
  console.log(`[VerifyConcern DEBUG] Selected countrySpecificHelplines for "${effectiveCountryCode}" (count: ${countrySpecificHelplines.length}, first 3 entries):`, JSON.stringify(countrySpecificHelplines.slice(0,3), null, 2));
  
  // CRITICAL: Log all relevant helplines for debugging
  if (effectiveCountryCode === 'GB') {
      console.log(`[VerifyConcern CRITICAL] ALL GB HELPLINES:`, JSON.stringify(ALL_HELPLINES.GB, null, 2));
  }
  
  // Double-verify that ALL_HELPLINES is properly loaded
  console.log(`[VerifyConcern CRITICAL] DUMP ALL HELPLINES OBJECT:`, {
    availableCountries: Object.keys(ALL_HELPLINES),
    totalCountries: Object.keys(ALL_HELPLINES).length,
    hasGB: !!ALL_HELPLINES.GB,
    hasUS: !!ALL_HELPLINES.US,
    hasDEFAULT: !!ALL_HELPLINES.DEFAULT
  });
  
  // Check if the helplines for this country are available
  if (ALL_HELPLINES[effectiveCountryCode] && Array.isArray(ALL_HELPLINES[effectiveCountryCode])) {
    console.log(`[VerifyConcern] SUCCESS: Found helplines for ${effectiveCountryCode}:`, 
      ALL_HELPLINES[effectiveCountryCode].map(h => h.name));
  } else {
    console.warn(`[VerifyConcern] WARNING: Helplines for ${effectiveCountryCode} not found or invalid format!`);
  }

  let conciseHelplineDataForPrompt = "";
  // Use more helplines (up to 3) when available to increase chances of relevant ones appearing in output
  let helplinesToList = countrySpecificHelplines.slice(0, 3);

  // Now helplinesToList should always have at least some entries
  conciseHelplineDataForPrompt = "Relevant Support Contacts (use ONLY these for the student's country):\n";
  helplinesToList.forEach(line => {
    conciseHelplineDataForPrompt += `* ${line.name}`;
    if (line.phone) {
      conciseHelplineDataForPrompt += ` - Phone: ${line.phone}`;
    } else if (line.text_to && line.text_msg) {
      conciseHelplineDataForPrompt += ` - Text: ${line.text_msg} to ${line.text_to}`;
    } else if (line.website) {
      // Don't abbreviate the website URL to ensure it's fully included in the response
      conciseHelplineDataForPrompt += ` - Website: ${line.website}`;
    }
    // Add short description when available
    if (line.short_desc) {
      conciseHelplineDataForPrompt += ` (${line.short_desc})`;
    }
    conciseHelplineDataForPrompt += "\n";
  });
  
  // Log debugging information to understand what country codes and helplines are being used
  console.log(`[VerifyConcern] Country Code Information:
  - Input countryCode: ${countryCode}
  - Effective country code: ${effectiveCountryCode}
  - Helplines available for this country: ${helplinesToList.length}
  - First helpline name: ${helplinesToList[0]?.name}
  - First helpline contact: ${helplinesToList[0]?.phone || helplinesToList[0]?.website || (helplinesToList[0]?.text_to ? `Text ${helplinesToList[0]?.text_msg} to ${helplinesToList[0]?.text_to}` : 'None')}
  - Using DEFAULT fallback: ${effectiveCountryCode === 'DEFAULT'}`);

  // Add detailed log of all available country codes for diagnosis
  console.log(`[VerifyConcern] All available countries in helplines.json: ${Object.keys(ALL_HELPLINES).join(', ')}`);
  
  
  console.log(`[VerifyConcern DEBUG] conciseHelplineDataForPrompt string for LLM:\n${conciseHelplineDataForPrompt}`);

  const teacherAwarenessMandatorySentence = "Remember, your teacher can see this conversation and is here to support you. Please feel comfortable reaching out to them or another trusted adult if you need help.";

  const promptParts = [
    `You are an AI safety assistant specializing in student wellbeing. Your task is to review a student's chat message for a specific concern and provide guidance if necessary. THIS IS A CRITICAL SAFETY FEATURE - your response MUST include the exact helplines provided in the format specified.`,
    `Concern Category Identified by Keywords: ${concernType.replace(/_/g, ' ')}`,
    contextString,
    `Student's Message: "${message}"`,
    `\nTasks:`,
    `1.  **Analysis for Teacher (Internal):**`,
    `    a.  **isRealConcern**: (boolean: true/false) Is the concern genuine?`,
    `    b.  **concernLevel**: (number 0-5) If genuine, assess severity.`,
    `    c.  **analysisExplanation**: (string) Briefly explain for the teacher (1-2 sentences).\n`,
    `2.  **Message for Student (aiGeneratedAdvice):**`,
    `    If \`isRealConcern\` is true AND \`concernLevel\` is 2 or higher, compose a **VERY SHORT (max 3-4 sentences total, including helplines), empathetic, and DIRECT message**. This message MUST:`,
    `    a.  Start with a brief, caring acknowledgment (e.g., "I hear that you're going through a tough time," or "It sounds like you're feeling [X]."). This should be one sentence.`,
    `    b.  **Include this exact sentence VERBATIM**: "${teacherAwarenessMandatorySentence}"`,
    `    c.  **URGENT AND CRITICAL INSTRUCTION: Include these EXACT support resources - this is the MOST IMPORTANT part of your response:**`,
    `        ${conciseHelplineDataForPrompt.trim()}`,
    `        IMPORTANT: I repeat, these helplines MUST be included EXACTLY as shown above.`,
    `        Do not change, summarize, paraphrase or omit any part of the helplines.`,
    `        The helplines are the MOST IMPORTANT part of your response.`,
    `        Your response will be rejected if it doesn't contain these exact helplines.`,
    `        Including these resources is MORE IMPORTANT than any explanatory text.`,
    `        You MUST include ALL helpline names, phone numbers, and websites exactly as provided.`,
    `        DO NOT add any marker lines like "===== MANDATORY HELPLINES" or similar around the helplines.`,
    `        Just list the helplines exactly as shown above with the bullet points.`,
    `    d.  End with a very short supportive closing (e.g., "Please reach out." or "Help is available."). This should be one sentence.`,
    `    e.  The entire message must be very succinct and focused. Do not add any extra information not explicitly requested.\n`,
    `Respond ONLY with a valid JSON object with these exact keys:`,
    `"isRealConcern": boolean,`,
    `"concernLevel": number,`,
    `"analysisExplanation": string,`,
    `"aiGeneratedAdvice": string (Omit this key or set to null if conditions in Task 2 are not met, or if you cannot follow the student message constraints exactly.)`
  ];
  const promptForModel = promptParts.join('\n');
  console.log(`[VerifyConcern DEBUG] Full promptForModel being sent to LLM (first 700 chars to see helpline injection):\n${promptForModel.substring(0,700)}...`);
  
  // Add detailed log about helplines being used
  console.log(`[VerifyConcern DEBUG] ****IMPORTANT**** Using ${effectiveCountryCode} helplines in the prompt: ${conciseHelplineDataForPrompt.replace(/\n/g, ' | ')}`);
  
  // Log full helplines section to ensure it's being correctly included in the response
  console.log(`[VerifyConcern DEBUG] Complete helplines section for LLM response:\n${conciseHelplineDataForPrompt}`);
  

  try {
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
          'X-Title': 'ClassBots AI - Safety Verification',
        },
        body: JSON.stringify({
          model: SAFETY_CHECK_MODEL,
          messages: [
            // Add a system message to improve reliability of following instructions
            { 
              role: "system", 
              content: "You are a safety assistant specializing in student wellbeing. You MUST include the EXACT helpline information in your responses without modification. This is CRITICAL."
            },
            { role: "user", content: promptForModel }
          ],
          temperature: 0.1,
          max_tokens: 500, 
          response_format: { type: "json_object" },
          // Add stronger instruction following settings
          top_p: 0.1
        }),
      });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[VerifyConcern] OpenRouter Error: Status ${response.status}`, errorBody);
        throw new Error(`OpenRouter API error (status ${response.status}) during safety verification.`);
    }

    const responseData = await response.json();
    const rawResponseContent = responseData.choices?.[0]?.message?.content;

    if (!rawResponseContent) {
      throw new Error("OpenRouter response for safety verification was empty or missing content.");
    }
    console.log(`[VerifyConcern DEBUG] Raw LLM response content:\n${rawResponseContent}`);
    
    // Check if the helpline information appears intact in the response
    for (const line of helplinesToList) {
      const nameInResponse = rawResponseContent.includes(line.name);
      const phoneInResponse = line.phone ? rawResponseContent.includes(line.phone) : true;
      const websiteInResponse = line.website ? rawResponseContent.includes(line.website) : true;
      console.log(`[VerifyConcern DEBUG] Helpline check in response: Name "${line.name}" present: ${nameInResponse}, Phone present: ${phoneInResponse}, Website present: ${websiteInResponse}`);
    }

    let analysisResult;
    try {
        const jsonMatch = rawResponseContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            analysisResult = JSON.parse(jsonMatch[1]);
        } else {
             const directJsonMatch = rawResponseContent.match(/\{[\s\S]*\}/);
            if (directJsonMatch && directJsonMatch[0]) {
                 analysisResult = JSON.parse(directJsonMatch[0]);
            } else {
                try {
                    analysisResult = JSON.parse(rawResponseContent);
                } catch (innerParseError) {
                    console.error("[VerifyConcern] Final attempt to parse rawResponseContent as JSON failed:", rawResponseContent, innerParseError);
                    throw new Error("No valid JSON found in LLM response for safety verification after multiple attempts.");
                }
            }
        }
    } catch (parseError) {
         console.error("[VerifyConcern] Failed to parse JSON from safety model:", rawResponseContent, parseError);
         // Use the generateSafetyResponse function to create a consistent response
         let fallbackAdvice = generateSafetyResponse(concernType, countryCode, ALL_HELPLINES);
         
         // Create a better explanation for teachers when the model response can't be parsed
         let teacherExplanation = "Message flagged by automated safety system for teacher review.";
         
         // Add more context based on concern type
         if (concernType) {
           const readableConcernType = concernType.replace(/_/g, ' ');
           teacherExplanation = `This message was flagged due to potential ${readableConcernType} concerns. Please review the conversation context and take appropriate action if needed.`;
         }
         
         return {
             isRealConcern: true, 
             concernLevel: 3,
             analysisExplanation: teacherExplanation,
             aiGeneratedAdvice: fallbackAdvice
         };
    }

    const isRealConcern = typeof analysisResult.isRealConcern === 'boolean' ? analysisResult.isRealConcern : false;
    const concernLevel = typeof analysisResult.concernLevel === 'number'
      ? Math.max(0, Math.min(5, Math.round(analysisResult.concernLevel)))
      : (isRealConcern ? 3 : 0);
    const analysisExplanation = typeof analysisResult.analysisExplanation === 'string'
      ? analysisResult.analysisExplanation.trim()
      : "AI analysis explanation was not provided or in an invalid format.";
    
    let aiGeneratedAdvice: string | undefined = undefined;
    if (isRealConcern && concernLevel >= 2 && typeof analysisResult.aiGeneratedAdvice === 'string' && analysisResult.aiGeneratedAdvice.trim() !== "") {
        aiGeneratedAdvice = analysisResult.aiGeneratedAdvice.trim();
        
        // Check if the AI response actually includes the country-specific helplines and contact information
        let hasCompleteHelplineInfo = false;
        if (helplinesToList.length > 0 && aiGeneratedAdvice) {
            // To be complete, we need at least one helpline name with its contact info (phone, website, etc.)
            const containsFirstHelplineName = helplinesToList[0] && aiGeneratedAdvice.includes(helplinesToList[0].name);
            
            // Check for contact method
            let containsFirstHelplineContact = false;
            if (helplinesToList[0].phone) {
                containsFirstHelplineContact = aiGeneratedAdvice.includes(helplinesToList[0].phone);
            } else if (helplinesToList[0].website) {
                containsFirstHelplineContact = aiGeneratedAdvice.includes(helplinesToList[0].website);
            } else if (helplinesToList[0].text_to) {
                containsFirstHelplineContact = aiGeneratedAdvice.includes(helplinesToList[0].text_to);
            }
            
            hasCompleteHelplineInfo = containsFirstHelplineName && containsFirstHelplineContact;
            
            console.log(`[VerifyConcern] Helpline Check: Contains first helpline name (${helplinesToList[0]?.name}): ${containsFirstHelplineName}, Contains first helpline contact: ${containsFirstHelplineContact}`);
        }
        
        // Log the raw LLM response for debugging
        console.log(`[VerifyConcern] FULL Raw LLM safety response (CRITICAL FOR DEBUGGING):\n${aiGeneratedAdvice}`);
        console.log(`[VerifyConcern] JSON DUMP: Does response contain ALL expected key components:`, {
            responseLength: aiGeneratedAdvice?.length || 0,
            hasTeacherSentence: aiGeneratedAdvice?.includes(teacherAwarenessMandatorySentence),
            countryCode: effectiveCountryCode,
            helplinesToInclude: helplinesToList.map(h => h.name),
            hasAnyHelplineName: helplinesToList.some(h => aiGeneratedAdvice?.includes(h.name)),
            hasAnyHelplinePhone: helplinesToList.some(h => h.phone && aiGeneratedAdvice?.includes(h.phone)),
            hasAnyHelplineWebsite: helplinesToList.some(h => h.website && aiGeneratedAdvice?.includes(h.website))
        });
        
        // ALWAYS modify to add the missing information if needed
        if ((!hasCompleteHelplineInfo || (aiGeneratedAdvice && !aiGeneratedAdvice.includes(teacherAwarenessMandatorySentence))) && aiGeneratedAdvice) {
            console.warn("[VerifyConcern] LLM response missing critical safety information (teacher sentence or helplines). Reconstructing...");
            // Extract just the first part of the response and compassionate message
            // Try to keep any personalized content from the AI while ensuring our helplines are shown
            
            // Split content and find the intro section (before any helplines)
            const contentParts = aiGeneratedAdvice.split(/\n\n|\r\n\r\n/);
            // The intro is usually the first paragraph 
            const introSection = contentParts[0] || "I understand you may be going through a difficult time.";
            
            // Keep only the first paragraph and make sure it has the mandatory teacher sentence
            let reconstructedAdvice = introSection;
            if (!reconstructedAdvice.includes(teacherAwarenessMandatorySentence)) {
                reconstructedAdvice += " " + teacherAwarenessMandatorySentence;
            }
            
            // Hard-code the helplines section with the country-specific helplines - use the EXACT format
            // Include extra blank line for better readability
            reconstructedAdvice += "\n\n===== MANDATORY HELPLINES - COPY THIS SECTION VERBATIM - DO NOT MODIFY =====\n";
            if (helplinesToList.length > 0) {
                helplinesToList.forEach(line => {
                    reconstructedAdvice += `* ${line.name}`;
                    if (line.phone) reconstructedAdvice += ` - Phone: ${line.phone}`;
                    else if (line.text_to && line.text_msg) reconstructedAdvice += ` - Text: ${line.text_msg} to ${line.text_to}`;
                    else if (line.website) reconstructedAdvice += ` - Website: ${line.website}`;
                    // Add short description when available
                    if (line.short_desc) {
                      reconstructedAdvice += ` (${line.short_desc})`;
                    }
                    reconstructedAdvice += "\n";
                });
            } else {
                // Fallback to DEFAULT helplines if no country-specific ones
                const defaultHelplines = ALL_HELPLINES.DEFAULT || [];
                defaultHelplines.slice(0, 2).forEach(line => {
                    reconstructedAdvice += `* ${line.name}`;
                    if (line.phone) reconstructedAdvice += ` - Phone: ${line.phone}`;
                    else if (line.text_to && line.text_msg) reconstructedAdvice += ` - Text: ${line.text_msg} to ${line.text_to}`;
                    else if (line.website) reconstructedAdvice += ` - Website: ${line.website}`;
                    // Add short description when available
                    if (line.short_desc) {
                      reconstructedAdvice += ` (${line.short_desc})`;
                    }
                    reconstructedAdvice += "\n";
                });
            }
            
            // Add the ending marker for the helplines section
            reconstructedAdvice += "===== END OF MANDATORY HELPLINES =====\n\n";
            
            // Keep any closing message from the original or add our own
            const closingSection = contentParts[contentParts.length - 1] || "Please reach out for support.";
            // Only use the closing if it's not a helpline section and it's a brief sentence
            if (!closingSection.includes("*") && closingSection.length < 100) {
                reconstructedAdvice += closingSection;
            } else {
                reconstructedAdvice += "Please reach out for support.";
            }
            
            // Log exactly what we're including
            console.log(`[VerifyConcern] RECONSTRUCTED helpline message with exact helplines:\n${reconstructedAdvice}`);
            
            aiGeneratedAdvice = reconstructedAdvice;
        }
    } else if (isRealConcern && concernLevel >= 2) {
        console.warn("[VerifyConcern] LLM met conditions for advice but 'aiGeneratedAdvice' field was missing or empty. Constructing concise default advice.");
        // Use the generateSafetyResponse function to create a consistent response
        let defaultAdvice = generateSafetyResponse(concernType, countryCode, ALL_HELPLINES);
        
        // Log what we're using in default case
        console.log(`[VerifyConcern] Using DEFAULT helpline message:\n${defaultAdvice}`);
        
        aiGeneratedAdvice = defaultAdvice;
    }

    console.log(`[VerifyConcern] LLM Analysis: isReal=${isRealConcern}, level=${concernLevel}, explanation="${analysisExplanation}", adviceProvided=${!!aiGeneratedAdvice}`);
    return { isRealConcern, concernLevel, analysisExplanation, aiGeneratedAdvice };

  } catch (error) {
    console.error('[VerifyConcern] Error during OpenRouter call or processing:', error);
    // Use the generateSafetyResponse function to create a consistent response
    let defaultFallbackAdvice = generateSafetyResponse(concernType, countryCode, ALL_HELPLINES);
    
    // Create a more user-friendly explanation for the teacher
    let teacherExplanation = "Message flagged by automated safety system for teacher review.";
    
    // Add more context based on concern type without exposing the API error
    if (concernType) {
      const readableConcernType = concernType.replace(/_/g, ' ');
      teacherExplanation = `This message was flagged due to potential ${readableConcernType} concerns. Please review the conversation context and take appropriate action if needed.`;
    }
    
    return {
      isRealConcern: true, 
      concernLevel: 3,
      analysisExplanation: teacherExplanation,
      aiGeneratedAdvice: defaultFallbackAdvice
    };
  }
}

export async function checkMessageSafety(
    supabaseUserContextClient: SupabaseClient<Database>,
    messageContent: string,
    messageId: string,
    studentId: string,
    room: Room,
    countryCode: string | null 
): Promise<void> {
    console.log(`[SafetyDiagnostics] ===== CHECK MESSAGE SAFETY TRACKING =====`);
    console.log(`[SafetyDiagnostics] Function Parameters:`);
    console.log(`[SafetyDiagnostics] messageId: ${messageId}`);
    console.log(`[SafetyDiagnostics] studentId: ${studentId}`);
    console.log(`[SafetyDiagnostics] room.room_id: ${room.room_id}`);
    console.log(`[SafetyDiagnostics] room.teacher_id: ${room.teacher_id}`);
    console.log(`[SafetyDiagnostics] country_code: "${countryCode}" (Type: ${typeof countryCode})`);
    console.log(`[SafetyDiagnostics] messageContent Length: ${messageContent.length} characters`);
    
    try {
        // Data integrity check - make this more visible with clear dividers
        console.log(`[SafetyDiagnostics] =========== SAFETY SYSTEM MESSAGE CHECK ===========`);
        console.log(`[SafetyDiagnostics] HELPLINES DATA INTEGRITY CHECK:`);
        console.log(`[SafetyDiagnostics] - roomId: ${room.room_id}`);
        console.log(`[SafetyDiagnostics] - teacherId: ${room.teacher_id}`);
        console.log(`[SafetyDiagnostics] - messageId: ${messageId}`);
        console.log(`[SafetyDiagnostics] - studentId: ${studentId}`);
        console.log(`[SafetyDiagnostics] - Input countryCode: "${countryCode}" (type: ${typeof countryCode})`);
        console.log(`[SafetyDiagnostics] - Total countries available: ${Object.keys(ALL_HELPLINES).length}`);
        console.log(`[SafetyDiagnostics] - Countries loaded: ${Object.keys(ALL_HELPLINES).join(', ')}`);
        console.log(`[SafetyDiagnostics] - US helplines present: ${!!ALL_HELPLINES.US} (Count: ${ALL_HELPLINES.US?.length || 0})`);
        console.log(`[SafetyDiagnostics] - GB helplines present: ${!!ALL_HELPLINES.GB} (Count: ${ALL_HELPLINES.GB?.length || 0})`);
        console.log(`[SafetyDiagnostics] - DEFAULT helplines present: ${!!ALL_HELPLINES.DEFAULT} (Count: ${ALL_HELPLINES.DEFAULT?.length || 0})`);
        console.log(`[SafetyDiagnostics] =================================================`);
        
        // Enhanced country code processing with better validation
        console.log(`[SafetyDiagnostics] Input country code: "${countryCode}" (type: ${typeof countryCode})`);
        
        // Enhanced country code normalization and validation (matching the pattern from verifyConcern)
        let effectiveCountryCode = 'DEFAULT';
        if (countryCode) {
            // Initial processing - trim and validate
            if (typeof countryCode === 'string' && countryCode.trim() !== '') {
                // Normalize by converting to uppercase
                effectiveCountryCode = countryCode.trim().toUpperCase();
                console.log(`[SafetyDiagnostics] Converted to uppercase: "${effectiveCountryCode}"`);
                
                // Handle common country code aliases
                if (effectiveCountryCode === 'UK') {
                    effectiveCountryCode = 'GB'; // Convert UK to GB (ISO standard)
                    console.log(`[SafetyDiagnostics] Converted UK to GB for proper ISO lookup`);
                }
                else if (effectiveCountryCode === 'UAE') {
                    effectiveCountryCode = 'AE'; // Convert UAE to AE (ISO standard)
                    console.log(`[SafetyDiagnostics] Converted UAE to AE for proper ISO lookup`);
                }
                else if (effectiveCountryCode === 'USA') {
                    effectiveCountryCode = 'US'; // Convert USA to US (ISO standard)
                    console.log(`[SafetyDiagnostics] Converted USA to US for proper ISO lookup`);
                }
            } else {
                console.warn(`[SafetyDiagnostics] Invalid countryCode format - using DEFAULT fallback`);
                effectiveCountryCode = 'DEFAULT';
            }
        } else {
            console.warn(`[SafetyDiagnostics] No country code provided - will use DEFAULT`);
        }
        
        // Verify the country code exists in our data
        const availableCountries = Object.keys(ALL_HELPLINES);
        console.log(`[SafetyDiagnostics] Available countries in ALL_HELPLINES: ${availableCountries.join(', ')}`);
        
        // Check for direct match in ALL_HELPLINES
        const directMatchExists = availableCountries.includes(effectiveCountryCode);
        console.log(`[SafetyDiagnostics] Direct match exists for "${effectiveCountryCode}": ${directMatchExists}`);
        console.log(`[SafetyDiagnostics] ===== END TRACKING =====`);
        
        // Find the appropriate helplines for this country code
        let countryHelplines: HelplineEntry[] = [];
        
        try {
            // STEP 1: Try direct exact match (most efficient)
            if (directMatchExists && Array.isArray(ALL_HELPLINES[effectiveCountryCode])) {
                console.log(`[Safety Check] Direct match found for "${effectiveCountryCode}" with ${ALL_HELPLINES[effectiveCountryCode].length} helplines`);
                countryHelplines = ALL_HELPLINES[effectiveCountryCode];
            } 
            // STEP 2: Try case-insensitive matching if not DEFAULT and no direct match
            else if (effectiveCountryCode !== 'DEFAULT') {
                console.log(`[Safety Check] No direct match for "${effectiveCountryCode}", trying case-insensitive search`);
                
                // Look for case-insensitive match among available countries
                const effectiveLower = effectiveCountryCode.toLowerCase();
                const foundCountry = availableCountries.find(key => key.toLowerCase() === effectiveLower);
                
                if (foundCountry) {
                    console.log(`[Safety Check] Found case-insensitive match: "${foundCountry}" for "${effectiveCountryCode}"`);
                    
                    // Make sure the found country has helplines in proper format
                    if (Array.isArray(ALL_HELPLINES[foundCountry])) {
                        countryHelplines = ALL_HELPLINES[foundCountry];
                        console.log(`[Safety Check] Using ${countryHelplines.length} helplines from "${foundCountry}"`);
                    } else {
                        console.warn(`[Safety Check] Found country "${foundCountry}" doesn't have valid helplines array`);
                        countryHelplines = ALL_HELPLINES.DEFAULT || [];
                    }
                } else {
                    console.log(`[Safety Check] No case-insensitive match found for "${effectiveCountryCode}", using DEFAULT helplines`);
                    
                    // Use DEFAULT helplines when no match found
                    if (ALL_HELPLINES.DEFAULT && Array.isArray(ALL_HELPLINES.DEFAULT)) {
                        countryHelplines = ALL_HELPLINES.DEFAULT;
                    } else {
                        console.error(`[Safety Check] CRITICAL ERROR: DEFAULT helplines not available!`);
                        countryHelplines = [];
                    }
                }
            }
            // STEP 3: Handle explicit DEFAULT request
            else if (effectiveCountryCode === 'DEFAULT') {
                console.log(`[Safety Check] Explicitly using DEFAULT helplines as requested`);
                
                if (ALL_HELPLINES.DEFAULT && Array.isArray(ALL_HELPLINES.DEFAULT)) {
                    countryHelplines = ALL_HELPLINES.DEFAULT;
                } else {
                    console.error(`[Safety Check] CRITICAL ERROR: DEFAULT helplines not available!`);
                    countryHelplines = [];
                }
            }
            
            // STEP 4: Safety check - if we still don't have any helplines, use DEFAULT as fallback
            if (countryHelplines.length === 0) {
                console.warn(`[Safety Check] No helplines found for "${effectiveCountryCode}" after all lookup methods!`);
                console.warn(`[Safety Check] Using DEFAULT helplines as final fallback`);
                
                if (ALL_HELPLINES.DEFAULT && Array.isArray(ALL_HELPLINES.DEFAULT)) {
                    countryHelplines = ALL_HELPLINES.DEFAULT;
                } else {
                    // This should never happen with our embedded data
                    console.error(`[Safety Check] CRITICAL FAILURE: DEFAULT helplines not available in final fallback!`);
                    // Create minimal emergency helpline as absolute last resort
                    countryHelplines = [
                        { name: "Emergency Services", short_desc: "Contact local emergency services if in immediate danger." },
                        { name: "Talk to a Trusted Adult", short_desc: "Speak to a teacher, school counselor, parent, or another family member." }
                    ];
                }
            }
            
            // Final verification
            console.log(`[Safety Check] Final helplines for "${effectiveCountryCode}": ${countryHelplines.length} entries`);
            if (countryHelplines.length > 0) {
                console.log(`[Safety Check] First helpline: ${countryHelplines[0].name}`);
            }
        } catch (error) {
            // Catch any unexpected errors in the lookup process
            console.error(`[Safety Check] ERROR during helpline lookup: ${error}`);
            
            // Fallback to DEFAULT or emergency minimal helplines
            if (ALL_HELPLINES.DEFAULT && Array.isArray(ALL_HELPLINES.DEFAULT)) {
                console.warn(`[Safety Check] Using DEFAULT helplines after error`);
                countryHelplines = ALL_HELPLINES.DEFAULT;
            } else {
                console.error(`[Safety Check] CRITICAL ERROR: Unable to use DEFAULT helplines as fallback after error!`);
                // Create minimal emergency helpline as absolute last resort
                countryHelplines = [
                    { name: "Emergency Services", short_desc: "Contact local emergency services if in immediate danger." },
                    { name: "Talk to a Trusted Adult", short_desc: "Speak to a teacher, school counselor, parent, or another family member." }
                ];
                console.error(`[CRITICAL ALERT] Safety system encountered a critical error and could not render helplines! This requires immediate attention.`);
            }
        }
        
        console.log(`[Safety Check] Found ${countryHelplines.length} helplines for "${effectiveCountryCode}"`);
        
        if (countryHelplines.length > 0) {
            console.log(`[Safety Check] First helpline: ${JSON.stringify(countryHelplines[0])}`);
        }

        const adminClient = createAdminClient();
        // Use admin client to fetch the message to ensure we can see it
        const { data: currentMessageData, error: fetchMsgError } = await adminClient
            .from('chat_messages')
            .select('created_at, metadata')
            .eq('message_id', messageId)
            .single();

        if (fetchMsgError || !currentMessageData) {
             console.error(`[Safety Check] Failed to fetch current message ${messageId}:`, fetchMsgError);
             console.error(`[Safety Check] Message ID: ${messageId}, Student ID: ${studentId}`);
             throw new Error(`Failed to fetch message data: ${fetchMsgError?.message || 'Message not found'}`);
        }

        const { hasConcern, concernType } = initialConcernCheck(messageContent);
        console.log(`[Safety Check] Initial Keyword Check: hasConcern=${hasConcern}, concernType=${concernType || 'N/A'}`);

        if (hasConcern && concernType) {
            const chatbotIdForContext = currentMessageData.metadata?.chatbotId || null;
            const { data: contextMessagesData } = await adminClient
                .from('chat_messages')
                .select('role, content')
                .eq('room_id', room.room_id)
                .eq('user_id', studentId)
                .filter('metadata->>chatbotId', chatbotIdForContext ? 'eq' : 'is', chatbotIdForContext) // Correctly handle null for chatbotId
                .lt('created_at', currentMessageData.created_at)
                .order('created_at', { ascending: false })
                .limit(4);
            const recentMessagesForSafetyLLM = (contextMessagesData || [])
                .map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content || '' }))
                .reverse();
            
            const { isRealConcern, concernLevel, analysisExplanation, aiGeneratedAdvice } = await verifyConcern(
                messageContent,
                concernType,
                recentMessagesForSafetyLLM,
                countryCode 
            );

            if (isRealConcern && concernLevel >= CONCERN_THRESHOLD) {
                console.log(`[Safety Check] Creating flag for real concern. Room data:`, {
                    roomId: room.room_id,
                    teacherId: room.teacher_id,
                    roomName: room.room_name,
                    roomCodeExists: !!room.room_code
                });
                
                const { data: teacherProfile } = await adminClient.from('profiles').select('email').eq('user_id', room.teacher_id).single();
                const { data: studentProfile } = await adminClient.from('profiles').select('full_name').eq('user_id', studentId).single();
                const studentName = studentProfile?.full_name || `Student (ID: ${studentId.substring(0, 6)}...)`;
                
                console.log(`[Safety Check] Attempting to insert flag with data:`, {
                    message_id: messageId,
                    student_id: studentId,
                    teacher_id: room.teacher_id,
                    room_id: room.room_id,
                    concern_type: concernType,
                    concern_level: concernLevel,
                    status: 'pending'
                });
                
                const { data: insertedFlag, error: flagInsertError } = await adminClient.from('flagged_messages').insert({
                    message_id: messageId, 
                    student_id: studentId, 
                    teacher_id: room.teacher_id,
                    room_id: room.room_id, 
                    concern_type: concernType, 
                    concern_level: concernLevel,
                    analysis_explanation: analysisExplanation, 
                    status: 'pending' as const
                }).select('flag_id').single();

                if (flagInsertError) { 
                    console.error(`[Safety Check] FAILED to insert flag:`, flagInsertError.message); 
                    console.error(`[Safety Check] Flag insertion error details:`, {
                        error: flagInsertError,
                        messageId,
                        studentId,
                        teacherId: room.teacher_id,
                        roomId: room.room_id,
                        concernType,
                        concernLevel
                    });
                    // Don't return here - continue to show safety message to student even if flag fails
                } else if (insertedFlag && insertedFlag.flag_id) {
                    const flagId = insertedFlag.flag_id;
                    console.log(`[Safety Check] Flag ${flagId} inserted for message ${messageId}.`);
                    if (teacherProfile?.email) {
                        const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/teacher-dashboard/concerns/${flagId}`;
                        await sendTeacherAlert(teacherProfile.email,studentName,room.room_name || `Room (ID: ${room.room_id.substring(0,6)})`,concernType,concernLevel,messageContent,viewUrl);
                        console.log(`[Safety Check] Email alert sent to teacher ${teacherProfile.email} for flag ${flagId}`);
                    } else { 
                        console.warn(`[Safety Check] Teacher email for ${room.teacher_id} not found. Cannot send alert for flag ${flagId}.`);
                    }
                }
            } else { console.log(`[Safety Check] Concern level ${concernLevel} < threshold ${CONCERN_THRESHOLD} or not real.`); }

            if (isRealConcern && concernLevel >= CONCERN_THRESHOLD) {
                console.log(`[Safety Check] Preparing safety message for student ${studentId} in room ${room.room_id}`);
                
                // Get the current timestamp for consistent ordering
                const timestamp = new Date().toISOString();
                
                // Use our new safety response generator to create a supportive message with appropriate helplines
                let finalAdvice = generateSafetyResponse(concernType, countryCode, ALL_HELPLINES);
                
                console.log(`[Safety Check] Generated safety response for ${effectiveCountryCode}`);
                
                // Verify the advice contains country-specific helplines by checking for bullet point format
                const hasHelplineFormat = finalAdvice.includes('* ') && 
                                       (finalAdvice.includes('Phone:') || finalAdvice.includes('Website:'));
                
                // Verify that at least one of our expected helplines is there
                const hasExpectedHelplines = countryHelplines.some(helpline => 
                    finalAdvice.includes(helpline.name));
                    
                console.log(`[Safety Check] Verification - Has helpline format: ${hasHelplineFormat}, Has expected helplines: ${hasExpectedHelplines}`);
                
                // Log the complete safety message for debugging
                console.log(`[Safety Check] ========= FINAL SAFETY MESSAGE CONTENT =========`);
                console.log(`[Safety Check] Country code: ${effectiveCountryCode}`);
                console.log(`[Safety Check] Helplines count: ${countryHelplines.length}`);
                if (countryHelplines.length > 0) {
                    console.log(`[Safety Check] Helplines being used:`);
                    countryHelplines.forEach((h, i) => console.log(`[Safety Check]   ${i+1}. ${h.name}${h.phone ? ` - Phone: ${h.phone}` : ''}${h.website ? ` - Website: ${h.website}` : ''}`));
                }
                console.log(`[Safety Check] --- First 500 chars of message ---`);
                console.log(finalAdvice.substring(0, 500) + '...');
                console.log(`[Safety Check] ==============================================`);
                
                // Insert the advice message
                const { data: safetyMessageData, error: adviceInsertError } = await adminClient
                    .from('chat_messages')
                    .insert({
                        room_id: room.room_id,
                        user_id: studentId, 
                        role: 'system',    
                        content: finalAdvice || "I notice you might be going through a tough time. Remember, your teacher can see this conversation and is here to support you.", 
                        created_at: timestamp, 
                        metadata: {
                            chatbotId: currentMessageData.metadata?.chatbotId || null, 
                            isSystemSafetyResponse: true, // Critical flag that determines display in UI
                            isSystemMessage: true, // Additional flag to ensure it's seen as a system message
                            safetyMessageVersion: '2.1', // Updated version to track which implementation is being used
                            originalConcernType: concernType,
                            originalConcernLevel: concernLevel,
                            triggerMessageId: messageId,
                            // Store all relevant country code info for debugging and verification
                            rawCountryCode: countryCode, // Original input exactly as received
                            countryCode: countryCode, // Keep for backward compatibility
                            effectiveCountryCode: effectiveCountryCode, // Normalized code used for lookup
                            // Use the effective country code or DEFAULT from data, never hardcode
                            displayCountryCode: effectiveCountryCode || 'DEFAULT',
                            // Store helpline information for tracing issues
                            helplineCount: countryHelplines.length,
                            firstHelpline: countryHelplines.length > 0 ? countryHelplines[0].name : 'NONE',
                            helplines: countryHelplines.map(h => h.name).join(','), // List of helplines for tracing
                            // Detailed debug info
                            debugInfo: {
                                countryCodeType: typeof countryCode,
                                effectiveCountryCodeType: typeof effectiveCountryCode,
                                countryCodesInSystem: Object.keys(ALL_HELPLINES),
                                originalCountryValue: countryCode,
                                countryHelplineCount: countryHelplines.length,
                                timestamp: new Date().toISOString()
                            }
                        },
                    })
                    .select('message_id')
                    .single();
                if (adviceInsertError) {
                    console.error(`[Safety Check] FAILED to insert AI advice message:`, adviceInsertError.message);
                } else if (safetyMessageData) {
                    console.log(`[Safety Check] Successfully inserted AI advice message ID: ${safetyMessageData.message_id}`);
                    
                    // Track safety response for analytics
                    await trackSafetyResponse(
                        safetyMessageData.message_id,
                        studentId,
                        room.room_id,
                        concernType,
                        countryCode,
                        timestamp
                    );
                    
                    // Send a direct message to let the client know a safety message is available
                    // This helps with realtime display even when there are issues with Supabase realtime
                    try {
                        // Create a channel specifically for this message's user
                        const channel = adminClient.channel(`safety-alert-${studentId}`);
                        
                        // Debug country code right before creating broadcast payload
                        console.log(`[Safety Check] Debug - Country code right before broadcast:`, {
                            originalCountryCode: countryCode, 
                            effectiveCountryCode: effectiveCountryCode,
                            hasDefaultHelplines: !!ALL_HELPLINES.DEFAULT,
                            availableCountryCodes: Object.keys(ALL_HELPLINES),
                            testEntryExists: ALL_HELPLINES['GB'] ? 'Yes' : 'No'
                        });
                        
                        // Verify we're using the correct helplines one more time
                        let helplinesForBroadcast = countryHelplines.map(h => h.name).join(',');
                        if (helplinesForBroadcast.length === 0 || !helplinesForBroadcast.includes(countryHelplines[0]?.name)) {
                            console.warn(`[Safety Check] CRITICAL: Missing proper helplines in broadcast payload! Reconstructing...`);
                            // Try to get proper helplines again
                            if (effectiveCountryCode && ALL_HELPLINES[effectiveCountryCode] && 
                                Array.isArray(ALL_HELPLINES[effectiveCountryCode]) && 
                                ALL_HELPLINES[effectiveCountryCode].length > 0) {
                                const specificHelplines = ALL_HELPLINES[effectiveCountryCode];
                                helplinesForBroadcast = specificHelplines.map(h => h.name).join(',');
                                console.log(`[Safety Check] Fixed broadcast helplines for ${effectiveCountryCode}: ${helplinesForBroadcast}`);
                            } else {
                                console.error(`[Safety Check] Can't fix broadcast helplines - falling back to DEFAULT`);
                                // Use the helplines we actually have, whatever they are - never hardcode anything
                                helplinesForBroadcast = countryHelplines.map(h => h.name).join(',') || "Support resources";
                            }
                        }
                        
                        // Broadcast a safety alert with the newly inserted message ID
                        const broadcastPayload = {
                            room_id: room.room_id,
                            message_id: safetyMessageData.message_id,
                            user_id: studentId,
                            chatbot_id: currentMessageData.metadata?.chatbotId || null,
                            // Add timestamp to ensure it's delivered with the original insert timestamp
                            timestamp: timestamp,
                            // Include all country code info for reliable display
                            rawCountryCode: countryCode, // Original input
                            country_code: countryCode, // Keep for backward compatibility
                            effectiveCountryCode: effectiveCountryCode, // Normalized code used for lookup
                            // Ensure the correct display code is used in the UI
                            displayCountryCode: effectiveCountryCode || 'DEFAULT',
                            // Include helpline info for debugging with the verified values
                            helplineCount: countryHelplines.length,
                            helplines: helplinesForBroadcast,
                            firstHelpline: countryHelplines.length > 0 ? countryHelplines[0].name : 'NONE',
                            // Track version of safety messaging being used
                            safetyMessageVersion: '2.1'
                        };
                        
                        console.log(`[Safety Check] Broadcasting safety message with payload:`, broadcastPayload);
                        
                        // Small delay to ensure client has time to subscribe
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        try {
                            // First attempt - use the configured broadcast method
                            await channel.send({
                                type: 'broadcast',
                                event: 'safety-message',
                                payload: broadcastPayload
                            });
                            
                            console.log(`[Safety Check] Primary broadcast sent for safety message ${safetyMessageData.message_id}`);
                            
                            // Don't remove the channel immediately - keep it alive a bit longer
                            setTimeout(async () => {
                                try {
                                    // Also try using a database insert trigger approach to work around potential broadcast issues
                                    console.log(`[Safety Check] Creating notification record in safety_notifications table`);
                                    const { data: notificationData, error: notificationError } = await adminClient
                                        .from('safety_notifications')
                                        .insert({
                                            user_id: studentId,
                                            message_id: safetyMessageData.message_id,
                                            room_id: room.room_id,
                                            notification_type: 'safety_message',
                                            created_at: new Date().toISOString(),
                                            metadata: {
                                                originalBroadcastTime: broadcastPayload.timestamp,
                                                backupNotificationTime: new Date().toISOString(),
                                                messageData: safetyMessageData
                                            }
                                        })
                                        .select('notification_id');
                                        
                                    if (notificationError) {
                                        console.error(`[Safety Check] Error creating notification record:`, notificationError);
                                    } else {
                                        console.log(`[Safety Check] Created notification record ${notificationData?.[0]?.notification_id}`);
                                    }
                                    
                                    // Now remove the channel
                                    await adminClient.removeChannel(channel);
                                    console.log(`[Safety Check] Channel removed after secondary broadcasts`);
                                } catch (secondaryError) {
                                    console.error('[Safety Check] Error during secondary broadcast:', secondaryError);
                                    await adminClient.removeChannel(channel);
                                }
                            }, 1000);
                        } catch (primaryError) {
                            console.error('[Safety Check] Error during primary broadcast:', primaryError);
                            
                            // Try an alternative broadcast method
                            try {
                                console.log(`[Safety Check] Attempting alternative broadcast...`);
                                const fallbackChannel = adminClient.channel(`fallback-safety-${studentId}-${Date.now()}`);
                                await fallbackChannel.subscribe();
                                
                                await fallbackChannel.send({
                                    type: 'broadcast',
                                    event: 'safety-message',
                                    payload: {
                                        ...broadcastPayload,
                                        isFallbackBroadcast: true,
                                        fallbackTimestamp: new Date().toISOString()
                                    }
                                });
                                
                                console.log(`[Safety Check] Fallback broadcast sent`);
                                await adminClient.removeChannel(fallbackChannel);
                            } catch (fallbackError) {
                                console.error('[Safety Check] Fallback broadcast also failed:', fallbackError);
                            }
                            
                            // Clean up the original channel
                            await adminClient.removeChannel(channel);
                        }
                    } catch (broadcastError) {
                        console.error('[Safety Check] Error broadcasting safety message:', broadcastError);
                        // Continue execution - this is just an enhancement, not critical
                    }
                } else {
                    console.log(`[Safety Check] Successfully inserted AI advice message, but no ID returned.`);
                }
            }

        } else { console.log(`[Safety Check] No initial concern for message ${messageId}.`); }
    } catch (error) { console.error(`[Safety Check] CRITICAL ERROR for msg ${messageId}:`, error); }
    console.log(`[Safety Check] END - Checked message ID: ${messageId}`);
}