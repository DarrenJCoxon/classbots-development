// src/components/shared/Chat.tsx (SUPER SIMPLIFIED DIAGNOSTIC VERSION)
'use client';
import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { createClient } from '@/lib/supabase/client';
import { Card, Alert, Button } from '@/styles/StyledComponents';
import { ChatMessage as ChatMessageComponent } from '@/components/shared/ChatMessage';
import ChatInput from '@/components/shared/ChatInput';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ChatMessage, Chatbot } from '@/types/database.types';

const ASSESSMENT_TRIGGER_COMMAND = "/assess";

// Styled Components (Keep as is)
const ChatContainer = styled(Card)` /* ... */ `;
const MessagesList = styled.div` /* ... */ `;
const StyledChatInputContainer = styled.div` /* ... */ `;
const EmptyState = styled.div` /* ... */ `;
const ErrorContainer = styled(Alert)` /* ... */ `;
const LoadingIndicator = styled.div` /* ... */ `;
const SubmitAssessmentButton = styled(Button)`
  margin-top: 1rem;
  width: 100%;
`;

const ThinkingIndicator = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.textMuted};
  font-style: italic;
  
  svg {
    margin-right: ${({ theme }) => theme.spacing.sm};
    animation: pulse 1.5s infinite ease-in-out;
  }
  
  @keyframes pulse {
    0% { opacity: 0.4; }
    50% { opacity: 1; }
    100% { opacity: 0.4; }
  }
