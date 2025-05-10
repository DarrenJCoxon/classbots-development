// src/app/teacher-dashboard/chatbots/[chatbotId]/test-chat/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Container, Alert, Button as StyledButton } from '@/styles/StyledComponents'; // Renamed Button to avoid conflict
import Chat from '@/components/shared/Chat';
import type { Chatbot } from '@/types/database.types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.lg} 0;
  min-height: calc(100vh - 120px); // Adjust based on your header/footer height
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChatbotInfo = styled.div`
  h1 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    font-size: 1.75rem;
  }
  p {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.9rem;
    margin: 0;
  }
`;

const BackButton = styled(StyledButton)`
  // specific styles if needed
`;


export default function TestChatPage() {
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const chatbotId = params?.chatbotId as string;

  // Define a consistent "dummy" room ID for teacher test chats for this chatbot
  // This allows message history to be segmented per chatbot test.
  const testRoomId = `teacher_test_room_for_${chatbotId}`;

  const fetchChatbotData = useCallback(async () => {
    if (!chatbotId) {
      setError("Chatbot ID is missing.");
      setLoading(false);
      return;
    }
    console.log(`[TestChatPage] Fetching chatbot data for ID: ${chatbotId}`);
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated. Please log in.');
      }

      // Fetch the specific chatbot details, ensuring the teacher owns it
      const { data: chatbotData, error: chatbotError } = await supabase
        .from('chatbots')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .eq('teacher_id', user.id) // Important: Ensure teacher owns this chatbot
        .single();

      if (chatbotError) {
        console.error('[TestChatPage] Error fetching chatbot:', chatbotError);
        throw new Error(chatbotError.message || 'Failed to fetch chatbot details.');
      }
      if (!chatbotData) {
        throw new Error('Chatbot not found or you do not have permission to access it.');
      }
      console.log('[TestChatPage] Chatbot data fetched:', chatbotData);
      setChatbot(chatbotData);
    } catch (err) {
      console.error('[TestChatPage] CATCH Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chatbot for testing.');
    } finally {
      setLoading(false);
    }
  }, [chatbotId, supabase]);

  useEffect(() => {
    fetchChatbotData();
  }, [fetchChatbotData]);

  const handleBack = () => {
    router.push('/teacher-dashboard/chatbots'); // Go back to the chatbots list
  };

  if (loading) {
    return (
      <PageWrapper>
        <Container style={{ textAlign: 'center', paddingTop: '50px' }}>
          <LoadingSpinner size="large" />
          <p style={{ marginTop: '16px' }}>Loading chatbot for testing...</p>
        </Container>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <Container>
          <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>
          <BackButton variant="outline" onClick={handleBack}>
            ← Back to Chatbots List
          </BackButton>
        </Container>
      </PageWrapper>
    );
  }

  if (!chatbot) {
    // This case should ideally be caught by the error state if fetch fails
    return (
      <PageWrapper>
        <Container>
          <Alert variant="info">Chatbot not available for testing.</Alert>
           <BackButton variant="outline" onClick={handleBack}>
            ← Back to Chatbots List
          </BackButton>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Container style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header>
          <ChatbotInfo>
            <h1>Test: {chatbot.name}</h1>
            <p>You are interacting with your chatbot for testing purposes.</p>
          </ChatbotInfo>
          <BackButton variant="outline" onClick={handleBack}>
            ← Back to Chatbots List
          </BackButton>
        </Header>
        
        {/* 
          The Chat component needs a roomId. We'll use our dummy testRoomId.
          The Chat component also expects a full Chatbot object.
        */}
        <Chat 
          roomId={testRoomId} 
          chatbot={chatbot} 
        />
      </Container>
    </PageWrapper>
  );
}