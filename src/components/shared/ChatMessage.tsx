// src/components/shared/ChatMessage.tsx
'use client';

import styled from 'styled-components';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '@/types/database.types';
// --- Type Definitions ---
interface ChatMessageProps {
  message: ChatMessage;
  chatbotName: string;
}

type MessageMetadataWithError = {
    error?: unknown;
    [key: string]: unknown;
} | null | undefined;

// --- Styled Components (Keep as previously defined) ---
interface MessageWrapperProps {
  $isUser: boolean;
  $hasError: boolean;
}
const MessageWrapper = styled.div<MessageWrapperProps>`
  display: flex;
  justify-content: ${({ $isUser }) => $isUser ? 'flex-end' : 'flex-start'};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  opacity: ${({ $hasError }) => $hasError ? 0.7 : 1};
`;

interface MessageBubbleProps {
  $isUser: boolean;
  $hasError: boolean;
}
const MessageBubble = styled.div<MessageBubbleProps>`
  max-width: 80%;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme, $isUser }) =>
    $isUser
      ? `${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.small} ${theme.borderRadius.xl}`
      : `${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.small}`
  };
  background: ${({ theme, $isUser }) =>
    $isUser ? theme.colors.primary : theme.colors.backgroundCard
  };
  color: ${({ theme, $isUser }) =>
    $isUser ? 'white' : theme.colors.text
  };
  box-shadow: ${({ theme }) => theme.shadows.sm};
  position: relative;

   ${({ $hasError, theme }) => $hasError && `
      border: 2px solid ${theme.colors.red};
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

  /* Basic Markdown styling reset/defaults */
  h1, h2, h3, h4, h5, h6 {
    margin-top: ${({ theme }) => theme.spacing.md};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-weight: 600;
    line-height: 1.3;
    color: inherit;
  }
  h1 { font-size: 1.5em; } h2 { font-size: 1.3em; } h3 { font-size: 1.2em; }
  h4 { font-size: 1.1em; } h5 { font-size: 1em; } h6 { font-size: 0.9em; }

  p { margin-bottom: ${({ theme }) => theme.spacing.sm}; &:last-child { margin-bottom: 0; } }
  ul, ol { margin-bottom: ${({ theme }) => theme.spacing.sm}; padding-left: ${({ theme }) => theme.spacing.lg}; }
  li { margin-bottom: ${({ theme }) => theme.spacing.xs}; }

  blockquote {
    border-left: 4px solid ${({ theme, $isUser }) => $isUser ? 'rgba(255,255,255,0.5)' : theme.colors.border};
    padding-left: ${({ theme }) => theme.spacing.md};
    margin: ${({ theme }) => theme.spacing.sm} 0;
    font-style: italic;
    color: ${({ $isUser }) => $isUser ? 'rgba(255,255,255,0.9)' : 'inherit'};
    opacity: 0.9;
  }

  /* Specific styling for code elements via custom renderer */
  pre.code-block-wrapper {
    background: ${({ $isUser }) => $isUser ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'};
    padding: ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.borderRadius.small};
    margin: ${({ theme }) => theme.spacing.sm} 0;
    overflow-x: auto;
    code {
        background: none !important; padding: 0 !important;
        font-family: ${({ theme }) => theme.fonts.mono};
        white-space: pre; font-size: 0.9em;
        color: inherit;
    }
  }

  /* Inline code */
  code.inline-code {
    background: ${({ $isUser }) => $isUser ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)'};
    padding: 2px 5px;
    border-radius: ${({ theme }) => theme.borderRadius.small};
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.9em;
  }

  hr {
    border: none; height: 1px;
    background: ${({ theme, $isUser }) => $isUser ? 'rgba(255,255,255,0.3)' : theme.colors.border};
    margin: ${({ theme }) => theme.spacing.md} 0;
  }

  table {
    border-collapse: collapse; margin: ${({ theme }) => theme.spacing.sm} 0; width: auto;
     border: 1px solid ${({ theme, $isUser }) => $isUser ? 'rgba(255,255,255,0.3)' : theme.colors.border};
    th, td {
      border: 1px solid ${({ theme, $isUser }) => $isUser ? 'rgba(255,255,255,0.3)' : theme.colors.border};
      padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    }
    th {
      background: ${({ $isUser }) => $isUser ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)'};
      font-weight: 600;
    }
  }

  a {
    color: ${({ $isUser, theme }) => $isUser ? '#c1d9ff' : theme.colors.primaryDark};
    text-decoration: underline;
    &:hover { text-decoration: none; }
  }

  ul.contains-task-list {
     list-style-type: none;
     padding-left: ${({ theme }) => theme.spacing.sm};
  }
  li.task-list-item {
     display: flex;
     align-items: center;
     input[type="checkbox"] {
        margin-right: ${({ theme }) => theme.spacing.sm};
        cursor: default; /* Indicate non-interactive checkbox */
     }
  }
