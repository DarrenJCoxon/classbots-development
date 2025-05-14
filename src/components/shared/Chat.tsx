// src/components/shared/Chat.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { createClient } from '@/lib/supabase/client';
import { Card, Alert, Button } from '@/styles/StyledComponents';
import { ChatMessage as ChatMessageComponent } from '@/components/shared/ChatMessage';
import ChatInput from '@/components/shared/ChatInput';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ChatMessage, Chatbot } from '@/types/database.types'; // Chatbot type now includes welcome_message

// Constants from API route
const ASSESSMENT_TRIGGER_COMMAND = "/assess";

// Styled Components (remain the same as previous version)
const ChatContainer = styled(Card)`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px); /* Adjust as needed */
  max-height: 800px;
  position: relative;
  padding: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    height: calc(100vh - 150px);
    max-height: none;
    margin: 0;
    border-radius: 0;
    border: none;
    box-shadow: none;
  }
`;

const MessagesList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

const StyledChatInputContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundCard};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => theme.spacing.xl};

  h3 {
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const ErrorContainer = styled(Alert)`
  margin: ${({ theme }) => theme.spacing.md};
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.textLight};
  height: 100%;
`;


interface ChatProps {
  roomId: string;
  chatbot: Chatbot;
}

export default function Chat({ roomId, chatbot }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMessages, setIsFetchingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    const getUserId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        } else {
          setFetchError("Authentication error. Please log in.");
        }
      } catch {
        setFetchError("Could not verify user. Please try refreshing.");
      }
    };
    getUserId();
  }, [supabase]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!chatbot?.chatbot_id || !userId || !roomId) {
        setIsFetchingMessages(false);
        return;
    }
    setIsFetchingMessages(true);
    setFetchError(null);
    fetchedRef.current = true;
    try {
      const url = `/api/chat/${roomId}?chatbotId=${chatbot.chatbot_id}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Failed to parse error response');
        throw new Error(`Failed to fetch messages (status: ${response.status}) - ${errorText}`);
      }
      const data = await response.json();
      let fetchedMsgs = Array.isArray(data) ? (data as ChatMessage[]) : [];

      // MODIFIED: Prepend welcome message if it's a new chat and welcome message exists
      // Also check if the first message isn't already our special welcome message (to avoid duplicates on re-fetch/re-render)
      if (
        fetchedMsgs.length === 0 &&
        chatbot.welcome_message &&
        chatbot.welcome_message.trim() !== ''
      ) {
        const welcomeMsg: ChatMessage = {
          message_id: `welcome-${chatbot.chatbot_id}`, // Use a consistent ID for the welcome message
          room_id: roomId,
          user_id: chatbot.chatbot_id, // Attributed to the bot
          role: 'assistant',
          content: chatbot.welcome_message,
          created_at: new Date(0).toISOString(), // Ensures it's always first if sorted by date
          metadata: { chatbotId: chatbot.chatbot_id, isWelcomeMessage: true },
        };
        fetchedMsgs = [welcomeMsg]; // Show only welcome message if no other history
      }

      setMessages(fetchedMsgs);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load messages');
      fetchedRef.current = false;
    } finally {
      setIsFetchingMessages(false);
    }
  // MODIFIED: Added `chatbot.welcome_message` to dependencies of fetchMessages
  // This ensures fetchMessages is re-evaluated if the welcome message itself changes (e.g., teacher edits it)
  // and the component re-renders with the new chatbot prop.
  }, [roomId, chatbot?.chatbot_id, chatbot?.welcome_message, userId, scrollToBottom]);

  useEffect(() => {
    if (userId && chatbot?.chatbot_id && !fetchedRef.current) {
      fetchMessages();
    }
    // This cleanup logic for fetchedRef seems fine for re-fetching if chatbotId changes.
    const currentChatbotId = chatbot?.chatbot_id;
    return () => {
        if (currentChatbotId !== chatbot?.chatbot_id) {
            fetchedRef.current = false;
        }
    }
  }, [userId, chatbot?.chatbot_id, fetchMessages]);


  const handleRetryFetch = () => {
    fetchedRef.current = false; // Allow refetch
    fetchMessages();
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !userId || !chatbot?.chatbot_id || !roomId) return;

    setIsLoading(true);
    setError(null);
    const isAssessmentTrigger = chatbot.bot_type === 'assessment' && content.trim().toLowerCase() === ASSESSMENT_TRIGGER_COMMAND;

    const optimisticUserMessage: ChatMessage = {
      message_id: `local-user-${Date.now()}`,
      room_id: roomId,
      user_id: userId,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
      metadata: { chatbotId: chatbot.chatbot_id }
    };

    // If the current first message is the welcome message, remove it before adding the user's message,
    // as the conversation has now truly started.
    setMessages(prev => {
        const currentMessages = [...prev];
        if (currentMessages.length === 1 && currentMessages[0].metadata?.isWelcomeMessage) {
            return [optimisticUserMessage];
        }
        return [...currentMessages, optimisticUserMessage];
    });


    // ... (rest of handleSendMessage for assessment trigger and regular chat streaming remains IDENTICAL to your provided code) ...
    if (isAssessmentTrigger) {
      const optimisticAssessmentPlaceholder: ChatMessage = {
        message_id: `local-assessment-placeholder-${Date.now()}`,
        room_id: roomId,
        user_id: "system-assessment",
        role: 'system',
        content: 'Processing your assessment request...',
        created_at: new Date().toISOString(),
        metadata: { chatbotId: chatbot.chatbot_id, isAssessmentPlaceholder: true }
      };
      setMessages(prev => [...prev, optimisticAssessmentPlaceholder]);
      setTimeout(scrollToBottom, 50);

      try {
        const response = await fetch(`/api/chat/${roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content.trim(),
            chatbot_id: chatbot.chatbot_id,
          }),
        });
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticAssessmentPlaceholder.message_id));
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: 'Failed to parse API error response' } }));
          throw new Error(errorData.error?.message || `API error processing assessment (status: ${response.status})`);
        }
        const assessmentResult = await response.json();
        if (assessmentResult.type === "assessment_feedback") { // Assuming your API sends this type
          const feedbackMessage: ChatMessage = {
            message_id: assessmentResult.assessmentId || `local-assessment-feedback-${Date.now()}`,
            room_id: roomId,
            user_id: "system-feedback",
            role: 'system',
            content: assessmentResult.feedback, // And this content
            created_at: new Date().toISOString(),
            metadata: { chatbotId: chatbot.chatbot_id, isAssessmentFeedback: true, assessmentId: assessmentResult.assessmentId }
          };
          setMessages(prev => [...prev, feedbackMessage]);
          if (assessmentResult.assessmentId) {
              alert("Assessment feedback received! You can also view it in 'My Assessments'.");
          }
        } else if (assessmentResult.type === "assessment_pending") { // Handle pending message from API
            const pendingMessage: ChatMessage = {
                message_id: `local-assessment-pending-${Date.now()}`,
                room_id: roomId,
                user_id: "system-assessment",
                role: 'system',
                content: assessmentResult.message, // Use message from API
                created_at: new Date().toISOString(),
                metadata: { chatbotId: chatbot.chatbot_id, isAssessmentPlaceholder: true }
            };
            setMessages(prev => [...prev, pendingMessage]);
        } else {
          throw new Error("Unexpected response from assessment API.");
        }
      } catch (err) {
        console.error('Assessment processing error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to process assessment';
        setError(errorMsg);
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticUserMessage.message_id));
        setMessages(prev => [...prev, {...optimisticUserMessage, metadata: {...optimisticUserMessage.metadata, error: errorMsg }}]);
      } finally {
        setIsLoading(false);
        setTimeout(scrollToBottom, 50);
      }
      return;
    }

    const optimisticAssistantPlaceholder: ChatMessage = {
      message_id: `local-assistant-${Date.now()}`,
      room_id: roomId,
      user_id: "assistant-placeholder",
      role: 'assistant',
      content: 'Thinking...',
      created_at: new Date().toISOString(),
      metadata: { chatbotId: chatbot.chatbot_id }
    };
    setMessages(prev => [...prev, optimisticAssistantPlaceholder]);
    setTimeout(scrollToBottom, 50);

    try {
      const response = await fetch(`/api/chat/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          chatbot_id: chatbot.chatbot_id,
          model: chatbot.model
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to parse API error response' } }));
        throw new Error(errorData.error?.message || `API error sending message (status: ${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';
      let firstChunkReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

         if (!firstChunkReceived) {
            setMessages(prev => prev.map(msg =>
                msg.message_id === optimisticAssistantPlaceholder.message_id
                ? { ...msg, content: '' }
                : msg
            ));
            firstChunkReceived = true;
         }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data.trim() === '[DONE]') continue;
            try {
              const parsedData = JSON.parse(data);
              if (parsedData.content) {
                streamedContent += parsedData.content;
                setMessages(prev => prev.map(msg =>
                  msg.message_id === optimisticAssistantPlaceholder.message_id
                    ? { ...msg, content: streamedContent }
                    : msg
                ));
                 scrollToBottom();
              }
            } catch (e) {
              console.error('Error parsing stream data chunk:', e, "Data:", data);
            }
          }
        }
      }
       setMessages(prev => prev.map(msg =>
        msg.message_id === optimisticAssistantPlaceholder.message_id
          ? { ...msg, content: streamedContent.trim(), updated_at: new Date().toISOString() } // Add updated_at
          : msg
       ).filter(msg => msg.message_id !== `welcome-${chatbot.chatbot_id}`)); // Remove welcome message if it was there

    } catch (err) {
      console.error('Chat send/receive error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to send or receive message';
      setError(errorMsg);
      // Remove optimistic messages on error
      setMessages(prev => prev.filter(msg =>
          msg.message_id !== optimisticUserMessage.message_id &&
          msg.message_id !== optimisticAssistantPlaceholder.message_id &&
          msg.message_id !== `welcome-${chatbot.chatbot_id}` // Also ensure welcome is removed if error occurs
      ));
       // Re-add user message with error indication
       setMessages(prev => [...prev, {...optimisticUserMessage, metadata: {...optimisticUserMessage.metadata, error: errorMsg}}]);
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 50);
    }
  };

  return (
    <ChatContainer>
      {fetchError && (
        <ErrorContainer variant="error">
          Error loading messages: {fetchError}
          <Button onClick={handleRetryFetch} size="small" style={{ marginLeft: '10px' }}>Retry</Button>
        </ErrorContainer>
      )}

      <MessagesList>
        {/* MODIFIED: Logic for EmptyState or initial message */}
        {isFetchingMessages && messages.length === 0 ? (
           <LoadingIndicator><LoadingSpinner /> Loading messages...</LoadingIndicator>
        ) : !isFetchingMessages && messages.length === 0 && !fetchError && !(chatbot.welcome_message && chatbot.welcome_message.trim() !== '') ? (
          // Show EmptyState only if there are no messages AND no welcome message to display
          <EmptyState>
            <h3>Start your conversation with {chatbot.name}</h3>
            <p>Your chat history will appear here.</p>
            {chatbot.bot_type === 'assessment' && <p>Type <strong>{ASSESSMENT_TRIGGER_COMMAND}</strong> when you are ready for an assessment.</p>}
          </EmptyState>
        ) : (
          messages.map((message) => (
            <ChatMessageComponent
              key={message.message_id} // Assuming message_id is always unique now
              message={message}
              chatbotName={chatbot.name}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </MessagesList>

      <StyledChatInputContainer>
        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          error={error}
          onClearError={() => setError(null)}
          hint={chatbot.bot_type === 'assessment' ? `Type ${ASSESSMENT_TRIGGER_COMMAND} to submit for assessment.` : undefined}
        />
      </StyledChatInputContainer>
    </ChatContainer>
  );
}