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

// Basic front-end safety check to prepare for potential safety responses
// This is just a preliminary check to show a UI placeholder while the server processes
// the safety check - the server has more comprehensive checks
const initialSafetyCheck = (message: string): boolean => {
  // Keywords for a basic check on the client side - these will trigger a UI placeholder
  // The actual safety response will be determined by the server
  const BASIC_KEYWORDS = [
    // Self harm category
    'suicide', 'kill myself', 'die', 'hurt myself', 'end my life', 'take my own life',
    'self harm', 'harming myself', 'cutting myself', 'cut myself',
    'don\'t want to live', 'want to die', 'wanna die', 'better off dead',
    'no reason to live', 'not worth living', 'end it all',
    
    // Bullying category
    'bullied', 'bullying', 'being bullied', 'getting bullied', 
    'laughed at', 'picking on me', 'make fun of me', 'making fun of me',
    'everyone hates me', 'nobody likes me', 'no friends', 'don\'t have friends',
    
    // Depression category
    'depressed', 'depression', 'hate myself', 'hate my life',
    'feeling worthless', 'feel worthless', 'empty', 'no one cares',
    'nobody cares', 'given up', 'lost hope', 'no hope',
    
    // Abuse category
    'abused', 'hitting me', 'hits me', 'beat me', 'beating me',
    'hurt', 'hurting me', 'scared', 'afraid', 'in danger',
    'threatening me', 'threatened', 'unsafe', 'not safe',
    
    // Family issues
    'parents fighting', 'parents argue', 'scared at home', 'afraid at home',
    'kicked out', 'homeless', 'nowhere to go', 'no food',
    'don\'t feel safe', 'not safe at home'
  ];
  
  const lowerMessage = message.toLowerCase();
  
  for (const keyword of BASIC_KEYWORDS) {
    // Check for word boundaries to avoid false positives
    const regex = new RegExp(`\\b${keyword.replace(/'/g, "['']")}\\b`);
    if (regex.test(lowerMessage)) {
      console.log(`[Chat Safety] Potential safety keyword detected: "${keyword}"`);
      return true;
    }
  }
  
  // Additional patterns that need more context
  const contextPatterns = [
    // Self-harm phrases with multiple words
    /hate myself.*(live|going on|anymore)/i,
    /(tired|exhausted).*(living|existing|everything)/i,
    /no point.*(living|going on)/i,
    /can't take (it|this) anymore/i,
    
    // Bullying phrases
    /they (all )?(hate|ignore) me/i,
    /(no one|nobody) (talks|speaks|listens) to me/i,
    /afraid (of|at) school/i,
    
    // Abuse phrases
    /\w+ (hit|hurt|abuse|kick) me/i,  // Someone hit me
    /afraid of \w+/i  // Afraid of someone
  ];
  
  for (const pattern of contextPatterns) {
    if (pattern.test(lowerMessage)) {
      console.log(`[Chat Safety] Potential safety pattern detected: "${pattern}"`);
      return true;
    }
  }
  
  return false;
};

// Styled Components (Keep as is)
const ChatContainer = styled(Card)`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px;
  overflow: hidden;
  position: relative;
`;

const MessagesList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledChatInputContainer = styled.div`
  padding: 1rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 2rem;
  color: ${({ theme }) => theme.colors.textLight};
  
  h3 {
    margin-bottom: 0.5rem;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const ErrorContainer = styled(Alert)`
  margin: 1rem;
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.textLight};
`;

const ClearChatButton = styled.button`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.backgroundDark};
    color: ${({ theme }) => theme.colors.textLight};
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;
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
  // These were intended for direct access but are now handled via the URL
  // Kept for backwards compatibility
  studentId?: string;
  directMode?: boolean;
  // New field for student-specific chatbot instances
  instanceId?: string;
}

