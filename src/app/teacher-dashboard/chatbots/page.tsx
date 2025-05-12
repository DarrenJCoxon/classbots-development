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
  /* ... */
`;

const PageHeader = styled.div`
  /* ... */
`;

const Title = styled.h1`
  /* ... */
`;

export default function ManageChatbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchChatbots = useCallback(async () => {
    // ... (fetchChatbots logic remains the same)
    console.log('[ChatbotsPage] Fetching chatbots...');
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/teacher/chatbots');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(errData.error || `Failed to fetch chatbots (status ${response.status})`);
      }
      const data: Chatbot[] = await response.json();
      setChatbots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your chatbots.');
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
        // ***** CORRECTED FETCH URL FOR DELETE *****
        const response = await fetch(`/api/teacher/chatbots?chatbotId=${chatbotId}`, { method: 'DELETE' }); 
        // *****---------------------------------*****
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: `Failed to delete chatbot - Server responded with ${response.status}` }));
          throw new Error(errData.error || 'Failed to delete chatbot');
        }
        // If response.ok, we can assume deletion was successful or at least accepted by the server.
        // The API route should return JSON, so we can parse it for a success message if desired.
        const result = await response.json();
        alert(result.message || `Chatbot "${chatbotName}" deleted successfully.`);
        fetchChatbots(); // Refresh list after successful deletion
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete chatbot.';
        setError(errorMessage);
        alert(`Error: ${errorMessage}`);
      }
    }
  };
  
  const handleCreateNewChatbot = () => {
    router.push(`/teacher-dashboard/chatbots/new/edit`);
  };

  return (
    <PageWrapper>
      <PageHeader>
        <Title>My Chatbots</Title>
        <Button onClick={handleCreateNewChatbot}>+ Create New Chatbot</Button>
      </PageHeader>

      {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}

      {isLoading ? (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <LoadingSpinner /> Loading your chatbots...
        </Card>
      ) : (
        <ChatbotList
          chatbots={chatbots}
          onEdit={handleEditChatbot}
          onDelete={handleDeleteChatbot}
        />
      )}
    </PageWrapper>
  );
}