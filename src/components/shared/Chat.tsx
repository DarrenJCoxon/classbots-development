// src/components/shared/Chat.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { createClient } from '@/lib/supabase/client';
import { Card, Alert, Button } from '@/styles/StyledComponents';
import { ChatMessage as ChatMessageComponent } from '@/components/shared/ChatMessage';
import ChatInput from '@/components/shared/ChatInput';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
// --- CORRECTED IMPORT ---
import type { ChatMessage, Chatbot } from '@/types/database.types';
// ------------------------

const ChatContainer = styled(Card)`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px); /* Adjust as needed */
  max-height: 800px;
  position: relative;
  padding: 0; /* Remove Card padding if MessagesList/InputContainer handle it */

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    height: calc(100vh - 150px);
    max-height: none;
    margin: 0;
    border-radius: 0;
    border: none; /* Remove border on mobile */
    box-shadow: none; /* Remove shadow on mobile */
  }
`;

const MessagesList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background};
  /* No border-radius needed if ChatContainer handles it */

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

const StyledChatInputContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundCard};
  /* No border-radius needed if ChatContainer handles it */


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
  // --- CORRECTED TYPE for messages state ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // -----------------------------------------
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMessages, setIsFetchingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false); // To prevent multiple initial fetches
  const supabase = createClient();

  useEffect(() => {
    const getUserId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        } else {
          console.warn("Chat component: User not authenticated.");
          setFetchError("Authentication error. Please log in.");
        }
      } catch (err) {
        console.error('Error getting user ID:', err);
        setFetchError("Could not verify user. Please try refreshing.");
      }
    };
    getUserId();
  }, [supabase]); // Depend only on supabase client

  const scrollToBottom = useCallback(() => { // Wrap in useCallback
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  },[]); // No dependencies needed if it only uses ref

  const fetchMessages = useCallback(async () => {
    if (!chatbot?.chatbot_id || !userId || !roomId) {
        if (!chatbot?.chatbot_id) console.log("Fetch messages waiting: no chatbotId");
        if (!userId) console.log("Fetch messages waiting: no userId");
        if (!roomId) console.log("Fetch messages waiting: no roomId");
        setIsFetchingMessages(false); // Stop loading if prerequisites aren't met
        return;
    }

    console.log(`Fetching messages for room: ${roomId}, chatbot: ${chatbot.chatbot_id}, user: ${userId}`);
    setIsFetchingMessages(true);
    setFetchError(null);
    fetchedRef.current = true;

    try {
      const url = `/api/chat/${roomId}?chatbotId=${chatbot.chatbot_id}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Failed to parse error response');
        console.error(`API error fetching messages: ${response.status}`, errorText);
        throw new Error(`Failed to fetch messages (status: ${response.status})`);
      }

      const data = await response.json();
      console.log("Fetched messages data:", data);
      // --- CORRECTED TYPE for fetched data ---
      setMessages(Array.isArray(data) ? data as ChatMessage[] : []);
      // --------------------------------------
      // Use timeout to allow DOM update before scrolling
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Message fetch error:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to load messages');
      fetchedRef.current = false; // Allow retry if fetch failed
    } finally {
      setIsFetchingMessages(false);
    }
  }, [roomId, chatbot?.chatbot_id, userId, scrollToBottom]); // Add scrollToBottom to deps

  useEffect(() => {
    // Fetch only when userId and chatbotId are available, and haven't successfully fetched yet
    if (userId && chatbot?.chatbot_id && !fetchedRef.current) {
      fetchMessages();
    }
    // If chatbotId changes, reset fetchedRef and fetch again
    const chatbotId = chatbot?.chatbot_id; // Capture for effect cleanup
    return () => {
        if (chatbotId !== chatbot?.chatbot_id) {
            fetchedRef.current = false;
        }
    }

  }, [userId, chatbot?.chatbot_id, fetchMessages]);


  const handleRetryFetch = () => {
    fetchedRef.current = false; // Allow refetch attempt
    fetchMessages();
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !userId || !chatbot?.chatbot_id || !roomId) return;

    setIsLoading(true);
    setError(null);

    // --- CORRECTED TYPE for optimistic messages ---
    const optimisticUserMessage: ChatMessage = {
      message_id: `local-user-${Date.now()}`,
      room_id: roomId,
      user_id: userId,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
      metadata: { chatbotId: chatbot.chatbot_id }
    };

    const optimisticAssistantPlaceholder: ChatMessage = {
      message_id: `local-assistant-${Date.now()}`,
      room_id: roomId,
      user_id: "assistant-placeholder", // Placeholder
      role: 'assistant',
      content: 'Thinking...',
      created_at: new Date().toISOString(),
      metadata: { chatbotId: chatbot.chatbot_id }
    };
    // --------------------------------------------

    setMessages(prev => [...prev, optimisticUserMessage, optimisticAssistantPlaceholder]);
    setTimeout(scrollToBottom, 50); // Scroll immediately

    try {
      const response = await fetch(`/api/chat/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          chatbot_id: chatbot.chatbot_id,
          model: chatbot.model // Send model preference if available
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to parse API error response' } }));
        console.error("Send message API error:", errorData);
        throw new Error(errorData.error?.message || `API error sending message (status: ${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';
      let firstChunkReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

         // Update placeholder on first chunk received
         if (!firstChunkReceived) {
            setMessages(prev => prev.map(msg =>
                msg.message_id === optimisticAssistantPlaceholder.message_id
                ? { ...msg, content: '' } // Clear "Thinking..."
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
                    ? { ...msg, content: streamedContent } // Append streamed content
                    : msg
                ));
                // Consider scrolling less frequently for performance
                 scrollToBottom();
              }
            } catch (e) {
              console.error('Error parsing stream data chunk:', e, "Data:", data);
            }
          }
        }
      }
      console.log("Stream finished. Full response:", streamedContent);
      // Backend saves the full message upon stream completion in its finally block.
      // We can optionally update the local message ID once the backend confirms saving,
      // but for now, the optimistic ID works for rendering.
      // Consider a final update here or rely on a potential WebSocket update later.
       setMessages(prev => prev.map(msg =>
        msg.message_id === optimisticAssistantPlaceholder.message_id
          ? { ...msg, content: streamedContent.trim() } // Ensure final content is trimmed
          : msg
       ));


    } catch (err) {
      console.error('Chat send/receive error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to send or receive message';
      setError(errorMsg);
      // Remove optimistic messages on error
      setMessages(prev => prev.filter(msg =>
          msg.message_id !== optimisticUserMessage.message_id &&
          msg.message_id !== optimisticAssistantPlaceholder.message_id
      ));
       // Optionally, re-add the user message that failed to send, perhaps with an error indicator
       setMessages(prev => [...prev, {...optimisticUserMessage, metadata: {...optimisticUserMessage.metadata, error: errorMsg}}]);

    } finally {
      setIsLoading(false);
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
        {isFetchingMessages && messages.length === 0 ? (
           <LoadingIndicator><LoadingSpinner /> Loading messages...</LoadingIndicator>
        ) : !isFetchingMessages && messages.length === 0 && !fetchError ? (
          <EmptyState>
            <h3>Start your conversation with {chatbot.name}</h3>
            <p>Your chat history will appear here.</p>
          </EmptyState>
        ) : (
          messages.map((message) => (
            <ChatMessageComponent
              // Use message_id if available, otherwise generate a fallback key
              key={message.message_id || `local-${message.role}-${message.created_at}-${Math.random()}`}
              message={message}
              chatbotName={chatbot.name}
            />
          ))
        )}
        <div ref={messagesEndRef} /> {/* Element to scroll to */}
      </MessagesList>

      <StyledChatInputContainer>
        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          error={error}
          onClearError={() => setError(null)}
        />
      </StyledChatInputContainer>
    </ChatContainer>
  );
}