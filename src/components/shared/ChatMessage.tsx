// src/components/shared/ChatMessage.tsx
'use client';

import styled, { css } from 'styled-components'; // Added css import
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FiVolume2, FiVolumeX, FiLoader } from 'react-icons/fi';
import { IconButton } from '@/components/ui';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import type { ChatMessage as DbChatMessage } from '@/types/database.types'; // Renamed to avoid conflict

// --- Type Definitions ---\
interface ChatMessageProps {
  message: DbChatMessage; // Use the aliased type
  chatbotName: string;
  userId?: string;
  directAccess?: boolean;
}

type MessageMetadataWithFlags = {
    error?: unknown;
    isAssessmentFeedback?: boolean;
    isAssessmentPlaceholder?: boolean;
    isOptimistic?: boolean;
    optimisticContent?: string;
    isStreaming?: boolean;
    isSystemSafetyResponse?: boolean;
    isSafetyPlaceholder?: boolean;
    potentialSafetyTrigger?: boolean;
    pendingSafetyResponse?: boolean;
    [key: string]: unknown;
} | null | undefined;

// --- Styled Components ---
interface MessageWrapperProps {
  $isUser: boolean;
  $hasError: boolean;
}
const MessageWrapper = styled.div<MessageWrapperProps>`
  display: flex;
  justify-content: ${({ $isUser }) => $isUser ? 'flex-end' : 'flex-start'};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  opacity: ${({ $hasError }) => $hasError ? 0.7 : 1};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    margin-bottom: ${({ theme }) => theme.spacing.md}; // Reduce margin on mobile
  }
`;

interface MessageBubbleProps {
  $isUser: boolean;
  $hasError: boolean;
  $isAssessmentFeedback?: boolean;
  $isAssessmentPlaceholder?: boolean;
  $isOptimistic?: boolean;
  $isStreaming?: boolean;
  $isSystemSafetyResponse?: boolean;
  $isSafetyPlaceholder?: boolean;
  $pendingSafetyResponse?: boolean;
}
const MessageBubble = styled.div<MessageBubbleProps>`
  max-width: 80%;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme, $isUser }) =>
    $isUser
      ? `${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.small} ${theme.borderRadius.xl}`
      : `${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.small}`
  };
  background: ${({ theme, $isUser, $isAssessmentFeedback, $isAssessmentPlaceholder, $isSystemSafetyResponse, $isSafetyPlaceholder }) => {
    if ($isAssessmentFeedback) return theme.colors.blue + '20'; // Light blue for feedback
    if ($isAssessmentPlaceholder) return theme.colors.backgroundDark;
    if ($isSystemSafetyResponse) return theme.colors.red + '10'; // Very light red for safety messages
    if ($isSafetyPlaceholder) return theme.colors.backgroundDark;
    return $isUser ? theme.colors.primary : theme.colors.backgroundCard;
  }};
  color: ${({ theme, $isUser, $isAssessmentFeedback, $isAssessmentPlaceholder, $isSystemSafetyResponse, $isSafetyPlaceholder }) => {
    if ($isAssessmentFeedback) return theme.colors.blue; // Darker blue text
    if ($isAssessmentPlaceholder) return theme.colors.textMuted;
    if ($isSystemSafetyResponse) return theme.colors.text; // Normal text color for safety message
    if ($isSafetyPlaceholder) return theme.colors.textMuted;
    return $isUser ? 'white' : theme.colors.text;
  }};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  position: relative;
  border: 1px solid transparent; // Default border
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    max-width: 90%; // Increase max-width on mobile for better space usage
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md}; // Reduce padding
  }

  ${({ $hasError, theme }) => $hasError && `
      border-color: ${theme.colors.red};
   `}

  ${({ $isAssessmentFeedback, theme }) => $isAssessmentFeedback && css`
    border-color: ${theme.colors.blue};
    /* You could add an icon or other distinct styling here */
  `}
  ${({ $isAssessmentPlaceholder }) => $isAssessmentPlaceholder && css`
    font-style: italic;
  `}
  ${({ $isOptimistic }) => $isOptimistic && css`
    opacity: 0.7;
  `}
  ${({ $isStreaming, theme }) => $isStreaming && css`
    border-left: 3px solid ${theme.colors.primary};
  `}
  ${({ $isSystemSafetyResponse, theme }) => $isSystemSafetyResponse && css`
    border-left: 3px solid ${theme.colors.red};
  `}
  ${({ $isSafetyPlaceholder }) => $isSafetyPlaceholder && css`
    font-style: italic;
  `}
  ${({ $pendingSafetyResponse }) => $pendingSafetyResponse && css`
    opacity: 0.7;
  `}
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const SenderName = styled.span`
  font-weight: 600;
  font-size: 0.875rem;
  opacity: 0.8;
