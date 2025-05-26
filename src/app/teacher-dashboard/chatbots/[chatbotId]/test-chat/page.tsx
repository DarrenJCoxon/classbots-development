// src/app/teacher-dashboard/chatbots/[chatbotId]/test-chat/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
import { Alert } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import Chat from '@/components/shared/Chat';
import type { Chatbot } from '@/types/database.types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ReadingDocumentViewer from '@/components/shared/ReadingDocumentViewer';

const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.lg} 0;
  min-height: calc(100vh - 120px); // Adjust based on your header/footer height
  display: flex;
  flex-direction: column;
`;

// Custom container with reduced padding for reading room
const Container = styled.div<{ $isReadingRoom?: boolean }>`
  width: 100%;
  max-width: ${({ $isReadingRoom }) => $isReadingRoom ? '100%' : '1200px'};
  margin: 0 auto;
  padding: 0 ${({ $isReadingRoom }) => $isReadingRoom ? '4px' : '24px'};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0 ${({ theme }) => theme.spacing.sm};
  }
`;

const Header = styled.div<{ $isReadingRoom?: boolean }>`
  margin-bottom: ${({ theme, $isReadingRoom }) => $isReadingRoom ? theme.spacing.sm : theme.spacing.lg};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: stretch;
    gap: ${({ theme }) => theme.spacing.sm};
    
    button {
      width: 100%;
      justify-content: center;
    }
  }
`;

const ChatbotInfo = styled.div`
  h1 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    font-size: 1.75rem;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 1.3rem;
    }
  }
  p {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.9rem;
    margin: 0;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 0.85rem;
    }
  }
`;


const SplitScreenContainer = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 8px;
  height: calc(100vh - 220px);
  flex: 1;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    height: auto;
  }
`;

const DocumentSection = styled.div`
  background: ${({ theme }) => theme.colors.backgroundCard};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.sm};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ChatSection = styled.div`
  background: ${({ theme }) => theme.colors.backgroundCard};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;


export default function TestChatPage() {
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const params = useParams();
  const router = useRouter();
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
      // Use the API endpoint instead of direct Supabase query to avoid RLS issues
      const response = await fetch(`/api/teacher/chatbots/${chatbotId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[TestChatPage] Error fetching chatbot:', errorData);
        throw new Error(errorData.error || `Failed to fetch chatbot data (status ${response.status})`);
      }
      
      const chatbotData = await response.json();
      
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
  }, [chatbotId]);

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
          <ModernButton variant="ghost" onClick={handleBack} size="small">
            ← Back to Chatbots List
          </ModernButton>
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
           <ModernButton variant="ghost" onClick={handleBack} size="small">
            ← Back to Chatbots List
          </ModernButton>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Container $isReadingRoom={chatbot.bot_type === 'reading_room'} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header $isReadingRoom={chatbot.bot_type === 'reading_room'}>
          <ChatbotInfo>
            <h1>Test: {chatbot.name}</h1>
            <p>
              You are interacting with your chatbot for testing purposes.
              {chatbot.bot_type === 'reading_room' && ' This is a Reading Room bot with document viewer.'}
            </p>
          </ChatbotInfo>
          <ModernButton variant="ghost" onClick={handleBack} size="small">
            ← Back to Chatbots List
          </ModernButton>
        </Header>
        
        {chatbot.bot_type === 'reading_room' ? (
          <SplitScreenContainer>
            <DocumentSection>
              <ReadingDocumentViewer 
                chatbotId={chatbot.chatbot_id} 
              />
            </DocumentSection>
            <ChatSection>
              <Chat 
                roomId={testRoomId} 
                chatbot={chatbot} 
              />
            </ChatSection>
          </SplitScreenContainer>
        ) : (
          <Chat 
            roomId={testRoomId} 
            chatbot={chatbot} 
          />
        )}
      </Container>
    </PageWrapper>
  );
}