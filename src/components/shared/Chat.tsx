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

// TEMPORARILY BYPASSED: Basic front-end safety check
// This function is temporarily disabled to restore core chat functionality
const initialSafetyCheck = (message: string): boolean => {
  // All safety checks disabled
  console.log(`[Chat Safety] Safety checks temporarily bypassed`);
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
  height: 100%;
  max-height: calc(100vh - 200px); // Ensure there's a max height
  position: relative; // Added for absolute positioning of children
  will-change: transform; // Performance optimization for scrolling
  -webkit-overflow-scrolling: touch; // Better scrolling on iOS
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
  const messagesListRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Check for direct auth via URL
  // Initialize search params only once using a lazy initializer function to avoid re-renders
  const [searchParams] = useState<URLSearchParams | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return null;
  });

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
    
    // Get user ID if we're in a browser environment
    if (typeof window !== 'undefined') {
      getUserId();
    }
  }, [supabase, searchParams]);

  const scrollToBottom = useCallback(() => {
    try {
      // Just use the most reliable method to reduce complexity
      if (messagesListRef.current) {
        messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
      } else if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
    } catch (scrollError) {
      console.error('[Chat.tsx] Error in scrollToBottom:', scrollError);
    }
  }, []);

  // TEMPORARILY BYPASSED: Helper function to fetch safety messages
  const fetchSafetyMessages = useCallback(async () => {
    // Function disabled to restore core chat functionality
    console.log('[Chat.tsx] Safety message fetching temporarily disabled');
    return;
  }, []);
  
  // Add ref to track last fetch time to avoid excessive API calls
  const lastFetchTimeRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  
  // Fetch messages with support for direct URL access and homepage fallback
  const fetchMessages = useCallback(async () => {
    // Skip if we're already fetching or if required props are missing
    if (!chatbot?.chatbot_id || !userId || !roomId || isFetchingRef.current) {
      setIsFetchingMessages(false); 
      return;
    }
    
    // Debounce API calls - don't fetch if we've fetched within last 2 seconds
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000) {
      console.log('[Chat] Skipping fetch, too soon since last fetch');
      return;
    }
    
    // Update tracking variables
    lastFetchTimeRef.current = now;
    isFetchingRef.current = true;
    setIsFetchingMessages(true); 
    setFetchError(null);
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
          
          // Safety message fetching temporarily disabled to avoid excessive API calls
          // await fetchSafetyMessages();
          
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
      
      // Safety message fetching temporarily disabled to avoid excessive API calls
      // await fetchSafetyMessages();
      
    } catch (err) {
      console.error('[Chat.tsx] Error fetching messages:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsFetchingMessages(false);
      isFetchingRef.current = false;
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
      
      // Single scroll attempt after the welcome message is displayed
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
  
  // Add a scroll handler that doesn't trigger re-renders or API calls
  useEffect(() => {
    // Only run this when messages array changes and has content
    if (messages.length === 0) return;
    
    // Use a ref to track if we've scrolled for this set of messages
    const messageIds = messages.map(m => m.message_id).join(',');
    const scrollTimeoutId = setTimeout(() => {
      scrollToBottom();
    }, 50);
    
    return () => clearTimeout(scrollTimeoutId);
  }, [messages.length, scrollToBottom]); // Only depend on message count, not the entire messages array

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

  // --- REALTIME LISTENER - TEMPORARILY BYPASSED ---
  useEffect(() => {
    const effectChatbotId = chatbot?.chatbot_id; // Use optional chaining for safety
    const effectUserId = userId;

    if (!roomId || !effectChatbotId || !effectUserId || !supabase) {
        console.log('[Chat.tsx RT] Aborting subscription - missing params.', 
            { roomId, effectChatbotId, effectUserId });
        return;
    }

    console.log(`[Chat.tsx RT] SAFETY NOTIFICATIONS TEMPORARILY DISABLED - Basic chat functionality only`);
    
    // Return empty cleanup function
    return () => {
      console.log('[Chat.tsx RT] No active safety channels or polling to clean up (disabled)');
    };
  }, [roomId, chatbot?.chatbot_id, userId, supabase]);

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
            // Try to extract error details from response with enhanced error handling and diagnostics
            try {
              const errorText = await response.text();
              console.error(`[Chat.tsx] API error response (${response.status}):`, errorText);
              
              // Log additional diagnostic information for server errors
              console.error(`[Chat.tsx] Detailed error diagnostics:`, {
                status: response.status,
                statusText: response.statusText,
                url: url,
                responseHeaders: Object.fromEntries([...response.headers.entries()]),
                responseSize: errorText?.length || 0,
                requestPayload: {
                  content: content.trim().length > 100 ? `${content.trim().substring(0, 100)}...` : content.trim(),
                  contentLength: content.trim().length,
                  chatbotId: chatbot?.chatbot_id,
                  modelUsed: chatbot?.model,
                  instanceId: instanceId
                }
              });
              
              let errorMessage = `API error: ${response.status}`;
              
              // For 500 errors, provide a more user-friendly message
              if (response.status === 500) {
                errorMessage = `Server error (500). There might be an issue with the AI service. Please try again in a few moments.`;
              }
              
              // Try to parse the error response as JSON for more details
              try {
                const errorData = JSON.parse(errorText);
                // If we have a specific error message from the server, use it
                if (errorData.error || errorData.message) {
                  errorMessage = errorData.error || errorData.message || errorMessage;
                  console.error(`[Chat.tsx] Parsed error details:`, errorData);
                }
                
                // TEMPORARILY BYPASSED: Safety intervention special handling
                if (errorData.type === "safety_intervention_triggered") {
                  console.log("[Chat.tsx] Safety intervention detected but BYPASSED - proceeding with normal operation");
                  // Simply continue to normal message handling
                  // No safety placeholders or retries
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
          
          let streamError: Error | null = null;
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
          } catch (error) {
            streamError = error as Error;
            console.error('[Chat.tsx] Stream processing error:', streamError);
            
            // Log enhanced diagnostics for stream processing errors
            console.error('[Chat.tsx] Stream processing diagnostic details:', {
              error: streamError?.toString(),
              responseUrl: url,
              responseStatus: response.status,
              chatbotId: chatbot.chatbot_id,
              model: chatbot.model,
              partialResponse: assistantResponse.length > 0 ? 
                `${assistantResponse.substring(0, 100)}${assistantResponse.length > 100 ? '...' : ''}` : 'NO_CONTENT',
              responsePartialLength: assistantResponse.length,
              timestamp: new Date().toISOString()
            });
            
            // If we got some partial content, keep it with an error indicator
            if (assistantResponse.length > 0) {
              setMessages(prev => {
                const updated = [...prev];
                const index = updated.findIndex(m => m.message_id === tempAssistantId);
                if (index !== -1) {
                  updated[index] = {
                    ...updated[index],
                    content: assistantResponse + "\n\n[Message interrupted due to connection error]",
                    metadata: { 
                      ...updated[index].metadata, 
                      isStreaming: false,
                      streamInterrupted: true,
                      errorDetails: streamError?.toString() || 'Unknown stream error'
                    }
                  };
                }
                return updated;
              });
            } else {
              // Remove the placeholder completely if we didn't get any content
              setMessages(prev => prev.filter(m => m.message_id !== tempAssistantId));
              
              // Set a user-friendly error message
              setError("Connection interrupted. Please try sending your message again.");
            }
          } finally {
            // If we get here without errors and with content, remove the streaming flag
            if (!streamError && assistantResponse.length > 0) {
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
        }
    } catch (err) {
        console.error('[Chat.tsx] Chat send/receive error:', err);
        
        // Enhanced error logging with more context
        console.error('[Chat.tsx] Detailed error diagnostics:', {
          errorType: err?.constructor?.name || typeof err,
          errorMessage: err instanceof Error ? err.message : String(err),
          errorStack: err instanceof Error ? err.stack : 'No stack trace available',
          chatInfo: {
            chatbotId: chatbot?.chatbot_id,
            model: chatbot?.model,
            roomId: roomId,
            instanceId: instanceId,
            messageContentLength: content?.trim()?.length || 0
          },
          timestamp: new Date().toISOString()
        });
        
        // Create a more user-friendly error message based on the error type
        let errorMsg = '';
        
        // Improved error handling - show specific errors for different issues
        if (err instanceof Error) {
          // Show the error message from the server directly
          errorMsg = err.message || 'An error occurred. Please try again.';
          
          // Log the original error for debugging
          console.error('[Chat.tsx] Original error message:', err.message);
        } else {
          // Fallback for non-Error objects
          errorMsg = 'Failed to send message. Please try again.';
        }
        
        // Update the UI to show the error
        setError(errorMsg);
        
        // Mark the optimistic message as failed with a specific error
        setMessages(prev => prev.map(m => 
            m.message_id === tempOptimisticLocalId ? 
            {
              ...m, 
              metadata: {
                ...m.metadata, 
                error: errorMsg, 
                isOptimistic: false,
                errorDetails: err instanceof Error ? err.message : String(err),
                errorTime: new Date().toISOString()
              }
            } : m 
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
      <MessagesList ref={messagesListRef}>
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