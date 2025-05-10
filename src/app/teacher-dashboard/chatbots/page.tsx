// src/app/teacher-dashboard/chatbots/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation'; // << IMPORTED
import { Button, Alert, Card } from '@/styles/StyledComponents';
import ChatbotList from '@/components/teacher/ChatbotList';
import ChatbotForm from '@/components/teacher/ChatbotForm';
import type { Chatbot } from '@/types/database.types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageWrapper = styled.div`
  /* Add any specific page padding if needed, or let Container in layout handle it */
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap; 
  gap: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  font-size: 1.8rem; 
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

export default function ManageChatbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChatbotForm, setShowChatbotForm] = useState(false);
  const router = useRouter(); // << INITIALIZED ROUTER

  const fetchChatbots = useCallback(async () => {
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
      console.log('[ChatbotsPage] Chatbots fetched:', data);
      setChatbots(data);
    } catch (err) {
      console.error("[ChatbotsPage] Error fetching chatbots:", err);
      setError(err instanceof Error ? err.message : 'Could not load your chatbots.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  const handleChatbotCreated = (chatbotId: string) => { // << ACCEPTS chatbotId
    console.log('[ChatbotsPage] Chatbot created with ID:', chatbotId, 'Navigating to edit page.');
    setShowChatbotForm(false);
    router.push(`/teacher-dashboard/chatbots/${chatbotId}/edit`); // << REDIRECT
  };

  const handleEditChatbot = (chatbotId: string) => {
    console.log('[ChatbotsPage] Navigating to edit chatbot:', chatbotId);
    router.push(`/teacher-dashboard/chatbots/${chatbotId}/edit`);
  };

  const handleDeleteChatbot = async (chatbotId: string, chatbotName: string) => {
    if (window.confirm(`Are you sure you want to delete the chatbot "${chatbotName}"? This will also delete associated documents and knowledge base entries.`)) {
      console.log(`[ChatbotsPage] Deleting chatbot (placeholder): ${chatbotId} - ${chatbotName}`);
      // TODO: Implement API call to DELETE /api/teacher/chatbots/[chatbotId]
      // This will require a new API route: src/app/api/teacher/chatbots/[chatbotId]/route.ts
      alert(`Placeholder: Chatbot "${chatbotName}" would be deleted. API DELETE endpoint needs to be implemented.`);
      // Example:
      // try {
      //   const response = await fetch(`/api/teacher/chatbots/${chatbotId}`, { method: 'DELETE' });
      //   if (!response.ok) {
      //     const errData = await response.json().catch(() => ({}));
      //     throw new Error(errData.error || 'Failed to delete chatbot');
      //   }
      //   fetchChatbots(); // Refresh list
      // } catch (err) {
      //   setError(err instanceof Error ? err.message : 'Failed to delete chatbot.');
      // }
    }
  };

  return (
    <PageWrapper>
      <PageHeader>
        <Title>My Chatbots</Title>
        <Button onClick={() => setShowChatbotForm(true)}>+ Create New Chatbot</Button>
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

      {showChatbotForm && (
        <ChatbotForm
          onClose={() => setShowChatbotForm(false)}
          onSuccess={handleChatbotCreated} // This now passes chatbotId to the handler
        />
      )}
    </PageWrapper>
  );
}