`;

const Timestamp = styled.span`
  font-size: 0.75rem;
  opacity: 0.7;
`;

const MessageContent = styled.div<{ $isUser: boolean }>`
  line-height: 1.5;
  word-wrap: break-word;
  // ... (Markdown styling remains the same as previous version)
  h1, h2, h3, h4, h5, h6 { margin-top: ${({ theme }) => theme.spacing.md}; margin-bottom: ${({ theme }) => theme.spacing.sm}; font-weight: 600; line-height: 1.3; color: inherit; }
  h1 { font-size: 1.5em; } h2 { font-size: 1.3em; } h3 { font-size: 1.2em; }
  h4 { font-size: 1.1em; } h5 { font-size: 1em; } h6 { font-size: 0.9em; }
  p { margin-bottom: ${({ theme }) => theme.spacing.sm}; &:last-child { margin-bottom: 0; } }
  ul, ol { margin-bottom: ${({ theme }) => theme.spacing.sm}; padding-left: ${({ theme }) => theme.spacing.lg}; }
  li { margin-bottom: ${({ theme }) => theme.spacing.xs}; }
  blockquote { border-left: 4px solid ${({ theme, $isUser }) => $isUser ? 'rgba(255,255,255,0.5)' : theme.colors.border}; padding-left: ${({ theme }) => theme.spacing.md}; margin: ${({ theme }) => theme.spacing.sm} 0; font-style: italic; color: ${({ $isUser }) => $isUser ? 'rgba(255,255,255,0.9)' : 'inherit'}; opacity: 0.9; }
  pre.code-block-wrapper { background: ${({ $isUser }) => $isUser ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}; padding: ${({ theme }) => theme.spacing.sm}; border-radius: ${({ theme }) => theme.borderRadius.small}; margin: ${({ theme }) => theme.spacing.sm} 0; overflow-x: auto; code { background: none !important; padding: 0 !important; font-family: ${({ theme }) => theme.fonts.mono}; white-space: pre; font-size: 0.9em; color: inherit; } }
  code.inline-code { background: ${({ $isUser }) => $isUser ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)'}; padding: 2px 5px; border-radius: ${({ theme }) => theme.borderRadius.small}; font-family: ${({ theme }) => theme.fonts.mono}; font-size: 0.9em; }
  hr { border: none; height: 1px; background: ${({ theme, $isUser }) => $isUser ? 'rgba(255,255,255,0.3)' : theme.colors.border}; margin: ${({ theme }) => theme.spacing.md} 0; }
  table { border-collapse: collapse; margin: ${({ theme }) => theme.spacing.sm} 0; width: auto; border: 1px solid ${({ theme, $isUser }) => $isUser ? 'rgba(255,255,255,0.3)' : theme.colors.border}; th, td { border: 1px solid ${({ theme, $isUser }) => $isUser ? 'rgba(255,255,255,0.3)' : theme.colors.border}; padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm}; } th { background: ${({ $isUser }) => $isUser ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)'}; font-weight: 600; } }
  a { color: ${({ $isUser, theme }) => $isUser ? '#c1d9ff' : theme.colors.primaryDark}; text-decoration: underline; &:hover { text-decoration: none; } }
  ul.contains-task-list { list-style-type: none; padding-left: ${({ theme }) => theme.spacing.sm}; }
  li.task-list-item { display: flex; align-items: center; input[type="checkbox"] { margin-right: ${({ theme }) => theme.spacing.sm}; cursor: default; } }
`;

const ErrorIndicator = styled.div`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.red};
    margin-top: ${({ theme }) => theme.spacing.xs};
    font-style: italic;
`;

const TTSControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
  padding-top: ${({ theme }) => theme.spacing.sm};
  border-top: 1px solid ${({ theme }) => theme.colors.border}20;
`;

const TTSButton = styled(IconButton)<{ $isPlaying?: boolean }>`
  background: ${({ theme, $isPlaying }) => 
    $isPlaying ? theme.colors.primary + '20' : 'transparent'
  };
  color: ${({ theme, $isPlaying }) => 
    $isPlaying ? theme.colors.primary : theme.colors.textLight
  };
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary + '20'};
    color: ${({ theme }) => theme.colors.primary};
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const TTSStatus = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textLight};
  font-style: italic;
`;
// --- End Styled Components ---

// --- Helper Functions ---
function formatTimestamp(timestamp: string | undefined): string {
  // ... (formatTimestamp remains the same)
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 5) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (now.getFullYear() === date.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString();
  }
}