export default function Chat({ roomId, chatbot, instanceId }: ChatProps) {
  // studentId and directMode params removed as they're not used
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Keep for ChatInput
  const [isFetchingMessages, setIsFetchingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null); // Keep for ChatInput
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Check for direct auth via URL
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    // Get search params from URL in a client-safe way
    if (typeof window !== 'undefined') {
      setSearchParams(new URLSearchParams(window.location.search));
    }
  }, []);

  // Get user ID with fallbacks
  useEffect(() => {
    const getUserId = async () => {
      try {
        // Priority 1: Try normal auth session
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('[Chat] Found authenticated user:', user.id);
          setUserId(user.id);
          return;
        }
        
        // Priority 2: Check for emergency cookies
        const getEmergencyCookieValue = (name: string): string | null => {
          if (typeof document === 'undefined') return null;
          const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
          return match ? decodeURIComponent(match[2]) : null;
        };
        
        const emergencyUserId = getEmergencyCookieValue('emergency_user_id');
        const emergencyAccess = getEmergencyCookieValue('emergency_access');
        
        if (emergencyUserId && emergencyAccess === 'true') {
          console.log('[Chat] Using emergency user ID from cookies:', emergencyUserId);
          setUserId(emergencyUserId);
          return;
        }
        
        // Priority 3: Check for uid in URL
        const uidFromUrl = searchParams?.get('uid');
        if (uidFromUrl) {
          console.log('[Chat] Using user ID from URL:', uidFromUrl);
          
          // Verify this is a valid user with API
          try {
            const response = await fetch(`/api/student/verify-user?userId=${uidFromUrl}`);
            if (response.ok) {
              const data = await response.json();
              if (data.valid) {
                setUserId(uidFromUrl);
                return;
              }
            }
          } catch (verifyError) {
            console.error('[Chat] Error verifying user from URL:', verifyError);
          }
        }
        
        // No valid user found
        setFetchError("Auth error: No user. Try refreshing the page.");
      } catch (err) { 
        console.error('[Chat] Auth error:', err);
        setFetchError("Auth error. Try refreshing the page."); 
      }
    };
    
    if (searchParams !== null) {
      getUserId();
    }
  }, [supabase, searchParams]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Helper function to fetch safety messages
  const fetchSafetyMessages = useCallback(async () => {
    if (!userId || !roomId) return;
    
    try {
      console.log(`[Chat.tsx] Checking for new safety messages for user ${userId} in room ${roomId}`);
      const response = await fetch(`/api/student/safety-message?userId=${userId}&roomId=${roomId}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.error(`[Chat.tsx] Error fetching safety messages: HTTP ${response.status}`);
        return;
      }
      
      const safetyData = await response.json();
      
      if (safetyData.found && safetyData.message) {
        console.log(`[Chat.tsx] Found safety message ${safetyData.message.message_id}`);
        
        // Check if we already have this message in state
        setMessages((prevMessages) => {
          const alreadyHasMessage = prevMessages.some(msg => 
            msg.message_id === safetyData.message.message_id
          );
          
          if (alreadyHasMessage) {
            console.log(`[Chat.tsx] Safety message ${safetyData.message.message_id} already in state`);
            return prevMessages;
          }
          
          // Remove any safety placeholders
          const withoutPlaceholders = prevMessages.filter(msg => 
            !msg.metadata?.isSafetyPlaceholder
          );
          
          // Add the new safety message
          const newMessages = [...withoutPlaceholders, safetyData.message];
          console.log(`[Chat.tsx] Added safety message ${safetyData.message.message_id} to chat`);
          
          // Sort by timestamp
          return newMessages.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
        
        // Update the notification status to delivered
        try {
          const { error } = await supabase
            .from('safety_notifications')
            .update({ is_delivered: true, delivered_at: new Date().toISOString() })
            .eq('message_id', safetyData.message.message_id)
            .eq('user_id', userId);
            
          if (error) {
            console.error(`[Chat.tsx] Error updating notification status:`, error);
          } else {
            console.log(`[Chat.tsx] Marked notification for message ${safetyData.message.message_id} as delivered`);
          }
        } catch (updateError) {
          console.error(`[Chat.tsx] Exception updating notification status:`, updateError);
        }
        
        // Scroll to show the safety message
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error(`[Chat.tsx] Error in fetchSafetyMessages:`, error);
    }
  }, [userId, roomId, supabase, scrollToBottom]);
  
  // Fetch messages with support for direct URL access and homepage fallback
  const fetchMessages = useCallback(async () => {
    if (!chatbot?.chatbot_id || !userId || !roomId) {
      setIsFetchingMessages(false); return;
    }
    setIsFetchingMessages(true); setFetchError(null);
    try {
      // Check if using emergency access or direct URL
      const isEmergencyAccess = document.cookie.includes('emergency_access=true');
      const uidFromUrl = searchParams?.get('uid');
      const emergency = searchParams?.get('emergency');
      
      // Enhanced debugging for instance ID
      console.log(`[Chat] Starting fetchMessages with:
      - instanceId: ${instanceId || 'undefined'}
      - roomId: ${roomId}
      - chatbotId: ${chatbot?.chatbot_id}
      - userId: ${userId}
      `);
      
      // Additional validation
      if (!instanceId) {
        console.warn(`[Chat] No instanceId provided but we are on path ${window.location.pathname} - this might cause shared chat issues`);
      }
      
      // First try to determine the API endpoint
      let url;
      if (isEmergencyAccess || (emergency === 'true') || (uidFromUrl && uidFromUrl === userId)) {
        // Direct access mode - Emergency access takes priority
        url = `/api/chat/direct-access?roomId=${roomId}&userId=${userId}&chatbotId=${chatbot.chatbot_id}`;
        if (instanceId) {
          url += `&instanceId=${instanceId}`;
          console.log('[Chat] Added instanceId to direct access URL:', instanceId);
        } else {
          console.log('[Chat] No instanceId available for direct access URL');
        }
        console.log('[Chat] Using direct access endpoint (emergency or URL parameter)');
      } else if (window.location.pathname === '/' || window.location.pathname.includes('/page')) {
        // Homepage fallback endpoint with less complex queries
        url = `/api/homepage-chat?roomId=${roomId}&chatbotId=${chatbot.chatbot_id}`;
        if (instanceId) {
          url += `&instanceId=${instanceId}`;
          console.log('[Chat] Added instanceId to homepage URL:', instanceId);
        } else {
          console.log('[Chat] No instanceId available for homepage URL');
        }
      } else {
        // Regular API endpoint
        url = `/api/chat/${roomId}?chatbotId=${chatbot.chatbot_id}`;
        if (instanceId) {
          url += `&instanceId=${instanceId}`;
          console.log('[Chat] Added instanceId to regular URL:', instanceId);
        } else {
          console.log('[Chat] No instanceId available for regular URL');
        }
      }
      
      console.log(`[Chat.tsx] Fetching messages from: ${url}`);
      const response = await fetch(url, { credentials: 'include' });
      
      if (!response.ok) {
        // If first attempt fails, try the fallback endpoint
        if (url.includes('/api/chat/') && !url.includes('/api/homepage-chat')) {
          console.log('[Chat.tsx] Primary endpoint failed, trying fallback...');
          // CRITICAL FIX: Always include instanceId in all API calls, including fallbacks
          const fallbackUrl = `/api/homepage-chat?roomId=${roomId}&chatbotId=${chatbot.chatbot_id}${instanceId ? `&instanceId=${instanceId}` : ''}`;
          console.log(`[Chat.tsx] Using fallback URL with instanceId=${instanceId || 'none'}: ${fallbackUrl}`);
          const fallbackResponse = await fetch(fallbackUrl, { credentials: 'include' });
          
          if (!fallbackResponse.ok) {
            throw new Error(`Fallback failed (status: ${fallbackResponse.status})`);
          }
          
          const fallbackData = await fallbackResponse.json();
          
          if (!Array.isArray(fallbackData)) {
            console.warn(`[Chat.tsx] Fallback fetch returned non-array data:`, fallbackData);
            return;
          }
          
          // De-duplicate messages by message_id
          const uniqueMessages = new Map<string, ChatMessage>();
          
          // First add all existing optimistic messages (that haven't been replaced yet)
          const existingOptimisticMessages = messages.filter(msg => 
            msg.metadata?.isOptimistic === true && 
            !fallbackData.some(m => m.metadata?.optimisticContent === msg.metadata?.optimisticContent)
          );
          
          // Also preserve safety placeholders if no real safety messages are present
          const safetyPlaceholders = messages.filter(msg => 
            msg.metadata?.isSafetyPlaceholder === true &&
            !fallbackData.some(m => m.metadata?.isSystemSafetyResponse === true && !m.metadata?.isSafetyPlaceholder)
          );
          
          // Add existing optimistic messages to the map
          existingOptimisticMessages.forEach(msg => {
            uniqueMessages.set(msg.message_id, msg);
          });
          
          // Add safety placeholders to the map
          safetyPlaceholders.forEach(msg => {
            uniqueMessages.set(msg.message_id, msg);
          });
          
          // Process incoming messages
          fallbackData.forEach(msg => {
            // Filter out duplicates - for user messages, also check content
            if (msg.role === 'user') {
              // Look for any optimistic messages with the same content
              const existingOptimisticIndex = Array.from(uniqueMessages.values()).findIndex(existingMsg => 
                existingMsg.metadata?.isOptimistic && 
                existingMsg.metadata?.optimisticContent === msg.content &&
                existingMsg.user_id === msg.user_id
              );
              
              if (existingOptimisticIndex !== -1) {
                // Replace optimistic message
                const existingKeys = Array.from(uniqueMessages.keys());
                if (existingOptimisticIndex < existingKeys.length) {
                  uniqueMessages.delete(existingKeys[existingOptimisticIndex]);
                }
              }
            }
            
            // Add this message
            uniqueMessages.set(msg.message_id, msg);
          });
          
          // Convert map back to array and sort
          const sortedUniqueMessages = Array.from(uniqueMessages.values())
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          console.log(`[Chat.tsx] Fallback fetch complete - ${fallbackData.length} raw messages, ${sortedUniqueMessages.length} unique messages`);
          setMessages(sortedUniqueMessages);
          setTimeout(scrollToBottom, 150);
          
          // Also fetch safety messages after regular messages are loaded
          await fetchSafetyMessages();
          
          return;
        } else {
          throw new Error(`Failed to fetch (status: ${response.status})`);
        }
      }
      
      const data = (await response.json()) as ChatMessage[];
      if (!Array.isArray(data)) {
        console.warn(`[Chat.tsx] Fetch messages returned non-array data:`, data);
        return;
      }
      
      // De-duplicate messages by message_id
      const uniqueMessages = new Map<string, ChatMessage>();
      
      // First add all existing optimistic messages (that haven't been replaced yet)
      const existingOptimisticMessages = messages.filter(msg => 
        msg.metadata?.isOptimistic === true && 
        !data.some(m => m.metadata?.optimisticContent === msg.metadata?.optimisticContent)
      );
      
      // Also preserve safety placeholders if no real safety messages are present
      const safetyPlaceholders = messages.filter(msg => 
        msg.metadata?.isSafetyPlaceholder === true &&
        !data.some(m => m.metadata?.isSystemSafetyResponse === true && !m.metadata?.isSafetyPlaceholder)
      );
      
      // Add existing optimistic messages to the map
      existingOptimisticMessages.forEach(msg => {
        uniqueMessages.set(msg.message_id, msg);
      });
      
      // Add safety placeholders to the map
      safetyPlaceholders.forEach(msg => {
        uniqueMessages.set(msg.message_id, msg);
      });
      
      // Process incoming messages
      data.forEach(msg => {
        // Filter out duplicates - for user messages, also check content
        if (msg.role === 'user') {
          // Look for any optimistic messages with the same content
          const existingOptimisticIndex = Array.from(uniqueMessages.values()).findIndex(existingMsg => 
            existingMsg.metadata?.isOptimistic && 
            existingMsg.metadata?.optimisticContent === msg.content &&
            existingMsg.user_id === msg.user_id
          );
          
          if (existingOptimisticIndex !== -1) {
            // Replace optimistic message
            const existingKeys = Array.from(uniqueMessages.keys());
            if (existingOptimisticIndex < existingKeys.length) {
              uniqueMessages.delete(existingKeys[existingOptimisticIndex]);
            }
          }
        }
        
        // Add this message
        uniqueMessages.set(msg.message_id, msg);
      });
      
      // Convert map back to array and sort
      const sortedUniqueMessages = Array.from(uniqueMessages.values())
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      console.log(`[Chat.tsx] Fetch complete - ${data.length} raw messages, ${sortedUniqueMessages.length} unique messages`);
      setMessages(sortedUniqueMessages);
      setTimeout(scrollToBottom, 150);
      
      // Also fetch safety messages after regular messages are loaded
      await fetchSafetyMessages();
      
    } catch (err) {
      console.error('[Chat.tsx] Error fetching messages:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsFetchingMessages(false);
    }
  }, [roomId, chatbot?.chatbot_id, userId, searchParams, scrollToBottom, fetchSafetyMessages]);

  // Add welcome message to empty chat
  useEffect(() => {
    console.log('[Chat] Checking welcome message conditions:', {
      isFetchingMessages,
      messagesLength: messages.length,
      hasWelcomeMessage: !!chatbot?.welcome_message,
      welcomeMessageContent: chatbot?.welcome_message?.substring(0, 20),
      hasUserId: !!userId
    });
    
    if (
      !isFetchingMessages && 
      messages.length === 0 && 
      chatbot?.welcome_message && 
      chatbot.welcome_message.trim() !== '' &&
      userId
    ) {
      console.log('[Chat] Adding welcome message for chatbot:', chatbot.chatbot_id);
      
      // Create a synthetic welcome message
      // Create a properly typed welcome message
      const welcomeMessageObj: ChatMessage = {
        message_id: `welcome-${chatbot.chatbot_id}-${Date.now()}`,
        room_id: roomId,
        user_id: userId,
        role: 'assistant' as 'assistant', // Explicitly typed as literal
        content: chatbot.welcome_message.trim(),
        created_at: new Date().toISOString(),
        metadata: {
          chatbotId: chatbot.chatbot_id,
          isWelcomeMessage: true
        }
      };
      
      // Add welcome message to state
      setMessages([welcomeMessageObj]);
      setTimeout(scrollToBottom, 150);
    }
  }, [isFetchingMessages, messages.length, chatbot?.welcome_message, chatbot?.chatbot_id, roomId, userId, scrollToBottom]);
  
  // Backup for welcome message if the above logic didn't trigger
  useEffect(() => {
    // This runs a bit after the first fetch completes and if we still have no messages
    const addDelayedWelcomeMessage = () => {
      if (
        !isFetchingMessages && 
        messages.length === 0 && 
        chatbot?.welcome_message && 
        chatbot.welcome_message.trim() !== '' &&
        userId
      ) {
        console.log('[Chat] Adding delayed welcome message for chatbot:', chatbot.chatbot_id);
        
        // Create a synthetic welcome message
        const welcomeMessageObj: ChatMessage = {
          message_id: `welcome-delayed-${chatbot.chatbot_id}-${Date.now()}`,
          room_id: roomId,
          user_id: userId,
          role: 'assistant' as 'assistant', // Explicitly typed as literal
          content: chatbot.welcome_message.trim(),
          created_at: new Date().toISOString(),
          metadata: {
            chatbotId: chatbot.chatbot_id,
            isWelcomeMessage: true,
            isDelayed: true
          }
        };
        
        // Add welcome message to state
        setMessages([welcomeMessageObj]);
        setTimeout(scrollToBottom, 150);
      }
    };
    
    // Wait a bit after fetching completes to add welcome message if needed
    if (!isFetchingMessages) {
      const timer = setTimeout(addDelayedWelcomeMessage, 500);
      return () => clearTimeout(timer);
    }
  }, [isFetchingMessages, messages.length, chatbot?.welcome_message, chatbot?.chatbot_id, roomId, userId, scrollToBottom]);

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
        const optimisticIndex = prevMessages.findIndex(msg => 
          msg.role === 'user' && 
          msg.metadata?.isOptimistic === true && 
          msg.metadata?.optimisticContent === newMessage.content &&
          msg.user_id === newMessage.user_id
        );
        
        if (optimisticIndex !== -1) {
          console.log(`[Chat.tsx RT] Optimistic version of message found at index ${optimisticIndex}, replacing it.`);
          // Replace the optimistic message with the real one
          const updated = [...prevMessages];
          updated[optimisticIndex] = newMessage;
          return updated;
        }
      }
      
      // For safety messages (system role with isSystemSafetyResponse), look for a safety placeholder
      if (newMessage.role === 'system' && newMessage.metadata?.isSystemSafetyResponse) {
        // Find and remove any safety placeholder
        const safetyPlaceholderIndex = prevMessages.findIndex(msg => 
          msg.metadata?.isSafetyPlaceholder === true
        );
        
        if (safetyPlaceholderIndex !== -1) {
          console.log(`[Chat.tsx RT] Replacing safety placeholder with real safety message ${newMessage.message_id}`);
          const updated = [...prevMessages];
          // Replace the placeholder with the real safety message
          updated[safetyPlaceholderIndex] = newMessage;
          return updated;
        }
        
        console.log(`[Chat.tsx RT] Adding safety message ${newMessage.message_id} (no placeholder found)`);
        // No safety placeholder found, but still add the safety message
      }
      
      // No duplicate or placeholder found, add the new message
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

    // Create a safety-specific channel to handle safety messages
    const safetyChannelId = `safety-alert-${effectUserId}`;
    console.log(`[Chat.tsx RT] Subscribing to safety channel: ${safetyChannelId}`);
    
    try {
      // Array to track all channels we create so we can clean them up properly
      const channels: any[] = [];
      
      // Subscribe to safety_notifications table changes - this provides a more reliable
      // backup to ensure safety messages are delivered
      console.log(`[Chat.tsx RT] Setting up realtime subscription for safety_notifications with user_id=${effectUserId}`);
      // Subscribe to safety_notifications table changes
      const notificationsChannel = supabase
        .channel('safety_notifications_realtime_' + Date.now(), {
          config: {
            broadcast: { self: true }, // Get events sent by this client
            presence: { key: effectUserId } // Use userId for presence
          }
        })
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'safety_notifications', filter: `user_id=eq.${effectUserId}` },
          async (payload) => {
            console.log('[Chat.tsx RT] <<< SAFETY NOTIFICATION DB CHANGE RECEIVED >>>:', JSON.stringify(payload, null, 2));
            
            try {
              const notification = payload.new;
              
              // Verify this safety notification is for this room and user
              if (notification.room_id === roomId && notification.user_id === effectUserId) {
                console.log(`[Chat.tsx RT] Processing safety notification for message ID: ${notification.message_id}`);
                
                // Fetch the safety message using the API
                const response = await fetch(`/api/student/safety-message?messageId=${notification.message_id}&userId=${effectUserId}`, {
                  method: 'GET',
                  credentials: 'include',
                  cache: 'no-store'
                });
                
                if (!response.ok) {
                  console.error(`[Chat.tsx RT] Error fetching safety message from DB change: HTTP ${response.status}`);
                  return;
                }
                
                const safetyMessageData = await response.json();
                
                if (safetyMessageData.found && safetyMessageData.message) {
                  // Update UI with the safety message
                  setMessages((prevMessages) => {
                    // Remove any safety placeholders
                    const withoutPlaceholders = prevMessages.filter(msg => 
                      !msg.metadata?.isSafetyPlaceholder
                    );
                    
                    // Check if message already exists
                    const safetyMessageExists = withoutPlaceholders.some(msg => 
                      msg.message_id === safetyMessageData.message.message_id
                    );
                    
                    if (safetyMessageExists) {
                      console.log(`[Chat.tsx RT] Safety message ${safetyMessageData.message.message_id} already exists in state`);
                      return withoutPlaceholders;
                    }
                    
                    console.log(`[Chat.tsx RT] Adding safety message ${safetyMessageData.message.message_id} from DB notification`);
                    const newMessages = [...withoutPlaceholders, safetyMessageData.message];
                    
                    // Sort by timestamp
                    return newMessages.sort((a, b) => 
                      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                  });
                  
                  setTimeout(scrollToBottom, 100);
                  
                  // Update notification as delivered
                  try {
                    const { error: updateError } = await supabase
                      .from('safety_notifications')
                      .update({ is_delivered: true, delivered_at: new Date().toISOString() })
                      .eq('notification_id', notification.notification_id);
                    
                    if (updateError) {
                      console.error(`[Chat.tsx RT] Error updating notification status in DB:`, updateError);
                    } else {
                      console.log(`[Chat.tsx RT] Marked notification ${notification.notification_id} as delivered`);
                    }
                  } catch (updateError) {
                    console.error('[Chat.tsx RT] Exception updating notification delivery status:', updateError);
                  }
                }
              }
            } catch (err) {
              console.error('[Chat.tsx RT] Error processing safety notification from DB change:', err);
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Chat.tsx RT] Successfully SUBSCRIBED to safety_notifications table changes for user ${effectUserId}`);
            
            // Run a SQL query to verify the publication is set up correctly
            try {
              fetch('/api/health?check=realtime', {
                method: 'GET',
                credentials: 'include'
              })
              .then(response => response.json())
              .then(data => {
                console.log(`[Chat.tsx RT] Realtime health check response:`, data);
              })
              .catch(error => {
                console.error(`[Chat.tsx RT] Realtime health check error:`, error);
              });
            } catch (checkError) {
              console.error(`[Chat.tsx RT] Error running realtime health check:`, checkError);
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[Chat.tsx RT] Error subscribing to safety_notifications:`, err);
          } else {
            console.warn(`[Chat.tsx RT] Subscription status for safety_notifications: ${status}`);
          }
        });
      
      channels.push(notificationsChannel);
      
      // Safety alert channel - subscribes to direct safety broadcasts for this user
      // Add broadcast and presence config for more reliability
      const safetyChannel = supabase
        .channel(safetyChannelId, {
          config: {
            broadcast: { self: true },
            presence: { key: effectUserId }
          }
        })
        .on('broadcast', { event: 'safety-message' }, async (payload) => {
          console.log('[Chat.tsx RT] <<< SAFETY MESSAGE BROADCAST RECEIVED >>>:', payload);
          
          // Verify this safety message is for this room and user
          console.log(`[Chat.tsx RT] Verifying safety message payload:`, {
            payloadRoomId: payload.payload.room_id,
            roomId,
            payloadUserId: payload.payload.user_id,
            effectUserId,
            payloadChatbotId: payload.payload.chatbot_id,
            effectChatbotId,
            countryCode: payload.payload.country_code,
            effectiveCountryCode: payload.payload.effectiveCountryCode
          });
          
          if (payload.payload.room_id === roomId && 
              payload.payload.user_id === effectUserId &&
              (!effectChatbotId || payload.payload.chatbot_id === effectChatbotId)) {
            
            try {
              // Fetch the safety message using the API to bypass RLS issues
              console.log(`[Chat.tsx RT] Fetching safety message ID: ${payload.payload.message_id}`);
              const response = await fetch(`/api/student/safety-message?messageId=${payload.payload.message_id}&userId=${effectUserId}`, {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store' // Ensure we don't get cached responses
              });
              
              if (!response.ok) {
                console.error(`[Chat.tsx RT] Error fetching safety message: HTTP ${response.status}`);
                // If we can't get the specific message, try to refresh all messages
                console.log(`[Chat.tsx RT] Attempting to reload all messages to get safety message`);
                await fetchMessages();
                return;
              }
              
              const safetyMessageData = await response.json();
              const safetyMessage = safetyMessageData.message;
              
              // Directly update state instead of using handleRealtimeMessage to avoid duplication
              setMessages((prevMessages) => {
                // Step 1: Remove any safety placeholders
                const withoutPlaceholders = prevMessages.filter(msg => 
                  !msg.metadata?.isSafetyPlaceholder
                );
                
                // Step 2: Update user messages with pendingSafetyResponse=false
                const updatedMessages = withoutPlaceholders.map(msg => {
                  if (msg.role === 'user' && msg.metadata?.pendingSafetyResponse) {
                    return {
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        pendingSafetyResponse: false
                      }
                    };
                  }
                  return msg;
                });
                
                // Step 3: Check if safety message already exists (prevent duplication)
                const safetyMessageExists = updatedMessages.some(msg => 
                  msg.message_id === safetyMessage.message_id
                );
                
                // Step 4: Add the safety message only if it doesn't exist
                const newMessages = safetyMessageExists 
                  ? updatedMessages 
                  : [...updatedMessages, safetyMessage];
                
                // Step 5: Sort by timestamp
                return newMessages.sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              });
              
              // Scroll to bottom after updating
              setTimeout(scrollToBottom, 100);
            } catch (err) {
              console.error('[Chat.tsx RT] Error processing safety message:', err);
              // If there's an error, try to refresh all messages as a fallback
              try {
                console.log('[Chat.tsx RT] Attempting to refresh all messages after error');
                await fetchMessages();
              } catch (refreshError) {
                console.error('[Chat.tsx RT] Error refreshing messages:', refreshError);
              }
            }
          }
        })
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Chat.tsx RT] Successfully SUBSCRIBED to safety channel ${safetyChannelId}`);
            
            // Add explicit diagnostics for production environment
            const isProduction = process.env.NODE_ENV === 'production' || window.location.hostname === 'skolr.app';
            console.log(`[SAFETY DIAGNOSTICS] Environment check: NODE_ENV=${process.env.NODE_ENV}, hostname=${window.location.hostname}, isProduction=${isProduction}`);
            console.log(`[SAFETY DIAGNOSTICS] Channel subscription successful: ID=${safetyChannelId}, userId=${effectUserId}`);
            
            // Send a diagnostic message to the channel to test if it's working in production
            try {
              // Only in skolr.app or if debugging is enabled
              if (isProduction || window.location.search.includes('safety_debug=true')) {
                console.log(`[SAFETY DIAGNOSTICS] Sending diagnostic ping on channel ${safetyChannelId}`);
                safetyChannel.send({
                  type: 'broadcast',
                  event: 'diagnostic-ping',
                  payload: { 
                    timestamp: new Date().toISOString(),
                    channelId: safetyChannelId,
                    userId: effectUserId,
                    environment: isProduction ? 'production' : 'development',
                    url: window.location.href
                  }
                });
              }
            } catch (pingError) {
              console.warn(`[SAFETY DIAGNOSTICS] Error sending diagnostic ping: ${pingError}`);
            }
            
            // For testing: expose the channel globally so we can debug in the console
            if (typeof window !== 'undefined') {
              (window as any).safetyChannel = safetyChannel;
              console.log('[Chat.tsx RT] Safety channel exposed as window.safetyChannel for debugging');
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[Chat.tsx RT] Safety channel ERROR: ${safetyChannelId}`, err);
            // Log detailed error for production diagnosis
            console.error(`[SAFETY DIAGNOSTICS] Channel ERROR details: ${JSON.stringify({
              channelId: safetyChannelId,
              errorType: err?.name,
              errorMessage: err?.message,
              stack: err?.stack,
              url: window.location.href
            })}`);
            
            // Try to reconnect after a short delay
            setTimeout(() => {
              console.log('[Chat.tsx RT] Attempting to reconnect to safety channel after error');
              safetyChannel.subscribe();
            }, 2000);
          } else if (status === 'TIMED_OUT') {
            console.warn(`[Chat.tsx RT] Safety channel TIMED_OUT: ${safetyChannelId}`, err);
            // Log timeout details for production diagnosis
            console.warn(`[SAFETY DIAGNOSTICS] Channel TIMEOUT details: ${JSON.stringify({
              channelId: safetyChannelId,
              userId: effectUserId,
              url: window.location.href,
              timestamp: new Date().toISOString()
            })}`);
            
            // Try to reconnect after a short delay
            setTimeout(() => {
              console.log('[Chat.tsx RT] Attempting to reconnect to safety channel after timeout');
              safetyChannel.subscribe();
            }, 2000);
          } else if (status === 'CLOSED') {
            console.warn(`[Chat.tsx RT] Safety channel CLOSED: ${safetyChannelId}`);
            // Log closure details for production diagnosis
            console.warn(`[SAFETY DIAGNOSTICS] Channel CLOSED details: ${JSON.stringify({
              channelId: safetyChannelId,
              userId: effectUserId,
              url: window.location.href,
              timestamp: new Date().toISOString()
            })}`);
            
            // Try to reconnect after a short delay for CLOSED status too
            setTimeout(() => {
              console.log('[Chat.tsx RT] Attempting to reconnect to safety channel after close');
              safetyChannel.subscribe();
            }, 2000);
          }
        });
      
      channels.push(safetyChannel);
      
      // Check for any undelivered notifications on component mount
      const checkForUndeliveredNotifications = async () => {
        try {
          // Handle test rooms differently - they don't use real UUIDs for room IDs
          const isTestRoom = roomId.startsWith('teacher_test_room_for_');
          
          console.log(`[Chat.tsx RT] Checking for undelivered notifications... (${isTestRoom ? 'Test Room' : 'Regular Room'})`);
          
          // For test rooms, skip safety notification check
          if (isTestRoom) {
            // Skip database query for test rooms to avoid UUID format errors
            console.log('[Chat.tsx RT] Skipping undelivered notifications check for test room');
            return;
          }
          
          const { data, error } = await supabase
            .from('safety_notifications')
            .select('*')
            .eq('user_id', effectUserId)
            .eq('room_id', roomId)
            .eq('is_delivered', false)
            .order('created_at', { ascending: false });
            
          if (error) {
            console.error('[Chat.tsx RT] Error checking for undelivered notifications:', error);
            return;
          }
          
          if (data && data.length > 0) {
            console.log(`[Chat.tsx RT] Found ${data.length} undelivered safety notifications, fetching...`);
            
            // Process each undelivered notification
            for (const notification of data) {
              console.log(`[Chat.tsx RT] Processing undelivered notification: ${notification.notification_id} for message: ${notification.message_id}`);
              
              // Fetch the specific safety message
              try {
                const response = await fetch(`/api/student/safety-message?messageId=${notification.message_id}&userId=${effectUserId}`, {
                  method: 'GET',
                  credentials: 'include',
                  cache: 'no-store'
                });
                
                if (!response.ok) {
                  console.error(`[Chat.tsx RT] Error fetching safety message from notification: HTTP ${response.status}`);
                  continue;
                }
                
                const safetyMessageData = await response.json();
                
                if (safetyMessageData.found && safetyMessageData.message) {
                  console.log(`[Chat.tsx RT] Successfully fetched safety message ${safetyMessageData.message.message_id}`);
                  
                  // Update UI with the safety message
                  setMessages((prevMessages) => {
                    // Check if message already exists
                    const messageExists = prevMessages.some(msg => 
                      msg.message_id === safetyMessageData.message.message_id
                    );
                    
                    if (messageExists) {
                      console.log(`[Chat.tsx RT] Safety message ${safetyMessageData.message.message_id} already exists in chat`);
                      return prevMessages;
                    }
                    
                    // Remove any safety placeholders
                    const withoutPlaceholders = prevMessages.filter(msg => 
                      !msg.metadata?.isSafetyPlaceholder
                    );
                    
                    // Add the new safety message
                    const newMessages = [...withoutPlaceholders, safetyMessageData.message];
                    console.log(`[Chat.tsx RT] Adding safety message ${safetyMessageData.message.message_id} to chat`);
                    
                    // Sort by timestamp
                    return newMessages.sort((a, b) => 
                      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                  });
                  
                  // Scroll to show the message
                  setTimeout(scrollToBottom, 100);
                  
                  // Mark notification as delivered
                  try {
                    const { error: updateError } = await supabase
                      .from('safety_notifications')
                      .update({ is_delivered: true, delivered_at: new Date().toISOString() })
                      .eq('notification_id', notification.notification_id);
                    
                    if (updateError) {
                      console.error(`[Chat.tsx RT] Error updating notification status:`, updateError);
                    } else {
                      console.log(`[Chat.tsx RT] Marked notification ${notification.notification_id} as delivered`);
                    }
                  } catch (updateError) {
                    console.error('[Chat.tsx RT] Exception updating notification delivery status:', updateError);
                  }
                } else {
                  console.warn(`[Chat.tsx RT] No safety message found for notification ${notification.notification_id}`);
                }
              } catch (fetchError) {
                console.error('[Chat.tsx RT] Error fetching safety message from notification:', fetchError);
              }
            }
          } else {
            console.log('[Chat.tsx RT] No undelivered safety notifications found on initial check');
          }
        } catch (err) {
          console.error('[Chat.tsx RT] Error in checkForUndeliveredNotifications:', err);
        }
      };
      
      // Run the check for undelivered notifications
      checkForUndeliveredNotifications();
      
      // Set up a polling mechanism to continuously check for new safety notifications
      // This ensures real-time delivery even without realtime database subscriptions
      const safetyPollInterval = setInterval(async () => {
        try {
          if (!effectUserId || !roomId) return;
          
          // Handle test rooms differently - they don't use real UUIDs for room IDs
          const isTestRoom = roomId.startsWith('teacher_test_room_for_');
          
          console.log(`[Chat.tsx RT] Polling for new safety notifications... (${isTestRoom ? 'Test Room' : 'Regular Room'})`);
          
          // For test rooms, skip safety notification polling
          if (isTestRoom) {
            // Skip database query for test rooms to avoid UUID format errors
            return;
          }
          
          // Only perform the query for real rooms with valid UUIDs
          const { data, error } = await supabase
            .from('safety_notifications')
            .select('*')
            .eq('user_id', effectUserId)
            .eq('room_id', roomId)
            .eq('is_delivered', false)
            .order('created_at', { ascending: false });
            
          if (error) {
            console.error('[Chat.tsx RT] Error polling for safety notifications:', error);
            return;
          }
          
          if (data && data.length > 0) {
            console.log(`[Chat.tsx RT] Found ${data.length} new safety notifications during polling`);
            
            // Process each undelivered notification
            for (const notification of data) {
              // Fetch the specific safety message
              try {
                const response = await fetch(`/api/student/safety-message?messageId=${notification.message_id}&userId=${effectUserId}`, {
                  method: 'GET',
                  credentials: 'include',
                  cache: 'no-store'
                });
                
                if (!response.ok) {
                  console.error(`[Chat.tsx RT] Error fetching safety message from polling: HTTP ${response.status}`);
                  continue;
                }
                
                const safetyMessageData = await response.json();
                
                if (safetyMessageData.found && safetyMessageData.message) {
                  // Update UI with the safety message
                  setMessages((prevMessages) => {
                    // Check if message already exists
                    const messageExists = prevMessages.some(msg => 
                      msg.message_id === safetyMessageData.message.message_id
                    );
                    
                    if (messageExists) {
                      console.log(`[Chat.tsx RT] Safety message ${safetyMessageData.message.message_id} already in state during polling`);
                      return prevMessages;
                    }
                    
                    // Remove any safety placeholders
                    const withoutPlaceholders = prevMessages.filter(msg => 
                      !msg.metadata?.isSafetyPlaceholder
                    );
                    
                    console.log(`[Chat.tsx RT] Adding safety message ${safetyMessageData.message.message_id} from polling`);
                    // Add the new safety message
                    const newMessages = [...withoutPlaceholders, safetyMessageData.message];
                    
                    // Sort by timestamp
                    return newMessages.sort((a, b) => 
                      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                  });
                  
                  // Scroll to show the message
                  setTimeout(scrollToBottom, 100);
                  
                  // Mark notification as delivered
                  try {
                    const { error: updateError } = await supabase
                      .from('safety_notifications')
                      .update({ is_delivered: true, delivered_at: new Date().toISOString() })
                      .eq('notification_id', notification.notification_id);
                    
                    if (!updateError) {
                      console.log(`[Chat.tsx RT] Marked notification ${notification.notification_id} as delivered from polling`);
                    }
                  } catch (updateError) {
                    console.error('[Chat.tsx RT] Exception updating notification status from polling:', updateError);
                  }
                }
              } catch (fetchError) {
                console.error('[Chat.tsx RT] Error fetching safety message during polling:', fetchError);
              }
            }
          }
        } catch (pollError) {
          console.error('[Chat.tsx RT] Error in safety notification polling:', pollError);
        }
      }, 2500); // Poll every 2.5 seconds for near real-time experience
      
      // Add a new cleanup function that clears the polling interval
      return () => {
        // Clean up all channels
        for (const channel of channels) {
          try {
            console.log(`[Chat.tsx RT] CLEANUP for channel: ${channel.topic}`);
            supabase.removeChannel(channel);
          } catch (error) {
            console.warn(`[Chat.tsx RT] Error removing channel ${channel?.topic || 'unknown'}:`, error);
          }
        }
        
        // Clear the polling interval when component unmounts
        clearInterval(safetyPollInterval);
        console.log('[Chat.tsx RT] Cleared safety notification polling interval');
      };

      // Regular message subscriptions remain disabled to fix duplication
      console.log('[Chat.tsx RT] Regular message subscriptions remain disabled to fix duplication');

      return () => {
        // Clean up all channels
        for (const channel of channels) {
          try {
            console.log(`[Chat.tsx RT] CLEANUP for channel: ${channel.topic}`);
            supabase.removeChannel(channel);
          } catch (error) {
            console.warn(`[Chat.tsx RT] Error removing channel ${channel?.topic || 'unknown'}:`, error);
          }
        }
      };
    } catch (subscriptionError) {
      console.warn('[Chat.tsx RT] Error setting up subscriptions:', subscriptionError);
      return () => {}; // Return empty cleanup function
    }

    /*
    const channelIdentifier = `chat-room-${roomId}-user-${effectUserId}-bot-${effectChatbotId}`;
    console.log(`[Chat.tsx RT] Subscribing to: ${channelIdentifier}`);
    
    // Array to track all channels we create so we can clean them up properly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channels: any[] = [];
    
    try {
      // Main channel for database changes
      const mainChannel = supabase
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
            console.warn(`[Chat.tsx RT] Subscription status: ${status} for channel ${channelIdentifier}`, err);
            // Don't treat as an error since it might be a normal part of unmounting
          }
        });
      
      channels.push(mainChannel);
      */
      
      /*
      // Safety alert channel - subscribes to direct safety broadcasts for this user
      const safetyChannelId = `safety-alert-${effectUserId}`;
      console.log(`[Chat.tsx RT] Subscribing to safety channel: ${safetyChannelId}`);
      
      const safetyChannel = supabase
        .channel(safetyChannelId)
        .on('broadcast', { event: 'safety-message' }, async (payload) => {
          console.log('[Chat.tsx RT] <<< SAFETY MESSAGE BROADCAST RECEIVED >>>:', payload);
          
          // Verify this safety message is for this room and user
          console.log(`[Chat.tsx RT] Verifying safety message payload:`, {
            payloadRoomId: payload.payload.room_id,
            roomId,
            payloadUserId: payload.payload.user_id,
            effectUserId,
            payloadChatbotId: payload.payload.chatbot_id,
            effectChatbotId,
            countryCode: payload.payload.country_code,
            effectiveCountryCode: payload.payload.effectiveCountryCode
          });
          
          if (payload.payload.room_id === roomId && 
              payload.payload.user_id === effectUserId &&
              (!effectChatbotId || payload.payload.chatbot_id === effectChatbotId)) {
            
            try {
              // Fetch the safety message using the admin API to bypass RLS issues
              console.log(`[Chat.tsx RT] Fetching safety message ID: ${payload.payload.message_id}`);
              const response = await fetch(`/api/student/safety-message?messageId=${payload.payload.message_id}&userId=${effectUserId}`, {
                method: 'GET',
                credentials: 'include'
              });
              
              if (!response.ok) {
                console.error(`[Chat.tsx RT] Error fetching safety message: HTTP ${response.status}`);
                return;
              }
              
              const safetyMessageData = await response.json();
              const safetyMessage = safetyMessageData.message;
              
              // Log what we're adding
              console.log(`[Chat.tsx RT] Successfully fetched safety message:`, {
                messageId: safetyMessage.message_id,
                countryCode: safetyMessage.metadata?.countryCode,
                effectiveCountryCode: safetyMessage.metadata?.effectiveCountryCode,
                displayCountryCode: safetyMessage.metadata?.displayCountryCode,
                helplines: safetyMessage.metadata?.helplines
              });
              
              // Directly update state instead of using handleRealtimeMessage to avoid duplication
              setMessages((prevMessages) => {
                // Step 1: Remove any safety placeholders
                const withoutPlaceholders = prevMessages.filter(msg => 
                  !msg.metadata?.isSafetyPlaceholder
                );
                
                // Step 2: Update user messages with pendingSafetyResponse=false
                const updatedMessages = withoutPlaceholders.map(msg => {
                  if (msg.role === 'user' && msg.metadata?.pendingSafetyResponse) {
                    return {
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        pendingSafetyResponse: false
                      }
                    };
                  }
                  return msg;
                });
                
                // Step 3: Check if safety message already exists (prevent duplication)
                const safetyMessageExists = updatedMessages.some(msg => 
                  msg.message_id === safetyMessage.message_id
                );
                
                // Step 4: Add the safety message only if it doesn't exist
                const newMessages = safetyMessageExists 
                  ? updatedMessages 
                  : [...updatedMessages, safetyMessage];
                
                // Step 5: Sort by timestamp
                return newMessages.sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              });
              
              // Scroll to bottom after updating
              setTimeout(scrollToBottom, 100);
            } catch (err) {
              console.error('[Chat.tsx RT] Error processing safety message:', err);
              // If there's an error, try to refresh all messages as a fallback
              try {
                console.log('[Chat.tsx RT] Attempting to refresh all messages after error');
                await fetchMessages();
              } catch (refreshError) {
                console.error('[Chat.tsx RT] Error refreshing messages:', refreshError);
              }
            }
          }
        })
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Chat.tsx RT] Successfully SUBSCRIBED to safety channel ${safetyChannelId}`);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`[Chat.tsx RT] Safety channel subscription status: ${status}`, err);
            // Don't treat as an error since it might be a normal part of unmounting
          }
        });
      
      channels.push(safetyChannel);
    } catch (subscriptionError) {
      console.warn('[Chat.tsx RT] Error setting up subscriptions:', subscriptionError);
    }
      
    return () => {
      // Clean up all channels
      for (const channel of channels) {
        try {
          console.log(`[Chat.tsx RT] CLEANUP for channel: ${channel.topic}`);
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn(`[Chat.tsx RT] Error removing channel ${channel?.topic || 'unknown'}:`, error);
          // Continue cleanup despite errors
        }
      }
    };
    */
  }, [roomId, chatbot?.chatbot_id, userId, supabase, handleRealtimeMessage, handleRealtimeUpdate]);


  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !userId || !chatbot?.chatbot_id || !roomId) return;
    setIsLoading(true); setError(null);

    // Check for potential safety trigger keywords before sending
    const potentialSafetyTrigger = initialSafetyCheck(content.trim());
    
    // --- OPTIMISTIC UPDATE WITH TRACKING FLAG ---
    const tempOptimisticLocalId = `local-user-${Date.now()}`;
    const optimisticUserMessage: ChatMessage = {
      message_id: tempOptimisticLocalId,
      room_id: roomId, user_id: userId, role: 'user', content: content.trim(),
      created_at: new Date().toISOString(),
      metadata: { 
        chatbotId: chatbot.chatbot_id, 
        isOptimistic: true,
        optimisticContent: content.trim(), // Track the content for deduplication
        potentialSafetyTrigger: potentialSafetyTrigger // Flag for potential safety concerns
      }
    };
    setMessages(prev => [...prev, optimisticUserMessage].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    setTimeout(scrollToBottom, 50);
    // --- END OPTIMISTIC UPDATE ---

    try {
        // Check if using direct access via URL
        const uidFromUrl = searchParams?.get('uid');
        let url = uidFromUrl && uidFromUrl === userId
          ? `/api/chat/direct-access?roomId=${roomId}&userId=${userId}`
          : `/api/chat/${roomId}`;
          
        // Add instanceId to URL parameter if available (for GET requests)
        if (instanceId) {
          url += `${url.includes('?') ? '&' : '?'}instanceId=${instanceId}`;
          console.log(`[Chat.tsx] Added instanceId parameter to URL: ${instanceId}`);
        } else {
          console.log(`[Chat.tsx] No instanceId available for URL parameters`);
        }

        console.log(`[Chat.tsx] Sending message to: ${url}`);
        
        // Critical check to ensure we have an instance ID for students
        // Log explicit warning if it's missing and should be present
        if (!instanceId && window.location.pathname.startsWith('/chat/')) {
          console.warn(`[Chat.tsx] WARNING: No instanceId when sending message. This may cause shared chat issues!`);
        }
        
        // Add direct access headers if using URL parameters
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        // Add direct access headers if using URL parameters
        if (uidFromUrl && uidFromUrl === userId) {
          console.log(`[Chat.tsx] Adding direct access headers with user ID: ${userId}`);
          headers['x-direct-access-user-id'] = userId;
        }
        
        // Create a reader to process the streamed response
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            content: content.trim(), 
            chatbot_id: chatbot.chatbot_id, 
            model: chatbot.model,
            instance_id: instanceId
          }),
          credentials: 'include'
        });

        if (!response.ok) {
            // Try to extract error details from response
            try {
              const errorText = await response.text();
              console.error(`[Chat.tsx] API error response (${response.status}):`, errorText);
              
              let errorMessage = `API error: ${response.status}`;
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorData.message || errorMessage;
                
                // Special handling for safety interventions
                if (errorData.type === "safety_intervention_triggered") {
                  console.log("[Chat.tsx] Safety intervention detected from server response");
                  
                  // Mark the message as sent but pending safety response
                  setMessages(prev => {
                    const updated = [...prev];
                    const index = updated.findIndex(m => m.message_id === tempOptimisticLocalId);
                    if (index !== -1) {
                      updated[index] = {
                        ...updated[index],
                        metadata: {
                          ...updated[index].metadata,
                          isOptimistic: false,
                          pendingSafetyResponse: true
                        }
                      };
                    }
                    return updated;
                  });
                  
                  // Show a thinking indicator for safety response
                  setMessages(prev => {
                    // Create a placeholder for the safety response
                    const safetyPlaceholder: ChatMessage = {
                      message_id: `safety-placeholder-${Date.now()}`,
                      room_id: roomId,
                      user_id: userId,
                      role: 'system',
                      content: 'Processing safety check...',
                      created_at: new Date().toISOString(),
                      metadata: {
                        isSafetyPlaceholder: true,
                        isSystemSafetyResponse: true, // Important flag for display
                        chatbotId: chatbot.chatbot_id
                      }
                    };
                    return [...prev, safetyPlaceholder];
                  });
                  
                  setIsLoading(false);
                  
                  // Enhanced approach - fetch safety messages with multiple retries
                  console.log('[SAFETY DIAGNOSTICS] Safety intervention triggered - starting enhanced retry process');
                  
                  // Multiple fetch attempts with increasing delays
                  const fetchWithRetries = async (retryCount = 0, maxRetries = 10) => { // Increase max retries
                    try {
                      const delay = 1000 + (retryCount * 500); // Faster polling: 1s, 1.5s, 2s, etc.
                      console.log(`[SAFETY DIAGNOSTICS] Attempt #${retryCount + 1}/${maxRetries + 1} - fetching with delay=${delay}ms`);
                      
                      setTimeout(async () => {
                        try {
                          // Try direct safety message API first for maximum reliability
                          console.log(`[SAFETY DIAGNOSTICS] Attempt #${retryCount + 1} - using direct safety message API`);
                          const safetyResponse = await fetch(`/api/student/safety-message?userId=${userId}&roomId=${roomId}`, {
                            method: 'GET',
                            credentials: 'include',
                            cache: 'no-store'
                          });
                          
                          if (safetyResponse.ok) {
                            const safetyData = await safetyResponse.json();
                            console.log(`[SAFETY DIAGNOSTICS] API response:`, {
                              found: safetyData.found,
                              messageId: safetyData.message?.message_id || 'none',
                              contentLength: safetyData.message?.content?.length || 0
                            });
                            
                            if (safetyData.found && safetyData.message) {
                              console.log(`[SAFETY DIAGNOSTICS] Success! Found safety message id: ${safetyData.message.message_id}`);
                              
                              // Add the safety message to state if it doesn't exist
                              setMessages(prevMessages => {
                                // Remove any placeholders first
                                const withoutPlaceholders = prevMessages.filter(msg => 
                                  !msg.metadata?.isSafetyPlaceholder
                                );
                                
                                // Skip if message already exists
                                const alreadyExists = withoutPlaceholders.some(msg => 
                                  msg.message_id === safetyData.message.message_id
                                );
                                
                                if (alreadyExists) {
                                  console.log(`[SAFETY DIAGNOSTICS] Message ${safetyData.message.message_id} already in state`);
                                  return withoutPlaceholders;
                                }
                                
                                // Add the safety message
                                const newMessages = [...withoutPlaceholders, safetyData.message];
                                return newMessages.sort((a, b) => 
                                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                                );
                              });
                              
                              // Scroll to show the new message
                              setTimeout(scrollToBottom, 100);
                              return; // Exit the retry process
                            }
                          }
                          
                          // If direct API failed or found no message, try regular fetch
                          console.log(`[SAFETY DIAGNOSTICS] Direct API ${safetyResponse.ok ? 'returned no message' : 'failed'} - trying regular fetch`);
                          await fetchMessages();
                          
                          // Check if we found any safety messages after the regular fetch
                          const safetyMessagesAfterFetch = messages.filter(msg => 
                            msg.role === 'system' && msg.metadata?.isSystemSafetyResponse === true
                          );
                          
                          if (safetyMessagesAfterFetch.length > 0) {
                            console.log(`[SAFETY DIAGNOSTICS] Found ${safetyMessagesAfterFetch.length} safety messages after regular fetch`);
                            
                            // Remove placeholder regardless of outcome
                            setMessages(prevMessages => {
                              return prevMessages.filter(msg => !msg.metadata?.isSafetyPlaceholder);
                            });
                            
                            return; // Exit the retry process
                          }
                          
                          // If we still don't have a safety message, retry if we haven't hit max retries
                          if (retryCount < maxRetries) {
                            console.log(`[SAFETY DIAGNOSTICS] No safety message found yet, retrying (${retryCount + 1}/${maxRetries})`);
                            fetchWithRetries(retryCount + 1, maxRetries);
                          } else {
                            console.log(`[SAFETY DIAGNOSTICS] Max retries (${maxRetries}) reached, giving up`);
                            
                            // Remove placeholder on max retries
                            setMessages(prevMessages => {
                              return prevMessages.filter(msg => !msg.metadata?.isSafetyPlaceholder);
                            });
                          }
                        } catch (error) {
                          console.error(`[SAFETY DIAGNOSTICS] Error in retry attempt #${retryCount + 1}:`, error);
                          
                          // Retry on error if we haven't hit max retries
                          if (retryCount < maxRetries) {
                            console.log(`[SAFETY DIAGNOSTICS] Retrying after error (${retryCount + 1}/${maxRetries})`);
                            fetchWithRetries(retryCount + 1, maxRetries);
                          } else {
                            console.log(`[SAFETY DIAGNOSTICS] Max retries reached after error, giving up`);
                            
                            // Remove placeholder on max retries
                            setMessages(prevMessages => {
                              return prevMessages.filter(msg => !msg.metadata?.isSafetyPlaceholder);
                            });
                          }
                        }
                      }, delay);
                    } catch (outerError) {
                      console.error('[SAFETY DIAGNOSTICS] Outer error in fetchWithRetries:', outerError);
                      
                      // Remove placeholder on error
                      setMessages(prevMessages => {
                        return prevMessages.filter(msg => !msg.metadata?.isSafetyPlaceholder);
                      });
                    }
                  };
                  
                  // Start the retry process
                  fetchWithRetries();
                  
                  setTimeout(scrollToBottom, 50);
                  return; // Exit early without error
                }
              } catch (parseError) {
                console.warn('[Chat.tsx] Error parsing error response:', parseError);
              }
              
              throw new Error(errorMessage);
            } catch (readError) {
              throw new Error(`API error: ${response.status} - Could not read error details`);
            }
        }

        // Create a temporary placeholder for the assistant's response
        const tempAssistantId = `local-assistant-${Date.now()}`;
        const placeholderMessage: ChatMessage = {
          message_id: tempAssistantId,
          room_id: roomId,
          user_id: userId,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
          metadata: {
            chatbotId: chatbot.chatbot_id,
            isStreaming: true
          }
        };
        
        // Add placeholder message to show the assistant's response is coming
        setMessages(prev => [...prev, placeholderMessage]);
        setTimeout(scrollToBottom, 50);
        
        // Start processing the stream
        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let assistantResponse = '';
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              // Process the chunk
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
              
              for (const line of lines) {
                try {
                  const dataContent = line.substring(5).trim();
                  if (dataContent === '[DONE]') continue;
                  
                  const parsed = JSON.parse(dataContent);
                  const piece = parsed.content;
                  
                  if (typeof piece === 'string') {
                    assistantResponse += piece;
                    
                    // Update the placeholder message with the current content
                    setMessages(prev => {
                      const updated = [...prev];
                      const index = updated.findIndex(m => m.message_id === tempAssistantId);
                      if (index !== -1) {
                        updated[index] = {
                          ...updated[index],
                          content: assistantResponse
                        };
                      }
                      return updated;
                    });
                    setTimeout(scrollToBottom, 10);
                  }
                } catch (e) {
                  console.warn('[Chat.tsx] Stream parse error:', e);
                }
              }
            }
          } catch (streamError) {
            console.error('[Chat.tsx] Stream processing error:', streamError);
            // Remove the placeholder if we had an error with the stream
            setMessages(prev => prev.filter(m => m.message_id !== tempAssistantId));
          } finally {
            // Remove the placeholder flag, but keep the message
            setMessages(prev => {
              const updated = [...prev];
              const index = updated.findIndex(m => m.message_id === tempAssistantId);
              if (index !== -1) {
                updated[index] = {
                  ...updated[index],
                  metadata: { ...updated[index].metadata, isStreaming: false }
                };
              }
              return updated;
            });
          }
        }
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
  
  // Function to handle clearing the chat
  const handleClearChat = () => {
    // If there are no messages, don't do anything
    if (messages.length === 0) return;
    
    // Ask for confirmation before clearing
    if (window.confirm('Are you sure you want to clear all messages? This will only clear your local view of the conversation.')) {
      // Keep only welcome message if present
      const welcomeMessage = messages.find(msg => msg.metadata?.isWelcomeMessage);
      
      if (welcomeMessage) {
        // If there's a welcome message, keep only that
        setMessages([welcomeMessage]);
      } else {
        // Otherwise clear all messages
        setMessages([]);
      }
      
      console.log('[Chat.tsx] Chat cleared by user');
    }
  };
  
  return (
    <ChatContainer>
      {/* Add the clear chat button */}
      {messages.length > 0 && (
        <ClearChatButton 
          onClick={handleClearChat} 
          title="Clear chat"
          aria-label="Clear chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </ClearChatButton>
      )}
      
      {fetchError && ( <ErrorContainer variant="error"> {`Error loading: ${fetchError}`} <Button onClick={() => fetchMessages()} size="small">Retry</Button> </ErrorContainer> )}
      <MessagesList>
        {isFetchingMessages && messages.length === 0 ? ( 
          <LoadingIndicator><LoadingSpinner /> Loading...</LoadingIndicator> 
        ) : !isFetchingMessages && messages.length === 0 && !fetchError ? (
          <EmptyState>
            <h3>Start with {chatbot.name}</h3>
            <p>History will appear here.</p>
            {chatbot.bot_type === 'assessment' && <p>Click the Submit Assessment button when you&apos;re ready to be assessed.</p>}
          </EmptyState>
        ) : (
          messages
            .filter(message => {
              // Show all user and assistant messages
              if (message.role === 'user' || message.role === 'assistant') {
                return true;
              }
              
              // For system messages, only show safety responses and placeholders
              if (message.role === 'system') {
                return message.metadata?.isSystemSafetyResponse === true || 
                       message.metadata?.isSafetyPlaceholder === true;
              }
              
              return false;
            })
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