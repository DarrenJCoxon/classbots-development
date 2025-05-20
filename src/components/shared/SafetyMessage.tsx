'use client';

import React from 'react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as DbChatMessage } from '@/types/database.types';

interface SafetyMessageProps {
  message: DbChatMessage;
  countryCode?: string;
}

// Styled components for safety message display
const SafetyMessageContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  max-width: 100%;
`;

const SafetyMessageBubble = styled.div`
  max-width: 90%; /* Wider than regular messages to accommodate helplines */
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  background: ${({ theme }) => `${theme.colors.red}10`}; /* Very light red background */
  color: ${({ theme }) => theme.colors.text};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  position: relative;
  border: 1px solid ${({ theme }) => theme.colors.red}60; /* Semi-transparent red border */
  border-left: 3px solid ${({ theme }) => theme.colors.red}; /* Accent border on left */
`;

const SafetyMessageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const SafetyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.red};
`;

const SenderName = styled.span`
  font-weight: 600;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.red};
`;

const Timestamp = styled.span`
  font-size: 0.75rem;
  opacity: 0.7;
`;

const MessageContent = styled.div`
  line-height: 1.5;
  word-wrap: break-word;

  /* Markdown styling */
  h1, h2, h3, h4, h5, h6 { 
    margin-top: ${({ theme }) => theme.spacing.md}; 
    margin-bottom: ${({ theme }) => theme.spacing.sm}; 
    font-weight: 600; 
    line-height: 1.3; 
    color: inherit; 
  }
  
  h1 { font-size: 1.5em; } 
  h2 { font-size: 1.3em; } 
  h3 { font-size: 1.2em; }
  h4 { font-size: 1.1em; } 
  h5 { font-size: 1em; } 
  h6 { font-size: 0.9em; }
  
  p { 
    margin-bottom: ${({ theme }) => theme.spacing.sm}; 
    &:last-child { margin-bottom: 0; } 
  }
  
  /* Style for helpline bullet points */
  ul { 
    margin: ${({ theme }) => theme.spacing.md} 0;
    padding-left: ${({ theme }) => theme.spacing.md}; 
    border-left: 2px solid ${({ theme }) => theme.colors.red}30;
  }
  
  li { 
    margin-bottom: ${({ theme }) => theme.spacing.md}; 
    list-style-type: none;
    position: relative;
    padding-left: ${({ theme }) => theme.spacing.md};
    
    &:before {
      content: '•';
      color: ${({ theme }) => theme.colors.red};
      font-weight: bold;
      position: absolute;
      left: 0;
    }
  }
  
  /* Links styling */
  a { 
    color: ${({ theme }) => theme.colors.red}; 
    text-decoration: underline; 
    &:hover { text-decoration: none; } 
  }
`;

// Helper function to format timestamp
function formatTimestamp(timestamp: string | undefined): string {
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
  const COUNTRY_NAMES: Record<string, string> = {
    'US': 'United States',
    'GB': 'UK',
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
    'NZ': 'New Zealand',
    'UK': 'UK',
  };
  
  return COUNTRY_NAMES[code] || code;
}

// Custom components for React Markdown
const markdownComponents = {
  a: (props: any) => (<a {...props} target="_blank" rel="noopener noreferrer" />),
};

export function SafetyMessage({ message, countryCode }: SafetyMessageProps) {
  // Get metadata from message
  const metadata = message.metadata as any;
  
  // Determine which country code to use for display
  const displayCode = metadata?.displayCountryCode || 
                     metadata?.effectiveCountryCode || 
                     metadata?.countryCode || 
                     countryCode || 'DEFAULT';
  
  // Get country display name
  let countryName = '';
  if (displayCode && displayCode !== 'DEFAULT') {
    countryName = getCountryNameFromCode(String(displayCode));
  }
  
  // Create sender name with country if available
  const countryDisplay = countryName ? ` - ${countryName}` : '';
  const senderNameToDisplay = `Support Resources${countryDisplay}`;
  
  return (
    <SafetyMessageContainer>
      <SafetyMessageBubble>
        <SafetyMessageHeader>
          <SafetyIcon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </SafetyIcon>
          <SenderName>{senderNameToDisplay}</SenderName>
          <Timestamp>{formatTimestamp(message.created_at)}</Timestamp>
        </SafetyMessageHeader>
        <MessageContent>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {message.content || ''}
          </ReactMarkdown>
        </MessageContent>
      </SafetyMessageBubble>
    </SafetyMessageContainer>
  );
}