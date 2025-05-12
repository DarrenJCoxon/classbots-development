// src/app/teacher-dashboard/chatbots/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { Button, Alert, Card } from '@/styles/StyledComponents';
import ChatbotList from '@/components/teacher/ChatbotList';
import type { Chatbot } from '@/types/database.types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageWrapper = styled.div`
  /* Add any specific wrapper styles if needed */
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap; // Ensure responsiveness
  gap: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  font-size: 1.8rem;
  color: ${({ theme }) => theme.colors.text};
  margin: 0; // Remove default margin if PageHeader handles spacing
`;

export default function ManageChatbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchChatbots = useCallback(async () => {
    console.log('[ChatbotsPage] Fetching chatbots...');
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/teacher/chatbots');
      if (!response.ok) {
        let errorMessage = `Failed to fetch chatbots (status ${response.status})`;
        try {
            const errData = await response.json();
            errorMessage = errData.error || errorMessage;
        } catch {
            // If parsing errorData fails, use the original message
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      // Ensure data is an array before setting state
      if (Array.isArray(data)) {
        setChatbots(data as Chatbot[]);
      } else {
        // If data is not an array, it might be an unexpected response format
        // or an error object that wasn't caught by !response.ok
        console.warn('[ChatbotsPage] API returned non-array data for chatbots:', data);
        setChatbots([]); // Default to empty array
        // Optionally set an error if this case is unexpected
        // setError("Received unexpected data format for chatbots.");
      }
    } catch (err) {
      console.error('[ChatbotsPage] Error fetching chatbots:', err);
      setError(err instanceof Error ? err.message : 'Could not load your chatbots.');
      setChatbots([]); // Ensure chatbots is an array on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  const handleEditChatbot = (chatbotId: string) => {
    router.push(`/teacher-dashboard/chatbots/${chatbotId}/edit`);
  };

  const handleDeleteChatbot = async (chatbotId: string, chatbotName: string) => {
    if (window.confirm(`Are you sure you want to delete the chatbot "${chatbotName}"? This will also delete associated documents and knowledge base entries if RAG was used.`)) {
      setError(null);
      try {
        const response = await fetch(`/api/teacher/chatbots?chatbotId=${chatbotId}`, { method: 'DELETE' }); 
        
        if (!response.ok) {
          let errorMessage = `Failed to delete chatbot (status ${response.status})`;
          try {
            const errData = await response.json();
            errorMessage = errData.error || errorMessage;
          } catch { /* Parsing failed, use default */ }
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        alert(result.message || `Chatbot "${chatbotName}" deleted successfully.`);
        fetchChatbots(); 
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete chatbot.';
        setError(errorMessage);
        // alert(`Error: ${errorMessage}`); // Alerting might be too noisy, error state is set
      }
    }
  };
  
  const handleCreateNewChatbot = () => {
    router.push(`/teacher-dashboard/chatbots/new/edit`);
  };

  // Conditional rendering for loading/error/empty states
  let content;
  if (isLoading) {
    content = (
      <Card style={{ textAlign: 'center', padding: '40px' }}>
        <LoadingSpinner /> Loading your chatbots...
      </Card>
    );
  } else if (error) {
    // Error is already displayed by the Alert component below
    content = null; 
  } else {
    content = (
      <ChatbotList
        chatbots={chatbots} // chatbots is now guaranteed to be an array
        onEdit={handleEditChatbot}
        onDelete={handleDeleteChatbot}
      />
    );
  }


  return (
    <PageWrapper>
      <PageHeader>
        <Title>My Chatbots</Title>
        <Button onClick={handleCreateNewChatbot}>+ Create New Chatbot</Button>
      </PageHeader>

      {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
      
      {content}

    </PageWrapper>
  );
}