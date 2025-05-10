// src/app/teacher-dashboard/chatbots/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { Button, Alert, Card } from '@/styles/StyledComponents';
import ChatbotList from '@/components/teacher/ChatbotList';
import ChatbotForm from '@/components/teacher/ChatbotForm'; // For the modal
// import DeleteModal from '@/components/teacher/DeleteModal'; // We'll integrate delete later
import type { Chatbot } from '@/types/database.types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: 1.8rem;
`;

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChatbotForm, setShowChatbotForm] = useState(false);
  // const [deleteInfo, setDeleteInfo] = useState<{ id: string; name: string } | null>(null);
  const router = useRouter();

  const fetchChatbots = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/teacher/chatbots');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch chatbots (status ${response.status})`);
      }
      const data: Chatbot[] = await response.json();
      setChatbots(data);
    } catch (err) {
      console.error("Error fetching chatbots:", err);
      setError(err instanceof Error ? err.message : 'Could not load chatbots.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  const handleChatbotCreated = () => {
    setShowChatbotForm(false);
    fetchChatbots(); // Refresh the list
  };

  const handleEditChatbot = (chatbotId: string) => {
    router.push(`/teacher-dashboard/chatbots/${chatbotId}/edit`);
  };

  const handleDeleteChatbot = async (chatbotId: string, chatbotName: string) => {
    // For now, just a confirm. We will integrate DeleteModal later.
    if (window.confirm(`Are you sure you want to delete chatbot "${chatbotName}"? This will also delete associated documents.`)) {
      try {
        // We'll need a DELETE API route: /api/teacher/chatbots/[chatbotId]
        // const response = await fetch(`/api/teacher/chatbots/${chatbotId}`, { method: 'DELETE' });
        // if (!response.ok) throw new Error('Failed to delete chatbot');
        alert(`DELETE /api/teacher/chatbots/${chatbotId} would be called. Feature to be fully implemented.`);
        // fetchChatbots(); // Refresh list
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete chatbot.');
      }
    }
  };

  return (
    <div>
      <PageHeader>
        <Title>My Chatbots</Title>
        <Button onClick={() => setShowChatbotForm(true)}>+ Create Chatbot</Button>
      </PageHeader>

      {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}

      {isLoading ? (
        <Card style={{ textAlign: 'center', padding: '40px' }}><LoadingSpinner /> Loading chatbots...</Card>
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
          onSuccess={handleChatbotCreated}
        />
      )}

      {/* {deleteInfo && (
        <DeleteModal
          itemType="Chatbot"
          itemName={deleteInfo.name}
          onConfirm={() => {
            // actual delete logic
            setDeleteInfo(null);
          }}
          onCancel={() => setDeleteInfo(null)}
          isDeleting={false} // manage this state
        />
      )} */}
    </div>
  );
}