// Get human-readable country name from ISO country code
function getCountryNameFromCode(code: string): string {
  // This is a lookup function to convert country codes to readable names
  // We do this client-side to avoid hardcoding names in the database
  const COUNTRY_NAMES: Record<string, string> = {
    // Standard ISO codes
    'US': 'United States',
    'GB': 'UK',  // Special case - GB is the ISO code, but UK is more commonly used
    'CA': 'Canada',
    'AU': 'Australia',
    'IE': 'Ireland',
    'FR': 'France',
    'DE': 'Germany',
    'IT': 'Italy',
    'ES': 'Spain',
    'PT': 'Portugal',
    'GR': 'Greece',
    'AE': 'UAE',
    'MY': 'Malaysia',
    // Handle common non-standard codes
    'UK': 'UK',   // Handle non-standard "UK" as well
    // Add other country names as needed
  };
  
  // Return the name if found, otherwise just use the code
  return COUNTRY_NAMES[code] || code;
}
// -----------------------

// --- React Markdown Custom Components (remain the same) ---
const markdownComponents: Components = {
    a: (props) => (<a {...props} target="_blank" rel="noopener noreferrer" />),
    input: (props) => { const { checked, ...rest } = props; return (<input type="checkbox" checked={!!checked} disabled={true} readOnly {...rest} /> ); },
    code({ className, children, inline, ...props }: React.HTMLAttributes<HTMLElement> & { className?: string; children?: React.ReactNode; inline?: boolean; }) {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');
        const { style: _unused, ...restProps } = props;
        void _unused;
        return !inline ? (
            <pre className="code-block-wrapper" {...restProps}>
                <code className={match ? `language-${match[1]}` : undefined}>{codeString}</code>
            </pre>
        ) : (
            <code className={`inline-code ${className || ''}`} {...restProps}>{codeString}</code>
        );
    }
};
// --- End React Markdown Components ---

