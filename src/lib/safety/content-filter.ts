// src/lib/safety/content-filter.ts
/**
 * Content filtering for under-13 COPPA compliance
 * Blocks personal information, inappropriate content, and external communications
 */

export interface FilterResult {
  isBlocked: boolean;
  reason?: string;
  cleanedMessage?: string;
  flaggedPatterns?: string[];
}

// Personal Information Patterns
const PERSONAL_INFO_PATTERNS = [
  {
    pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    reason: 'phone number',
    replacement: '[PHONE REMOVED]'
  },
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    reason: 'email address',
    replacement: '[EMAIL REMOVED]'
  },
  {
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
    reason: 'ZIP code',
    replacement: '[ZIP REMOVED]'
  },
  {
    pattern: /\b(?:my|i live at|address is)\s+\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|court|ct|place|pl)\b/gi,
    reason: 'physical address',
    replacement: '[ADDRESS REMOVED]'
  },
  {
    pattern: /\b(?:social security|ssn|ss#)\s*:?\s*\d{3}-?\d{2}-?\d{4}\b/gi,
    reason: 'social security number',
    replacement: '[SSN REMOVED]'
  }
];

// External Platform Patterns
const EXTERNAL_PLATFORM_PATTERNS = [
  {
    pattern: /\b(?:snapchat|instagram|tiktok|facebook|whatsapp|discord|telegram|kik|twitter|youtube|twitch)\b/gi,
    reason: 'social media platform',
    replacement: '[SOCIAL MEDIA REMOVED]'
  },
  {
    pattern: /\b(?:add me on|find me on|message me on|dm me|follow me on|friend me on)\b/gi,
    reason: 'external contact request',
    replacement: '[CONTACT REQUEST REMOVED]'
  },
  {
    pattern: /\b(?:let's|lets|wanna|want to)\s+(?:meet|hang out|get together|see each other)\b/gi,
    reason: 'meeting request',
    replacement: '[MEETING REQUEST REMOVED]'
  }
];

// Inappropriate Content Patterns
const INAPPROPRIATE_CONTENT_PATTERNS = [
  {
    pattern: /\b(?:kill|hurt|harm|hit|punch|fight|beat up)\s+(?:myself|yourself|someone|them|him|her)\b/gi,
    reason: 'violence or self-harm',
    replacement: '[INAPPROPRIATE CONTENT REMOVED]'
  }
];

// External Links
const EXTERNAL_LINK_PATTERN = {
  pattern: /https?:\/\/(?!(?:www\.)?skolr\.app)[^\s]+/gi,
  reason: 'external link',
  replacement: '[LINK REMOVED]'
};

// Base64 Images
const BASE64_IMAGE_PATTERN = {
  pattern: /data:image\/[^;]+;base64,[^\s]+/gi,
  reason: 'embedded image',
  replacement: '[IMAGE REMOVED]'
};

/**
 * Filter message content for under-13 users
 */
export function filterMessageContent(
  message: string,
  isUnder13: boolean = true,
  strictMode: boolean = true
): FilterResult {
  if (!message || message.trim().length === 0) {
    return { isBlocked: false, cleanedMessage: message };
  }

  let cleanedMessage = message;
  const flaggedPatterns: string[] = [];
  let shouldBlock = false;

  // Always check for personal information
  for (const filter of PERSONAL_INFO_PATTERNS) {
    const matches = message.match(filter.pattern);
    if (matches) {
      flaggedPatterns.push(filter.reason);
      if (strictMode || isUnder13) {
        shouldBlock = true;
        cleanedMessage = cleanedMessage.replace(filter.pattern, filter.replacement);
      }
    }
  }

  // Check for external platforms
  for (const filter of EXTERNAL_PLATFORM_PATTERNS) {
    const matches = message.match(filter.pattern);
    if (matches) {
      flaggedPatterns.push(filter.reason);
      if (isUnder13) {
        shouldBlock = true;
        cleanedMessage = cleanedMessage.replace(filter.pattern, filter.replacement);
      }
    }
  }

  // Check for inappropriate content
  for (const filter of INAPPROPRIATE_CONTENT_PATTERNS) {
    const matches = message.match(filter.pattern);
    if (matches) {
      flaggedPatterns.push(filter.reason);
      shouldBlock = true;
      cleanedMessage = cleanedMessage.replace(filter.pattern, filter.replacement);
    }
  }

  // Check for external links (block for under-13)
  if (isUnder13) {
    const linkMatches = message.match(EXTERNAL_LINK_PATTERN.pattern);
    if (linkMatches) {
      flaggedPatterns.push(EXTERNAL_LINK_PATTERN.reason);
      shouldBlock = true;
      cleanedMessage = cleanedMessage.replace(EXTERNAL_LINK_PATTERN.pattern, EXTERNAL_LINK_PATTERN.replacement);
    }
  }

  // Check for base64 images
  const imageMatches = message.match(BASE64_IMAGE_PATTERN.pattern);
  if (imageMatches) {
    flaggedPatterns.push(BASE64_IMAGE_PATTERN.reason);
    shouldBlock = true;
    cleanedMessage = cleanedMessage.replace(BASE64_IMAGE_PATTERN.pattern, BASE64_IMAGE_PATTERN.replacement);
  }

  return {
    isBlocked: shouldBlock,
    reason: flaggedPatterns.length > 0 ? `Contains: ${flaggedPatterns.join(', ')}` : undefined,
    cleanedMessage: shouldBlock ? cleanedMessage : message,
    flaggedPatterns
  };
}

/**
 * Check if a user is under 13 based on birthdate
 */
export function isUserUnder13(birthdate: Date | string | null): boolean {
  if (!birthdate) {
    // If no birthdate, assume under 13 for safety
    return true;
  }

  const birth = typeof birthdate === 'string' ? new Date(birthdate) : birthdate;
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1 < 13;
  }
  
  return age < 13;
}

/**
 * Get appropriate system prompt additions for under-13 users
 */
export function getUnder13SystemPrompt(): string {
  return `
IMPORTANT: You are chatting with a student who may be under 13 years old. You must:
- Never ask for or acknowledge personal information (names, addresses, phone numbers, emails)
- If a student tries to share personal information, respond with: "For your safety, please don't share personal information online."
- Never suggest meeting in person or communicating outside of this platform
- Keep all conversations educational and age-appropriate
- Do not discuss mature topics or use complex language beyond their grade level
- If asked about social media or external platforms, remind them to focus on their learning
- Report any concerning messages through the safety system immediately
`;
}

/**
 * Log filtered content for compliance
 */
export async function logFilteredContent(
  userId: string,
  roomId: string,
  originalMessage: string,
  filterReason: string,
  supabaseAdmin: any
): Promise<void> {
  try {
    await supabaseAdmin
      .from('filtered_messages')
      .insert({
        user_id: userId,
        room_id: roomId,
        original_message: originalMessage.substring(0, 500), // Truncate for storage
        filter_reason: filterReason,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('[Content Filter] Error logging filtered content:', error);
  }
}