`;

const ErrorIndicator = styled.div`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.red};
    margin-top: ${({ theme }) => theme.spacing.xs};
    font-style: italic;
`;
// --- End Styled Components ---


// --- Helper Function ---
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
// -----------------------

// --- React Markdown Custom Components (Corrected) ---
const markdownComponents: Components = {
    a: (props) => (
        <a
          {...props}
          target="_blank"
          rel="noopener noreferrer"
        />
    ),
    input: (props) => {
        // Props passed by remark-gfm for task list items include type, checked, disabled
        // We just need to render a disabled checkbox with the correct checked state.
        // We destructure to avoid passing invalid props.
        const { checked, ...rest } = props;
        return (
            <input
                type="checkbox"
                checked={!!checked} // Ensure boolean
                disabled={true} // Always disabled in display
                readOnly
                {...rest} // Pass className etc.
            />
        );
    },
    // --- FIX for code component ---
    // The `inline` prop IS provided by react-markdown.
    // The type error likely comes from spreading `...props` which might contain incompatible attributes for `pre` or `code`.
    // We need to explicitly pull out known/valid props.
    code({ className, children, inline, ...props }: React.HTMLAttributes<HTMLElement> & { className?: string; children?: React.ReactNode; inline?: boolean; }) {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');
    
        // Explicitly handle potential props that might clash (like style if applying classes)
        // We will apply styles via className added below
        const { style: _unused, ...restProps } = props; // Exclude style prop if applying classes
        void _unused;
    
        return !inline ? ( // Block code
            <pre className="code-block-wrapper" {...restProps}> {/* Spread remaining valid props */}
                <code className={match ? `language-${match[1]}` : undefined}>
                    {codeString}
                </code>
            </pre>
        ) : ( // Inline code
            <code className={`inline-code ${className || ''}`} {...restProps}> {/* Spread remaining valid props */}
                {codeString}
            </code>
        );
    }
    // --- End FIX for code component ---
};
// --- End React Markdown Components ---


// --- Main Component ---
function ChatMessageDisplay({ message, chatbotName }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const senderName = isUser ? 'You' : chatbotName;

    const metadata = message.metadata as MessageMetadataWithError;
    const hasError = !!metadata?.error;
    const errorMessage = hasError ? String(metadata.error) : null;

    return (
        <MessageWrapper $isUser={isUser} $hasError={hasError}>
            <MessageBubble $isUser={isUser} $hasError={hasError}>
                <MessageHeader>
                    <SenderName>{senderName}</SenderName>
                    <Timestamp>
                        {formatTimestamp(message.created_at)}
                    </Timestamp>
                </MessageHeader>
                <MessageContent $isUser={isUser}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                    >
                        {message.content || ''}
                    </ReactMarkdown>
                </MessageContent>
                {hasError && (
                    <ErrorIndicator title={errorMessage || 'Failed to send message'}>
                        ⚠️ Failed to send
                    </ErrorIndicator>
                 )}
            </MessageBubble>
        </MessageWrapper>
    );
}
// --- End Main Component ---

export { ChatMessageDisplay as ChatMessage };