`;

interface ChatProps {
  roomId: string;
  chatbot: Chatbot;
}

export default function Chat({ roomId, chatbot }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Keep for ChatInput
  const [isFetchingMessages, setIsFetchingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null); // Keep for ChatInput
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUserId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
        else setFetchError("Auth error: No user.");
      } catch { setFetchError("Auth error."); }
    };
    getUserId();
  }, [supabase]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Simplified fetchMessages - just loads initial, no welcome message logic for this test
  const fetchMessages = useCallback(async () => {
    if (!chatbot?.chatbot_id || !userId || !roomId) {
      setIsFetchingMessages(false); return;
    }
    setIsFetchingMessages(true); setFetchError(null);
    try {
      const url = `/api/chat/${roomId}?chatbotId=${chatbot.chatbot_id}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch (status: ${response.status})`);
      const data = (await response.json()) as ChatMessage[];
      setMessages(Array.isArray(data) ? data.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) : []);
      setTimeout(scrollToBottom, 150);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsFetchingMessages(false);
    }
  }, [roomId, chatbot?.chatbot_id, userId, scrollToBottom]);

  useEffect(() => {
    if (userId && chatbot?.chatbot_id && roomId) {
      fetchMessages();
    }
  }, [userId, chatbot?.chatbot_id, roomId, fetchMessages]);

  // Helper function to handle realtime message inserts
  const handleRealtimeMessage = useCallback((newMessage: ChatMessage) => {
    setMessages((prevMessages) => {
      // Check if message already exists by ID
      if (prevMessages.find(msg => msg.message_id === newMessage.message_id)) {
        console.log(`[Chat.tsx RT] Message ${newMessage.message_id} already in state by ID.`);
        return prevMessages;
      }
      
      // For user messages, check if we have an optimistic version with the same content
      if (newMessage.role === 'user') {
        const hasOptimisticVersion = prevMessages.some(msg => 
          msg.role === 'user' && 
          msg.metadata?.isOptimistic === true && 
          msg.metadata?.optimisticContent === newMessage.content &&
          msg.user_id === newMessage.user_id
        );
        
        if (hasOptimisticVersion) {
          console.log(`[Chat.tsx RT] Optimistic version of message found, replacing it.`);
          // Replace the optimistic message with the real one
          const updated = prevMessages
            .filter(msg => !(
              msg.role === 'user' && 
              msg.metadata?.isOptimistic === true && 
              msg.metadata?.optimisticContent === newMessage.content &&
              msg.user_id === newMessage.user_id
            ))
            .concat(newMessage);
          
          updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          return updated;
        }
      }
      
      // No duplicate found, add the new message
      console.log(`[Chat.tsx RT] Adding new message ${newMessage.message_id} (Role: ${newMessage.role}).`);
      const updated = [...prevMessages, newMessage];
      updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return updated;
    });
    setTimeout(scrollToBottom, 100);
  }, [scrollToBottom]);
  
  // Helper function to handle realtime message updates
  const handleRealtimeUpdate = useCallback((updatedMessage: ChatMessage) => {
    setMessages((prevMessages) => {
      // Find the message to update by ID
      const messageIndex = prevMessages.findIndex(msg => msg.message_id === updatedMessage.message_id);
      
      if (messageIndex === -1) {
        console.log(`[Chat.tsx RT] Can't find message ${updatedMessage.message_id} to update. Adding instead.`);
        const updated = [...prevMessages, updatedMessage];
        updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        return updated;
      }
      
      console.log(`[Chat.tsx RT] Updating existing message ${updatedMessage.message_id}`);
      const updated = [...prevMessages];
      updated[messageIndex] = updatedMessage;
      return updated;
    });
    setTimeout(scrollToBottom, 100);
  }, [scrollToBottom]);

  // --- REALTIME LISTENER ---
  useEffect(() => {
    const effectChatbotId = chatbot?.chatbot_id; // Use optional chaining for safety
    const effectUserId = userId;

    if (!roomId || !effectChatbotId || !effectUserId || !supabase) {
        console.log('[Chat.tsx RT] Aborting subscription - missing params.', 
            { roomId, effectChatbotId, effectUserId });
        return;
    }

    const channelIdentifier = `chat-room-${roomId}-user-${effectUserId}-bot-${effectChatbotId}`;
    console.log(`[Chat.tsx RT] Subscribing to: ${channelIdentifier}`);
    
    const channel = supabase
      .channel(channelIdentifier)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}`},
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          console.log('[Chat.tsx RT] <<< INSERT REALTIME PAYLOAD RECEIVED >>>:', JSON.stringify(newMessage, null, 2));
          
          // Handle INSERT events
          if (newMessage.room_id === roomId) {
            handleRealtimeMessage(newMessage);
          } else {
            console.log(`[Chat.tsx RT] Received message for different room: ${newMessage.room_id}`);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}`},
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          console.log('[Chat.tsx RT] <<< UPDATE REALTIME PAYLOAD RECEIVED >>>:', JSON.stringify(updatedMessage, null, 2));
          
          // Handle UPDATE events
          if (updatedMessage.room_id === roomId) {
            handleRealtimeUpdate(updatedMessage);
          } else {
            console.log(`[Chat.tsx RT] Received update for different room: ${updatedMessage.room_id}`);
          }
        }
      )
      .subscribe((status, err) => { 
        if (status === 'SUBSCRIBED') {
            console.log(`[Chat.tsx RT] Successfully SUBSCRIBED to ${channelIdentifier}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`[Chat.tsx RT] Subscription status: ${status} for channel ${channelIdentifier}`, err);
        }
       });
      
    return () => {
      console.log(`[Chat.tsx RT] CLEANUP for channel: ${channelIdentifier}`);
      supabase.removeChannel(channel).catch(error => console.error('[Chat.tsx RT] Error removing channel:', error));
    };
  }, [roomId, chatbot?.chatbot_id, userId, supabase, handleRealtimeMessage, handleRealtimeUpdate]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !userId || !chatbot?.chatbot_id || !roomId) return;
    setIsLoading(true); setError(null);

    // --- OPTIMISTIC UPDATE WITH TRACKING FLAG ---
    const tempOptimisticLocalId = `local-user-${Date.now()}`;
    const optimisticUserMessage: ChatMessage = {
      message_id: tempOptimisticLocalId,
      room_id: roomId, user_id: userId, role: 'user', content: content.trim(),
      created_at: new Date().toISOString(),
      metadata: { 
        chatbotId: chatbot.chatbot_id, 
        isOptimistic: true,
        optimisticContent: content.trim() // Track the content for deduplication
      }
    };
    setMessages(prev => [...prev, optimisticUserMessage].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    setTimeout(scrollToBottom, 50);
    // --- END OPTIMISTIC UPDATE ---

    try {
        const response = await fetch(`/api/chat/${roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim(), chatbot_id: chatbot.chatbot_id, model: chatbot.model }),
        });

        // Client doesn't need to process response body if Realtime handles all message display
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: {message: "Unknown API error"}}));
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }
        // If API call is successful, we assume the message is in DB and Realtime will deliver it.
        // The optimistic message will be dealt with by the simplified Realtime handler (it will be duplicated for now).
    } catch (err) {
        console.error('[Chat.tsx] Chat send/receive error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMsg);
        setMessages(prev => prev.map(m => 
            m.message_id === tempOptimisticLocalId ? 
            {...m, metadata: {...m.metadata, error: errorMsg, isOptimistic: false }} : m 
        ));
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 50);
    }
  };

  const handleSubmitAssessment = async () => {
    if (isLoading || isSubmittingAssessment || !userId || !chatbot?.chatbot_id || !roomId) return;
    setIsSubmittingAssessment(true);
    
    try {
      await handleSendMessage(ASSESSMENT_TRIGGER_COMMAND);
    } catch (err) {
      console.error('[Chat.tsx] Assessment submission error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit assessment';
      setError(errorMsg);
    } finally {
      setIsSubmittingAssessment(false);
    }
  };
  
  return (
    <ChatContainer>
      {fetchError && ( <ErrorContainer variant="error"> {`Error loading: ${fetchError}`} <Button onClick={() => fetchMessages()} size="small">Retry</Button> </ErrorContainer> )}
      <MessagesList>
        {isFetchingMessages && messages.length === 0 ? ( <LoadingIndicator><LoadingSpinner /> Loading...</LoadingIndicator> ) : 
         !isFetchingMessages && messages.length === 0 && !fetchError && !(chatbot.welcome_message && chatbot.welcome_message.trim() !== '') ? (
          <EmptyState>
            <h3>Start with {chatbot.name}</h3>
            <p>History will appear here.</p>
            {chatbot.bot_type === 'assessment' && <p>Click the Submit Assessment button when you&apos;re ready to be assessed.</p>}
          </EmptyState>
        ) : (
          messages
            .filter(message => message.role !== 'system' || message.metadata?.isSystemSafetyResponse)
            .map((message) => (
              <ChatMessageComponent key={message.message_id} message={message} chatbotName={chatbot.name} />
            ))
        )}
        {isLoading && (
          <ThinkingIndicator>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 7C11.4696 7 10.9609 7.21071 10.5858 7.58579C10.2107 7.96086 10 8.46957 10 9V12C10 12.5304 10.2107 13.0391 10.5858 13.4142C10.9609 13.7893 11.4696 14 12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142C13.7893 13.0391 14 12.5304 14 12V9C14 8.46957 13.7893 7.96086 13.4142 7.58579C13.0391 7.21071 12.5304 7 12 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {chatbot.name} is thinking...
          </ThinkingIndicator>
        )}
        <div ref={messagesEndRef} />
      </MessagesList>
      <StyledChatInputContainer>
        <ChatInput onSend={handleSendMessage} isLoading={isLoading} error={error} onClearError={() => setError(null)} />
        {chatbot.bot_type === 'assessment' && (
          <SubmitAssessmentButton 
            onClick={handleSubmitAssessment} 
            disabled={isLoading || isSubmittingAssessment}
            variant="primary"
          >
            {isSubmittingAssessment ? 'Submitting Assessment...' : 'Submit Assessment'}
          </SubmitAssessmentButton>
        )}
      </StyledChatInputContainer>
    </ChatContainer>
  );
}