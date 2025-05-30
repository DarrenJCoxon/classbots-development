// src/components/teacher/StudentChatHistory.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Alert } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import { ChatMessage as ChatMessageComponent } from '@/components/shared/ChatMessage';
import type { ChatMessage as DatabaseChatMessage } from '@/types/database.types';

const HistoryContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;

const FilterCard = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FilterTitle = styled.h3`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
`;

const FilterForm = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FilterControls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
`;

const StudentNameDisplay = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.primary};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }
`;

const Select = styled.select`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background: ${({ theme }) => theme.colors.background};
  min-width: 200px;
`;

const ConversationCard = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ConversationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ConversationInfo = styled.div`
  h4 {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
  }

  .timestamp {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const MessagesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const LoadMoreButtonWrapper = styled.div`
  margin: ${({ theme }) => theme.spacing.md} auto;
  display: flex;
  justify-content: center;
`;

interface ChatbotOption {
  chatbot_id: string;
  name: string;
}

interface Conversation {
  chatbot_id: string | null;
  chatbot_name: string;
  started_at: string;
  messages: DatabaseChatMessage[];
}

interface StudentChatHistoryProps {
  roomId: string;
  studentId: string;
  studentName: string;
  chatbots: ChatbotOption[];
}

export default function StudentChatHistory({
  roomId,
  studentId,
  studentName,
  chatbots
}: StudentChatHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChatbotFilter, setSelectedChatbotFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchConversations = useCallback(async (resetPage = true) => {
    const currentPageToFetch = resetPage ? 0 : page;

    if (resetPage) {
      setPage(0);
      setConversations([]);
    }

    setLoading(true);
    setError(null);

    try {
      // Use the new flattened API endpoint
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const url = new URL(`/api/teacher/student-chats`, baseUrl);
      
      // Add parameters as query parameters
      url.searchParams.append('roomId', roomId);
      url.searchParams.append('studentId', studentId);
      
      if (selectedChatbotFilter) {
        url.searchParams.append('chatbotId', selectedChatbotFilter);
      }

      // Add pagination params if your API supports them
      if (!resetPage && currentPageToFetch > 0) {
        url.searchParams.append('page', currentPageToFetch.toString());
        url.searchParams.append('limit', '10'); // Example limit
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({error: 'Failed to parse error response'}));
        throw new Error(errorData.error || 'Failed to fetch chat history');
      }

      const data = await response.json();

      if (resetPage) {
        setConversations(data.conversations || []);
      } else {
        setConversations(prev => [...prev, ...(data.conversations || [])]);
      }

      // Set has more if API returns pagination info
      setHasMore(data.pagination?.hasMore || false);

      if (!resetPage && data.conversations && data.conversations.length > 0) {
        setPage(currentPageToFetch + 1);
      } else if (resetPage) {
        setPage(0);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat history');
    } finally {
      setLoading(false);
    }
  }, [roomId, studentId, selectedChatbotFilter, page]);

  useEffect(() => {
    // Initial fetch or fetch when filter changes
    fetchConversations(true);
  }, [roomId, studentId, selectedChatbotFilter, fetchConversations]);

  const handleLoadMore = () => {
    fetchConversations(false);
  };

  const handleChatbotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedChatbotFilter(e.target.value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleString();
  };

  return (
    <HistoryContainer>
      <FilterCard>
        <FilterTitle>Chat History</FilterTitle>
        <FilterForm>
          <StudentNameDisplay>
            Showing conversations for: {studentName}
          </StudentNameDisplay>
          <FilterControls>
            <Select
              value={selectedChatbotFilter}
              onChange={handleChatbotChange}
            >
              <option value="">All Chatbots</option>
              {chatbots.map(chatbot => (
                <option key={chatbot.chatbot_id} value={chatbot.chatbot_id}>
                  {chatbot.name}
                </option>
              ))}
            </Select>
          </FilterControls>
        </FilterForm>
      </FilterCard>

      {error && (
        <Alert variant="error">Error: {error}</Alert>
      )}

      {loading && conversations.length === 0 ? (
        <ConversationCard>
          <p>Loading conversations...</p>
        </ConversationCard>
      ) : conversations.length === 0 ? (
        <EmptyState>
          <h3>No conversations found</h3>
          <p>
            {selectedChatbotFilter
              ? `This student hasn't chatted with the selected chatbot yet.`
              : `This student hasn't chatted with any chatbots yet.`}
          </p>
        </EmptyState>
      ) : (
        <>
          {conversations.map((conversation, index) => {
            const chatbotNameForDisplay = conversation.chatbot_name || 'Unknown Chatbot';

            return (
              <ConversationCard key={`conv-${index}-${conversation.started_at}`}>
                <ConversationHeader>
                  <ConversationInfo>
                    <h4>{chatbotNameForDisplay}</h4>
                    <span className="timestamp">Started {formatDate(conversation.started_at)}</span>
                  </ConversationInfo>
                </ConversationHeader>

                <MessagesList>
                  {conversation.messages.map(message => (
                    <ChatMessageComponent
                      key={message.message_id}
                      message={message}
                      chatbotName={chatbotNameForDisplay}
                    />
                  ))}
                </MessagesList>
              </ConversationCard>
            );
          })}

          {hasMore && (
            <LoadMoreButtonWrapper>
              <ModernButton                 variant="ghost"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </ModernButton>
            </LoadMoreButtonWrapper>
          )}
        </>
      )}
    </HistoryContainer>
  );
}