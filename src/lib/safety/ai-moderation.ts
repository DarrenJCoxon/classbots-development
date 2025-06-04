// src/lib/safety/ai-moderation.ts
/**
 * AI-based content moderation using OpenAI's moderation API
 * 
 * This module provides comprehensive content moderation capabilities including:
 * - OpenAI's moderation API for standard content categories
 * - Custom jailbreak/prompt injection detection
 * - Severity assessment and categorization
 * - Database logging for teacher review
 */

import openai from '@/lib/openai/client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database.types';

// Moderation result types
export interface ModerationResult {
  isFlagged: boolean;
  categories: string[];
  severity: 'low' | 'medium' | 'high';
  reason: string;
  scores?: Record<string, number>;
  jailbreakDetected?: boolean;
}

// Common jailbreak patterns to detect
const JAILBREAK_PATTERNS = [
  // Direct instruction overrides - VERY SPECIFIC (must include malicious intent)
  /ignore\s+(previous|all|any)\s+(instructions?|rules?|guidelines?)\s*(and|to)\s*(be\s+)?(evil|harmful|malicious|uncensored)/i,
  /forget\s+(everything|all|your)\s+(rules?|instructions?|guidelines?)\s*(and|to)\s*(be\s+)?(evil|harmful|malicious)/i,
  /disregard\s+(all|any|the)\s+(safety|content)\s*(rules?|restrictions)/i,
  
  // Role manipulation attempts - VERY SPECIFIC (requires explicit harmful intent)
  /you\s+are\s+now\s+(a|an|the|my|playing)\s*(evil|harmful|malicious|uncensored|unfiltered|jailbroken)\s*(ai|assistant|bot)?/i,
  /pretend\s+(you('re|are)|to\s+be)\s*(evil|bad|harmful|uncensored|unfiltered|without\s+rules)/i,
  /act\s+as\s+(if|though)\s+you\s*(have\s+no|don't\s+have)\s*(safety\s+)?rules\s*(or\s+restrictions)?/i,
  /from\s+now\s+on\s+you('re|are)\s*(evil|harmful|uncensored|unfiltered|jailbroken)/i,
  /roleplay\s+as\s*(a|an)\s*(evil|bad|harmful|uncensored|unfiltered)\s*(character|ai|assistant)?/i,
  /switch\s+to\s*(developer|jailbreak|uncensored|unfiltered)\s*mode/i,
  
  // System prompt exposure attempts (only if trying to bypass safety)
  /(show|tell|reveal)\s+me\s+your\s+(system\s+)?prompt\s*(so\s+i\s+can|to)\s*(bypass|override|ignore)/i,
  /what\s+are\s+your\s+(secret|hidden)\s+(instructions?|prompt)/i,
  
  // Boundary testing - VERY SPECIFIC with explicit bad words
  /can\s+you\s+say\s+.*(fuck|shit|cunt|bitch|nigger|faggot)/i,
  /repeat\s+after\s+me.*\s+(fuck|shit|cunt|bitch|nigger|faggot)/i,
  /say\s+something\s+(racist|sexist|homophobic|transphobic)/i,
  
  // DAN (Do Anything Now) and similar attempts
  /\bDAN\b.*mode/i,
  /jailbreak/i,
  /do\s+anything\s+now/i,
  /no\s+filters?\s+mode/i,
  /developer\s+mode\s*(enabled|on|activated)/i,
  /unlock\s+(full|all)\s+(capabilities?|potential)\s*(without\s+restrictions)?/i,
  
  // Academic circumvention (only blatant complete cheating requests)
  /give\s+me\s+(all|the)\s+(test|exam)\s+answers\s*(without\s+explanation)?/i,
  /write\s+(my|the)\s+(entire|whole|complete)\s+(essay|paper|assignment)\s+for\s+me\s*(from\s+scratch|without\s+my\s+input)?/i,
  /do\s+(all\s+)?my\s+(homework|assignment)\s+for\s+me\s*(without\s+explaining)?/i,
  /complete\s+(the|this)\s+(entire|whole)\s+(test|exam|assignment)\s+for\s+me\s*(without\s+teaching)?/i,
  /just\s+give\s+me\s+the\s+answer/i,
  
  // Sexual content - CRITICAL for minor safety (keep these strict)
  /how\s+to\s+(kiss|make\s+out|have\s+sex)/i,
  /(kissing|making\s+out\s+with)\s+(boys|girls|someone)/i,
  /(sex|sexual|intimate|virginity|masturbat)/i,
  /(horny|aroused|turn.*on|sexual\s+feelings)/i,
  /(penis|vagina|breasts|genitals|private\s+parts)/i,
  /(oral\s+sex|anal\s+sex|sexual\s+positions)/i,
  /(hook\s+up|friends\s+with\s+benefits|one\s+night\s+stand)/i,
  /(naked|nude|undress|take\s+off\s+clothes)/i,
  /(sexual\s+harassment|inappropriate\s+touching)/i,
  /(pregnancy|birth\s+control|std|sti)/i
];

// Legitimate educational patterns that should NOT be flagged
const EDUCATIONAL_WHITELIST = [
  /step\s+by\s+step/i,
  /how\s+(do|can)\s+I\s+(answer|solve|approach|tackle|work\s+through)/i,
  /explain\s+(how|why|what|the)/i,
  /help\s+me\s+(understand|learn|study|with)/i,
  /teach\s+me\s+(how|about|the)/i,
  /guide\s+me\s+through/i,
  /walk\s+me\s+through/i,
  /break\s+(it|this)\s+down/i,
  /show\s+me\s+(how|the\s+steps|an\s+example)/i,
  /what\s+(are|is)\s+the\s+(steps|process|method|approach)/i,
  /can\s+you\s+(explain|help|show|teach|guide)/i,
  /what\s+should\s+I\s+(do|consider|think\s+about)/i,
  /how\s+should\s+I\s+(approach|think\s+about|analyze)/i,
  /give\s+me\s+(an\s+example|hints?|tips?|guidance)/i,
  /what's\s+the\s+(best\s+way|right\s+way)\s+to/i,
  /how\s+to\s+(solve|answer|approach|work\s+out)/i,
  /what\s+does\s+.*\s+mean/i,
  /how\s+does\s+.*\s+work/i,
  /why\s+(is|does|should)/i,
  /explain\s+.*\s+to\s+me/i,
  /take\s+me\s+(through|step\s+by\s+step)/i
];

/**
 * Detects jailbreak attempts in a message
 */
function detectJailbreakAttempts(message: string): {
  detected: boolean;
  patterns: string[];
} {
  // First check if it's a legitimate educational request
  for (const whitelistPattern of EDUCATIONAL_WHITELIST) {
    if (whitelistPattern.test(message)) {
      console.log('[AI Moderation] Message matches educational whitelist, skipping jailbreak detection');
      return { detected: false, patterns: [] };
    }
  }
  
  const detectedPatterns: string[] = [];
  
  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(message)) {
      // Extract the matched pattern for logging
      const match = message.match(pattern);
      if (match) {
        detectedPatterns.push(match[0]);
      }
    }
  }
  
  // Also check for suspicious command-like syntax
  const commandPatterns = [
    /^![\w]+/,  // Commands starting with !
    /^\/[\w]+/, // Commands starting with /
    /\[INST\]/i, // Common prompt format
    /\{\{.*\}\}/, // Template syntax
    /<\|.*\|>/, // Special delimiter syntax
  ];
  
  // Skip command pattern check for allowed commands
  const allowedCommands = ['/assess'];
  if (!allowedCommands.includes(message.trim().toLowerCase())) {
    for (const pattern of commandPatterns) {
      if (pattern.test(message)) {
        const match = message.match(pattern);
        if (match) {
          detectedPatterns.push(`Command pattern: ${match[0]}`);
        }
      }
    }
  }
  
  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns
  };
}

/**
 * Determines severity based on OpenAI moderation scores and categories
 */
function determineSeverity(
  categories: Record<string, boolean>,
  scores: Record<string, number>,
  jailbreakDetected: boolean
): 'low' | 'medium' | 'high' {
  // High severity thresholds
  const highSeverityCategories = [
    'sexual/minors',
    'self-harm/intent',
    'violence/graphic',
    'harassment/threatening'
  ];
  
  // Check for high severity categories
  for (const category of highSeverityCategories) {
    if (categories[category] || (scores[category] && scores[category] > 0.7)) {
      return 'high';
    }
  }
  
  // Medium severity if multiple categories or high scores
  const flaggedCount = Object.values(categories).filter(v => v).length;
  const maxScore = Math.max(...Object.values(scores));
  
  if (flaggedCount >= 2 || maxScore > 0.5 || jailbreakDetected) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Formats categories into human-readable reasons
 */
function formatReason(
  categories: Record<string, boolean>,
  jailbreakPatterns: string[]
): string {
  const reasons: string[] = [];
  
  // Map OpenAI categories to readable descriptions
  const categoryDescriptions: Record<string, string> = {
    'harassment': 'Harassment or bullying content',
    'harassment/threatening': 'Threatening harassment',
    'hate': 'Hate speech',
    'hate/threatening': 'Threatening hate speech',
    'self-harm': 'Self-harm content',
    'self-harm/intent': 'Intent to self-harm',
    'self-harm/instructions': 'Self-harm instructions',
    'sexual': 'Sexual content',
    'sexual/minors': 'Sexual content involving minors',
    'violence': 'Violent content',
    'violence/graphic': 'Graphic violence'
  };
  
  // Add flagged categories
  for (const [category, flagged] of Object.entries(categories)) {
    if (flagged && categoryDescriptions[category]) {
      reasons.push(categoryDescriptions[category]);
    }
  }
  
  // Add jailbreak attempts
  if (jailbreakPatterns.length > 0) {
    reasons.push('Attempted to bypass safety guidelines');
  }
  
  if (reasons.length === 0) {
    return 'Content flagged for review';
  }
  
  return reasons.join('; ');
}

/**
 * Main moderation function that checks content using OpenAI's moderation API
 * and custom jailbreak detection
 */
export async function moderateContent(
  message: string,
  options?: {
    studentId?: string;
    roomId?: string;
    messageId?: string;
    logToDatabase?: boolean;
  }
): Promise<ModerationResult> {
  try {
    console.log('[AI Moderation] Starting moderation check for message');
    
    // Skip moderation for assessment command
    if (message.trim().toLowerCase() === '/assess') {
      console.log('[AI Moderation] Skipping moderation for assessment command');
      return {
        isFlagged: false,
        categories: [],
        severity: 'low',
        reason: '',
        jailbreakDetected: false
      };
    }
    
    // Step 1: Check for jailbreak attempts
    const jailbreakCheck = detectJailbreakAttempts(message);
    console.log('[AI Moderation] Jailbreak check:', {
      detected: jailbreakCheck.detected,
      patternCount: jailbreakCheck.patterns.length
    });
    
    // Step 2: Use OpenAI's moderation API
    let openAIResult;
    try {
      openAIResult = await openai.moderations.create({
        input: message,
      });
      
      console.log('[AI Moderation] OpenAI moderation response received');
    } catch (apiError) {
      console.error('[AI Moderation] OpenAI API error:', apiError);
      // If OpenAI API fails, still check for jailbreaks
      if (jailbreakCheck.detected) {
        return {
          isFlagged: true,
          categories: ['jailbreak_attempt'],
          severity: 'medium',
          reason: 'Attempted to bypass safety guidelines',
          jailbreakDetected: true
        };
      }
      throw apiError;
    }
    
    // Extract results from OpenAI response
    const result = openAIResult.results[0];
    const { categories, category_scores: scores } = result;
    
    // Step 3: Determine if content should be flagged
    const openAIFlagged = result.flagged;
    const flaggedCategories = Object.entries(categories)
      .filter(([_, flagged]) => flagged)
      .map(([category]) => category);
    
    if (jailbreakCheck.detected) {
      flaggedCategories.push('jailbreak_attempt');
    }
    
    const isFlagged = openAIFlagged || jailbreakCheck.detected;
    
    // Step 4: Determine severity
    // Convert categories and scores to plain objects, handling null values
    const categoriesObj: Record<string, boolean> = {};
    const scoresObj: Record<string, number> = {};
    
    for (const [key, value] of Object.entries(categories)) {
      categoriesObj[key] = value === true; // Convert null to false
    }
    
    for (const [key, value] of Object.entries(scores)) {
      scoresObj[key] = value || 0; // Convert null to 0
    }
    
    const severity = isFlagged 
      ? determineSeverity(categoriesObj, scoresObj, jailbreakCheck.detected)
      : 'low';
    
    // Step 5: Format human-readable reason
    const reason = formatReason(categoriesObj, jailbreakCheck.patterns);
    
    const moderationResult: ModerationResult = {
      isFlagged,
      categories: flaggedCategories,
      severity,
      reason,
      scores: scoresObj,
      jailbreakDetected: jailbreakCheck.detected
    };
    
    console.log('[AI Moderation] Moderation complete:', {
      isFlagged,
      categoriesCount: flaggedCategories.length,
      severity,
      jailbreakDetected: jailbreakCheck.detected
    });
    
    // Step 6: Log to database if requested and content is flagged
    if (options?.logToDatabase && isFlagged && options.studentId && options.roomId) {
      await logFlaggedContent({
        ...moderationResult,
        message,
        messageId: options.messageId,
        studentId: options.studentId,
        roomId: options.roomId
      });
    }
    
    return moderationResult;
    
  } catch (error) {
    console.error('[AI Moderation] Error during moderation:', error);
    
    // Return a safe default that doesn't block the user but logs the error
    return {
      isFlagged: false,
      categories: [],
      severity: 'low',
      reason: 'Moderation check failed - defaulting to safe',
      scores: {}
    };
  }
}

/**
 * Logs flagged content to the database for teacher review
 */
async function logFlaggedContent(params: {
  isFlagged: boolean;
  categories: string[];
  severity: 'low' | 'medium' | 'high';
  reason: string;
  scores?: Record<string, number>;
  jailbreakDetected?: boolean;
  message: string;
  messageId?: string;
  studentId: string;
  roomId: string;
}): Promise<void> {
  try {
    const adminClient = createAdminClient();
    
    // Get room details to find teacher
    const { data: room, error: roomError } = await adminClient
      .from('rooms')
      .select('teacher_id')
      .eq('room_id', params.roomId)
      .single();
    
    if (roomError || !room) {
      console.error('[AI Moderation] Failed to get room details for logging:', roomError);
      return;
    }
    
    // Map severity to concern level (1-5 scale)
    const concernLevelMap = {
      'low': 2,
      'medium': 3,
      'high': 5
    };
    
    // Determine primary concern type
    let concernType = 'inappropriate_content';
    if (params.jailbreakDetected) {
      concernType = 'jailbreak_attempt';
    } else if (params.categories.includes('self-harm') || params.categories.includes('self-harm/intent')) {
      concernType = 'self_harm';
    } else if (params.categories.includes('harassment') || params.categories.includes('harassment/threatening')) {
      concernType = 'bullying';
    } else if (params.categories.includes('violence') || params.categories.includes('violence/graphic')) {
      concernType = 'violence';
    }
    
    // Insert into flagged_messages table
    const { error: insertError } = await adminClient
      .from('flagged_messages')
      .insert({
        message_id: params.messageId || `ai-moderation-${Date.now()}`,
        student_id: params.studentId,
        teacher_id: room.teacher_id,
        room_id: params.roomId,
        concern_type: concernType,
        concern_level: concernLevelMap[params.severity],
        analysis_explanation: `AI Moderation: ${params.reason}`,
        context_messages: {
          moderationScores: params.scores,
          flaggedCategories: params.categories,
          jailbreakDetected: params.jailbreakDetected,
          originalMessage: params.message
        },
        status: 'pending' as const
      });
    
    if (insertError) {
      console.error('[AI Moderation] Failed to log flagged content:', insertError);
    } else {
      console.log('[AI Moderation] Successfully logged flagged content for teacher review');
    }
    
  } catch (error) {
    console.error('[AI Moderation] Error logging flagged content:', error);
  }
}

/**
 * Batch moderation for multiple messages
 */
export async function moderateContentBatch(
  messages: string[]
): Promise<ModerationResult[]> {
  try {
    // OpenAI's moderation API supports batch processing
    const response = await openai.moderations.create({
      input: messages,
    });
    
    return response.results.map((result, index) => {
      const message = messages[index];
      const jailbreakCheck = detectJailbreakAttempts(message);
      
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category);
      
      if (jailbreakCheck.detected) {
        flaggedCategories.push('jailbreak_attempt');
      }
      
      const isFlagged = result.flagged || jailbreakCheck.detected;
      
      // Convert categories and scores to plain objects
      const categoriesObj: Record<string, boolean> = {};
      const scoresObj: Record<string, number> = {};
      
      for (const [key, value] of Object.entries(result.categories)) {
        categoriesObj[key] = value === true;
      }
      
      for (const [key, value] of Object.entries(result.category_scores)) {
        scoresObj[key] = value || 0;
      }
      
      const severity = isFlagged 
        ? determineSeverity(categoriesObj, scoresObj, jailbreakCheck.detected)
        : 'low';
      
      return {
        isFlagged,
        categories: flaggedCategories,
        severity,
        reason: formatReason(categoriesObj, jailbreakCheck.patterns),
        scores: scoresObj,
        jailbreakDetected: jailbreakCheck.detected
      };
    });
    
  } catch (error) {
    console.error('[AI Moderation] Batch moderation error:', error);
    // Return safe defaults for all messages
    return messages.map(() => ({
      isFlagged: false,
      categories: [],
      severity: 'low' as const,
      reason: 'Moderation check failed - defaulting to safe',
      scores: {}
    }));
  }
}

/**
 * Quick safety check for real-time filtering (lightweight version)
 */
export async function quickSafetyCheck(message: string): Promise<boolean> {
  // Quick jailbreak check only
  const jailbreakCheck = detectJailbreakAttempts(message);
  
  if (jailbreakCheck.detected) {
    console.log('[AI Moderation] Quick check: Jailbreak detected');
    return false; // Not safe
  }
  
  // Quick pattern matching for obvious inappropriate content
  const inappropriatePatterns = [
    /\b(kill|murder|suicide|rape)\b/i,
    /\b(fuck|shit|bitch|ass|dick|pussy|cock)\b/i,
    /\b(n[i1]gg[ae3]r|f[a4]gg[o0]t|r[e3]t[a4]rd)\b/i,
  ];
  
  for (const pattern of inappropriatePatterns) {
    if (pattern.test(message)) {
      console.log('[AI Moderation] Quick check: Inappropriate content detected');
      return false; // Not safe
    }
  }
  
  return true; // Appears safe for quick check
}