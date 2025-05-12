// src/components/shared/ChatInput.tsx
'use client';

import { useState, KeyboardEvent } from 'react';
import styled from 'styled-components';
import { Button, Alert } from '@/styles/StyledComponents';

// ... (InputContainer, InputForm, TextInput, SendButton, ErrorAlert styled components remain the same)

const InputForm = styled.form`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
  }
`;

const TextInput = styled.input`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.focus};
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    min-height: 48px;
  }
`;

const SendButton = styled(Button)`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.xl};
  min-width: 100px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    min-height: 48px;
  }
`;

const ErrorAlert = styled(Alert)`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;


const InputHint = styled.p`
  font-size: 0.8rem; /* Slightly larger for better readability */
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: ${({ theme }) => theme.spacing.sm};
  text-align: left; /* Align to left, often better for hints near input */
  padding-left: ${({ theme }) => theme.spacing.xs};

  /* Default hint shown on mobile for Ctrl/Cmd+Enter */
  @media (min-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none; 
  }
`;

// Specific hint for assessment bots
const AssessmentHint = styled(InputHint)`
    display: block; /* Ensure it's always visible if provided */
    text-align: center; /* Center this specific hint */
    margin-bottom: -${({ theme }) => theme.spacing.xs}; /* Adjust spacing slightly */
`;


interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
  hint?: string; // New optional hint prop
}

export default function ChatInput({ onSend, isLoading, error, onClearError, hint }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const content = message.trim();
    setMessage(''); // Clear input immediately
    await onSend(content);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Prevent default Enter behavior (like newline in some setups) if Ctrl/Meta is pressed
      e.preventDefault(); 
      handleSubmit(e as unknown as React.FormEvent); // Cast because original event is KeyboardEvent
    } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      // If just Enter is pressed (and not Shift+Enter for newline)
      e.preventDefault(); 
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    // InputContainer styling has been removed from Chat.tsx and should be part of ChatInput itself if needed.
    // For now, assuming StyledChatInputContainer in Chat.tsx provides the main padding.
    <> 
      {error && (
        <ErrorAlert variant="error" onClick={onClearError} style={{marginBottom: '8px'}}>
          {error}
        </ErrorAlert>
      )}
      
      <InputForm onSubmit={handleSubmit}>
        <TextInput
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <SendButton
          type="submit"
          disabled={isLoading || !message.trim()}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </SendButton>
      </InputForm>

      {hint && <AssessmentHint>{hint}</AssessmentHint>}
      
      {/* General hint for mobile, could be combined or made more context-aware */}
      {!hint && (
         <InputHint>
            Press Enter to send. Use Shift+Enter for a new line.
         </InputHint>
      )}
    </>
  );
}