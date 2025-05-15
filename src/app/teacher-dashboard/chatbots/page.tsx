// src/app/teacher-dashboard/chatbots/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { useRouter } from 'next/navigation';
import { Button, Alert, Card, Input, Select as StyledSelect, FormGroup, Label } from '@/styles/StyledComponents';
import ChatbotList, { type ChatbotListProps } from '@/components/teacher/ChatbotList'; // Ensure type ChatbotListProps is imported
import type { Chatbot, BotTypeEnum } from '@/types/database.types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageWrapper = styled.div`
  /* Add any specific wrapper styles if needed */
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg}; 
  flex-wrap: wrap; 
  gap: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  font-size: 1.8rem;
  color: ${({ theme }) => theme.colors.text};
  margin: 0; 
`;

const ControlsContainer = styled(Card)`
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  background-color: ${({ theme }) => theme.colors.background}; 
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  align-items: flex-end; 
`;

const ViewToggleContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-left: auto; 
  
  @media (max-width: 768px) { 
    margin-left: 0;
    width: 100%;
    justify-content: flex-start; 
    margin-top: ${({ theme }) => theme.spacing.md};
  }
`;


export default function ManageChatbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const theme = useTheme(); 

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBotType, setSelectedBotType] = useState<BotTypeEnum | ''>('');
  const [selectedRagStatus, setSelectedRagStatus] = useState<'any' | 'true' | 'false'>('any');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); 

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const fetchChatbots = useCallback(async () => {
    console.log('[ChatbotsPage] Fetching chatbots with filters:', 
        { debouncedSearchTerm, selectedBotType, selectedRagStatus, sortBy });
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) {
        params.append('searchTerm', debouncedSearchTerm);
      }
      if (selectedBotType) {
        params.append('botType', selectedBotType);
      }
      if (selectedRagStatus !== 'any') {
        params.append('ragEnabled', selectedRagStatus);
      }
      if (sortBy) {
        params.append('sortBy', sortBy);
      }

      const response = await fetch(`/api/teacher/chatbots?${params.toString()}`);
      if (!response.ok) {
        let errorMessage = `Failed to fetch chatbots (status ${response.status})`;
        try {
            const errData = await response.json();
            errorMessage = errData.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setChatbots(data as Chatbot[]);
      } else {
        console.warn('[ChatbotsPage] API returned non-array data for chatbots:', data);
        setChatbots([]);
      }
    } catch (err) {
      console.error('[ChatbotsPage] Error fetching chatbots:', err);
      setError(err instanceof Error ? err.message : 'Could not load your chatbots.');
      setChatbots([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, selectedBotType, selectedRagStatus, sortBy]);

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  const handleEditChatbot = useCallback((chatbotId: string) => {
      router.push(`/teacher-dashboard/chatbots/${chatbotId}/edit`);
  }, [router]);

  const handleDeleteChatbot = useCallback(async (chatbotId: string, chatbotName: string) => {
      if (window.confirm(`Are you sure you want to delete the chatbot "${chatbotName}"? This will also delete associated documents and knowledge base entries if RAG was used.`)) {
          setError(null);
          try {
              const response = await fetch(`/api/teacher/chatbots?chatbotId=${chatbotId}`, { method: 'DELETE' }); 
              if (!response.ok) {
                  let errorMessage = `Failed to delete chatbot (status ${response.status})`;
                  try {
                      const errData = await response.json();
                      errorMessage = errData.error || errorMessage;
                  } catch {}
                  throw new Error(errorMessage);
              }
              const result = await response.json();
              alert(result.message || `Chatbot "${chatbotName}" deleted successfully.`);
              fetchChatbots(); 
          } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Failed to delete chatbot.';
              setError(errorMessage);
          }
      }
  }, [fetchChatbots]); 
  
  const handleCreateNewChatbot = useCallback(() => {
      router.push(`/teacher-dashboard/chatbots/new/edit`);
  }, [router]);

  const content = useMemo(() => {
    if (isLoading && chatbots.length === 0) { 
      return (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <LoadingSpinner /> Loading your chatbots...
        </Card>
      );
    } 
    if (!isLoading && !error && chatbots.length === 0) {
      return (
        <Card style={{ textAlign: 'center', padding: '20px' }}>
          <p>No chatbots found matching your current filters. Try adjusting them or create a new chatbot!</p>
        </Card>
      );
    }
    if (chatbots.length > 0) {
      const propsForChatbotList: ChatbotListProps = { 
        chatbots: chatbots,
        onEdit: handleEditChatbot,     
        onDelete: handleDeleteChatbot,
        viewMode: viewMode
      };
      return (
        <ChatbotList {...propsForChatbotList} /> 
      );
    }
    return null; 
  }, [isLoading, error, chatbots, handleEditChatbot, handleDeleteChatbot, viewMode]);


  return (
    <PageWrapper>
      <PageHeader>
        <Title>My Chatbots</Title>
        <Button onClick={handleCreateNewChatbot}>+ Create New Chatbot</Button>
      </PageHeader>

      <ControlsContainer $accentSide="top" $accentColor={theme.colors.blue}>
        <FilterGrid>
          <FormGroup style={{ marginBottom: 0 }}> 
            <Label htmlFor="searchTerm">Search</Label>
            <Input
              type="text"
              id="searchTerm"
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FormGroup>
          <FormGroup style={{ marginBottom: 0 }}>
            <Label htmlFor="botTypeFilter">Bot Type</Label>
            <StyledSelect
              id="botTypeFilter"
              value={selectedBotType}
              onChange={(e) => setSelectedBotType(e.target.value as BotTypeEnum | '')}
            >
              <option value="">All Types</option>
              <option value="learning">Learning</option>
              <option value="assessment">Assessment</option>
            </StyledSelect>
          </FormGroup>
          <FormGroup style={{ marginBottom: 0 }}>
            <Label htmlFor="ragStatusFilter">RAG Status</Label>
            <StyledSelect
              id="ragStatusFilter"
              value={selectedRagStatus}
              onChange={(e) => setSelectedRagStatus(e.target.value as 'any' | 'true' | 'false')}
            >
              <option value="any">Any RAG Status</option>
              <option value="true">RAG Enabled</option>
              <option value="false">RAG Disabled</option>
            </StyledSelect>
          </FormGroup>
          <FormGroup style={{ marginBottom: 0 }}>
            <Label htmlFor="sortBy">Sort By</Label>
            <StyledSelect
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="created_at_desc">Newest First</option>
              <option value="created_at_asc">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="updated_at_desc">Last Modified</option>
            </StyledSelect>
          </FormGroup>
          <ViewToggleContainer>
            <Button
              variant={viewMode === 'card' ? 'primary' : 'outline'}
              onClick={() => setViewMode('card')}
              size="small"
              title="Card View"
            >
              🗂️ Card
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              onClick={() => setViewMode('list')}
              size="small"
              title="List View"
            >
              📄 List
            </Button>
          </ViewToggleContainer>
        </FilterGrid>
      </ControlsContainer>

      {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
      
      {isLoading && chatbots.length > 0 && (
        <div style={{ textAlign: 'center', padding: '10px' }}>
          <LoadingSpinner size="small" /> Updating list...
        </div>
      )}
      {content}

    </PageWrapper>
  );
}