// --- Main Component ---
function ChatMessageDisplay({ message, chatbotName, userId, directAccess }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const { speak, stop, isLoading: isTTSLoading, isPlaying, error: ttsError } = useTextToSpeech();
    
    const metadata = message.metadata as MessageMetadataWithFlags; // Use new type
    const hasError = !!metadata?.error;
    const errorMessage = hasError ? String(metadata.error) : null;
    const isAssessmentFeedback = !!metadata?.isAssessmentFeedback;
    const isAssessmentPlaceholder = !!metadata?.isAssessmentPlaceholder;
    const isOptimistic = !!metadata?.isOptimistic;
    const isStreaming = !!metadata?.isStreaming;
    const isSystemSafetyResponse = !!metadata?.isSystemSafetyResponse;
    const isSafetyPlaceholder = !!metadata?.isSafetyPlaceholder;
    const pendingSafetyResponse = !!metadata?.pendingSafetyResponse;
    
    let senderNameToDisplay = chatbotName;
    if (isUser) {
        senderNameToDisplay = 'You';
    } else if (isSystemSafetyResponse || isSafetyPlaceholder) {
        // Use a specific name for safety messages - prioritize displayCountryCode (set by API),
        // then fallback to effectiveCountryCode, then countryCode
        const displayCode = metadata?.displayCountryCode || metadata?.effectiveCountryCode || metadata?.countryCode;
        
        // Get country display name using a lookup function
        let countryName = '';
        if (displayCode) {
            // Don't show anything for DEFAULT
            if (displayCode !== 'DEFAULT') {
                // Use a lookup function to get readable country names for ISO codes
                countryName = getCountryNameFromCode(String(displayCode));
            }
        }
        
        const countryDisplay = countryName ? ` - ${countryName}` : '';
        senderNameToDisplay = isSafetyPlaceholder ? 'Safety Check' : `Support Resources${countryDisplay}`;
        
        // Log safety message details for debugging
        if (isSystemSafetyResponse) {
            console.log(`[SafetyDiagnostics] ===== UI SAFETY MESSAGE TRACKING =====`);
            console.log(`[SafetyDiagnostics] Safety Message UI Rendering Details:`);
            console.log(`[SafetyDiagnostics] message.message_id: ${message.message_id}`);
            console.log(`[SafetyDiagnostics] metadata.countryCode: "${metadata?.countryCode}"`);
            console.log(`[SafetyDiagnostics] metadata.effectiveCountryCode: "${metadata?.effectiveCountryCode}"`);
            console.log(`[SafetyDiagnostics] metadata.displayCountryCode: "${metadata?.displayCountryCode}"`);
            console.log(`[SafetyDiagnostics] metadata.helplines: "${metadata?.helplines || 'not provided'}"`);
            console.log(`[SafetyDiagnostics] finalDisplayCode: "${displayCode}"`);
            console.log(`[SafetyDiagnostics] countryName: "${countryName}"`);
            console.log(`[SafetyDiagnostics] senderNameToDisplay: "${senderNameToDisplay}"`);
            console.log(`[SafetyDiagnostics] Content Length: ${message.content?.length || 0} characters`);
            console.log(`[SafetyDiagnostics] First 100 chars: "${message.content?.substring(0, 100)}..."`);
            console.log(`[SafetyDiagnostics] Has MANDATORY HELPLINES marker: ${message.content?.includes('===== MANDATORY HELPLINES')}`);
            console.log(`[SafetyDiagnostics] ===== END TRACKING =====`);
            
            // Original logger
            console.log('[ChatMessage] Displaying safety message with details:', { 
                countryCode: metadata?.countryCode,
                effectiveCountryCode: metadata?.effectiveCountryCode,
                displayCountryCode: metadata?.displayCountryCode,
                finalDisplayCode: displayCode,
                countryName,
                content: message.content,
                messageId: message.message_id
            });
            
            // Check if the message content contains the expected helplines based on the country
            let helplineCheckResult: {
                containsPhoneNumber?: boolean;
                containsWebsite?: boolean;
                containsSpecificHelplines?: boolean;
                overallSuccess?: boolean;
                messageLength?: number;
                formattedHelplines?: boolean;
                bulletPointCount?: number;
                hasFormattedHelplineSection?: boolean;
                hasHelplineHeader?: boolean;
                hasHelplineFooter?: boolean;
                hasBulletPoints?: boolean;
                helplines?: string;
            } = {};
            
            // Check for bullet points which indicate helplines are present
            const hasBulletPoints = message.content.includes('* ');
            const hasPhoneNumbers = message.content.includes('Phone:');
            const hasWebsites = message.content.includes('Website:');
            
            // We don't use markers anymore, but define these variables to maintain compatibility
            const hasHelplineHeader = false;
            const hasHelplineFooter = false;
            
            // Log metadata helplines for debugging
            if (metadata?.helplines) {
                console.log(`[ChatMessage] Safety message has metadata helplines: ${metadata.helplines}`);
            }
            
            // Display exact message content for verification
            console.log(`[SafetyDiagnostics] CRITICAL SAFETY VERIFICATION - Full message content for inspection:`);
            console.log(`${message.content}`);
            
            // Parse and count the helplines that are in the message (now without markers)
            const messageLines = message.content.split('\n');
            
            // Find all lines that start with a bullet point
            const actualHelplines = messageLines.filter(line => line.trim().startsWith('*'));
            
            if (actualHelplines.length > 0) {
                console.log(`[SafetyDiagnostics] Found ${actualHelplines.length} helplines in the message content:`);
                actualHelplines.forEach(line => {
                    console.log(`[SafetyDiagnostics] HELPLINE: ${line.trim()}`);
                });
                
                // Verify these match the metadata if provided
                if (metadata?.helplines && typeof metadata.helplines === 'string') {
                    const metadataHelplineNames = metadata.helplines.split(',');
                    console.log(`[SafetyDiagnostics] Checking if displayed helplines match metadata helplines:`);
                    console.log(`[SafetyDiagnostics] - Metadata has ${metadataHelplineNames.length} helplines: ${metadataHelplineNames.join(', ')}`);
                    
                    let matchCount = 0;
                    for (const name of metadataHelplineNames) {
                        const found = actualHelplines.some(line => line.includes(name));
                        console.log(`[SafetyDiagnostics] - Helpline "${name}" in message: ${found ? 'YES' : 'NO'}`);
                        if (found) matchCount++;
                    }
                    
                    console.log(`[SafetyDiagnostics] Match result: ${matchCount}/${metadataHelplineNames.length} helplines found in message`);
                }
            } else {
                console.error(`[SafetyDiagnostics] FAILED TO FIND HELPLINES in message content!`);
            }
            
            // If we have bullet points and phone numbers or websites, consider it successful
            if (hasBulletPoints && (hasPhoneNumbers || hasWebsites)) {
                helplineCheckResult = {
                    hasFormattedHelplineSection: true,
                    hasHelplineHeader: false, // We don't use these markers anymore
                    hasHelplineFooter: false, // We don't use these markers anymore
                    hasBulletPoints,
                    helplines: typeof metadata?.helplines === 'string' ? metadata.helplines : 'unknown',
                    overallSuccess: true,
                    messageLength: message.content.length
                };
            }
            // Use a generic check for all countries instead of hardcoding specific helplines
            else {
                // Generic check for any helpline-like content
                // Look for typical helpline indicators: phone numbers and websites
                const containsPhone = /\b\d{3}[- .]?\d{3}[- .]?\d{4}\b|\b\d{5}\b|\b\d{4}\s?\d{4}\b|\b\d{3}\b/.test(message.content);
                const containsWebsite = /\b\w+\.\w+(\.\w+)?\b/.test(message.content);
                
                // Check if metadata has helpline names we can verify
                let containsSpecificHelplines = false;
                if (metadata?.helplines && typeof metadata.helplines === 'string') {
                    const metadataHelplineNames = metadata.helplines.split(',');
                    // Check if at least one of the expected helplines is in the message
                    containsSpecificHelplines = metadataHelplineNames.some(name => 
                        message.content.includes(name));
                }
                
                helplineCheckResult = {
                    containsPhoneNumber: containsPhone,
                    containsWebsite: containsWebsite,
                    containsSpecificHelplines,
                    overallSuccess: containsPhone || containsWebsite || containsSpecificHelplines || (hasHelplineHeader && hasHelplineFooter), 
                    messageLength: message.content.length
                };
            }
            
            console.log(`[ChatMessage] Helpline check for ${countryName}:`, helplineCheckResult);
            
            if (!helplineCheckResult.overallSuccess) {
                console.warn(`[ChatMessage] CRITICAL WARNING: Safety message may not contain proper helplines!`);
                // Log the entire message content to see exactly what's coming through
                console.log(`[ChatMessage] FULL SAFETY MESSAGE CONTENT (for debugging):\n${message.content}`);
                console.log(`[ChatMessage] Safety message metadata:`, message.metadata);
            }
        }
    } else if (isAssessmentFeedback || isAssessmentPlaceholder || message.role === 'system') {
        // For system messages or assessment feedback, use a generic name or the bot's name
        // If it's a placeholder or feedback, you might want a specific title like "Assessment System"
        senderNameToDisplay = isAssessmentFeedback ? `${chatbotName} (Assessment)` : (isAssessmentPlaceholder ? 'System' : chatbotName);
        if (message.user_id === 'system-assessment' || message.user_id === 'system-feedback') {
             // Let's refine this. If the message.role is 'system', it should be styled as such.
        }
    }


    return (
        <MessageWrapper $isUser={isUser} $hasError={hasError}>
            <MessageBubble
              $isUser={isUser}
              $hasError={hasError}
              $isAssessmentFeedback={isAssessmentFeedback}
              $isAssessmentPlaceholder={isAssessmentPlaceholder}
              $isOptimistic={isOptimistic}
              $isStreaming={isStreaming}
              $isSystemSafetyResponse={isSystemSafetyResponse}
              $isSafetyPlaceholder={isSafetyPlaceholder}
              $pendingSafetyResponse={pendingSafetyResponse}
            >
                <MessageHeader>
                    <SenderName>{senderNameToDisplay}</SenderName>
                    <Timestamp>
                        {isOptimistic ? 'Sending...' : formatTimestamp(message.created_at)}
                    </Timestamp>
                </MessageHeader>
                <MessageContent $isUser={isUser}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                    >
                        {message.content || ''}
                    </ReactMarkdown>
                    {isStreaming && (
                      <span style={{ display: 'inline-block', width: '8px', height: '16px', background: '#3498db', marginLeft: '2px', animation: 'blink 1s infinite' }} />
                    )}
                </MessageContent>
                {hasError && (
                    <ErrorIndicator title={errorMessage || 'Failed to send message'}>
                       ⚠️ Failed to send
                    </ErrorIndicator>
                 )}
                {/* TTS Controls - Only show for bot messages */}
                {!isUser && !isOptimistic && !isStreaming && message.content && (
                    <TTSControls>
                        <TTSButton
                            icon={
                                isTTSLoading ? <FiLoader className="spin" /> :
                                isPlaying ? <FiVolumeX /> :
                                <FiVolume2 />
                            }
                            size="small"
                            variant="ghost"
                            onClick={() => {
                                if (isPlaying) {
                                    stop();
                                } else {
                                    speak(message.content, {
                                        userId,
                                        directAccess
                                    });
                                }
                            }}
                            disabled={isTTSLoading}
                            $isPlaying={isPlaying}
                            title={
                                isTTSLoading ? 'Loading...' :
                                isPlaying ? 'Stop reading' :
                                'Read aloud'
                            }
                            aria-label={
                                isTTSLoading ? 'Loading text-to-speech' :
                                isPlaying ? 'Stop text-to-speech' :
                                'Play text-to-speech'
                            }
                        />
                        {isTTSLoading && <TTSStatus>Loading audio...</TTSStatus>}
                        {isPlaying && <TTSStatus>Reading...</TTSStatus>}
                        {ttsError && <TTSStatus style={{ color: 'var(--color-danger)' }}>Error: {ttsError}</TTSStatus>}
                    </TTSControls>
                )}
            </MessageBubble>
        </MessageWrapper>
    );
}
// --- End Main Component ---

export { ChatMessageDisplay as ChatMessage };