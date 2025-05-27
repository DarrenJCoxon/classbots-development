// src/app/teacher-dashboard/chatbots/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { PageWrapper } from '@/components/shared/PageStructure';
import { useRouter } from 'next/navigation';
import { Alert, Select as StyledSelect, FormGroup, Label } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import { FullPageLoader } from '@/components/shared/AnimatedLoader';
import ChatbotList, { type ChatbotListProps } from '@/components/teacher/ChatbotList';
import ChatbotForm from '@/components/teacher/ChatbotForm';
import type { Chatbot, BotTypeEnum } from '@/types/database.types';
import { 
  FiGrid, 
  FiList, 
  FiSearch, 
  FiPlus,
  FiActivity,
  FiBook,
  FiCheckCircle,
  FiBookOpen
} from 'react-icons/fi';

// Styled components matching rooms page design
const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 36px;
  font-weight: 800;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchBar = styled.div`
  position: relative;
  width: 300px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 48px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(152, 93, 215, 0.1);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const SearchIcon = styled(FiSearch)`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.textLight};
  width: 20px;
  height: 20px;
`;

const ViewToggle = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 10px;
  overflow: hidden;
`;

const ToggleButton = styled.button<{ $isActive: boolean }>`
  padding: 8px 16px;
  background: ${({ $isActive, theme }) => 
    $isActive 
      ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.magenta})`
      : 'transparent'
  };
  color: ${({ $isActive, theme }) => 
    $isActive ? 'white' : theme.colors.textLight
  };
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
  
  &:hover {
    color: ${({ $isActive, theme }) => 
      $isActive ? 'white' : theme.colors.primary
    };
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const FiltersContainer = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  align-items: flex-end;
`;

const StatsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }
`;

const StatCard = styled(motion.div)`
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(152, 93, 215, 0.1);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 12px;
    gap: 12px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 12px;
    gap: 12px;
  }
`;

const StatIconWrapper = styled.div<{ color: string }>`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ color }) => `${color}15`};
  border-radius: 12px;
  
  svg {
    width: 24px;
    height: 24px;
    color: ${({ color }) => color};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    
    svg {
      width: 18px;
      height: 18px;
    }
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    
    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

const StatContent = styled.div`
  flex: 1;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 4px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 18px;
    margin-bottom: 0;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 18px;
    margin-bottom: 0;
    order: 2;
  }
`;

const StatLabel = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textLight};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 12px;
    letter-spacing: 0.3px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 11px;
    letter-spacing: 0;
    order: 1;
    margin-right: 8px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 40px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 2px dashed rgba(152, 93, 215, 0.3);
  border-radius: 20px;
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}20, 
    ${({ theme }) => theme.colors.magenta}20
  );
  border-radius: 50%;
  
  svg {
    width: 40px;
    height: 40px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const EmptyTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const EmptyText = styled.p`
  margin: 0 0 24px 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 16px;
`;

const StyledFormGroup = styled(FormGroup)`
  margin-bottom: 0;
`;

const StyledLabel = styled(Label)`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
  display: block;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StyledSelectBox = styled(StyledSelect)`
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid ${({ theme }) => theme.colors.border};
  transition: all 0.2s ease;
  
  &:focus {
    background: white;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
  }
`;


export default function ManageSkolrbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); 

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBotType, setSelectedBotType] = useState<BotTypeEnum | ''>('');
  const [selectedRagStatus, setSelectedRagStatus] = useState<'any' | 'true' | 'false'>('any');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  
  // Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editChatbot, setEditChatbot] = useState<Chatbot | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
    console.log('[SkolrbotsPage] Fetching skolrbots with filters:', 
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
        let errorMessage = `Failed to fetch skolrbots (status ${response.status})`;
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
        console.warn('[SkolrbotsPage] API returned non-array data for skolrbots:', data);
        setChatbots([]);
      }
    } catch (err) {
      console.error('[SkolrbotsPage] Error fetching skolrbots:', err);
      setError(err instanceof Error ? err.message : 'Could not load your skolrbots.');
      setChatbots([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, selectedBotType, selectedRagStatus, sortBy]);

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  const handleEditChatbot = useCallback((chatbotId: string) => {
      // Find the chatbot in the array
      const chatbotToEdit = chatbots.find(bot => bot.chatbot_id === chatbotId);
      
      if (chatbotToEdit) {
        setEditChatbot(chatbotToEdit);
        setShowEditModal(true);
        setIsCreating(false);
      } else {
        console.error(`Skolrbot with ID ${chatbotId} not found`);
        setError(`Skolrbot with ID ${chatbotId} not found`);
      }
  }, [chatbots]);

  const handleDeleteChatbot = useCallback(async (chatbotId: string, chatbotName: string) => {
      if (window.confirm(`Are you sure you want to delete the skolrbot "${chatbotName}"? This will also delete associated documents and knowledge base entries if RAG was used.`)) {
          setError(null);
          try {
              const response = await fetch(`/api/teacher/chatbots?chatbotId=${chatbotId}`, { method: 'DELETE' }); 
              if (!response.ok) {
                  let errorMessage = `Failed to delete skolrbot (status ${response.status})`;
                  try {
                      const errData = await response.json();
                      errorMessage = errData.error || errorMessage;
                  } catch {}
                  throw new Error(errorMessage);
              }
              const result = await response.json();
              alert(result.message || `Skolrbot "${chatbotName}" deleted successfully.`);
              fetchChatbots(); 
          } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Failed to delete skolrbot.';
              setError(errorMessage);
          }
      }
  }, [fetchChatbots]); 
  
  const handleCreateNewChatbot = useCallback(() => {
      setEditChatbot(null);
      setShowEditModal(true);
      setIsCreating(true);
  }, []);
  
  const handleFormClose = useCallback(() => {
    setShowEditModal(false);
    setEditChatbot(null);
  }, []);
  
  const handleFormSuccess = useCallback(async (chatbotId: string) => {
    setShowEditModal(false);
    setEditChatbot(null);
    
    // Fetch the newly created bot to check its type
    if (isCreating && chatbotId) {
      try {
        // Fetch the specific chatbot to get its type
        const response = await fetch(`/api/teacher/chatbots/${chatbotId}`);
        if (response.ok) {
          const newBot = await response.json();
          
          // For Reading Room bots, redirect to edit page to upload documents
          if (newBot.bot_type === 'reading_room') {
            router.push(`/teacher-dashboard/chatbots/${chatbotId}/edit`);
            return; // Don't refresh the list since we're navigating away
          }
        }
      } catch (error) {
        console.error('Error fetching new chatbot details:', error);
      }
    }
    
    // For other bot types or edit mode, just refresh the list
    fetchChatbots();
  }, [fetchChatbots, isCreating, router]);

  // Calculate stats
  const totalChatbots = chatbots.length;
  const learningBots = chatbots.filter(bot => bot.bot_type === 'learning').length;
  const assessmentBots = chatbots.filter(bot => bot.bot_type === 'assessment').length;
  const readingRoomBots = chatbots.filter(bot => bot.bot_type === 'reading_room').length;

  if (isLoading && chatbots.length === 0) {
    return <FullPageLoader message="Loading your skolrbots..." variant="dots" />;
  }


  return (
    <PageWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <ListHeader>
        <Title>My Skolrbots</Title>
        <HeaderActions>
          <SearchBar>
            <SearchIcon />
            <SearchInput
              type="text"
              placeholder="Search skolrbots..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBar>
          
          <ViewToggle>
            <ToggleButton
              $isActive={viewMode === 'card'}
              onClick={() => setViewMode('card')}
            >
              <FiGrid />
            </ToggleButton>
            <ToggleButton
              $isActive={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            >
              <FiList />
            </ToggleButton>
          </ViewToggle>
          
          <ModernButton
            variant="primary"
            size="medium"
            onClick={handleCreateNewChatbot}
          >
            <FiPlus />
            Create Skolrbot
          </ModernButton>
        </HeaderActions>
      </ListHeader>
      
      <StatsBar>
        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StatIconWrapper color="#985DD7">
            <FiActivity />
          </StatIconWrapper>
          <StatContent>
            <StatValue>{totalChatbots}</StatValue>
            <StatLabel>Total Skolrbots</StatLabel>
          </StatContent>
        </StatCard>
        
        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <StatIconWrapper color="#4CBEF3">
            <FiBook />
          </StatIconWrapper>
          <StatContent>
            <StatValue>{learningBots}</StatValue>
            <StatLabel>Learning Bots</StatLabel>
          </StatContent>
        </StatCard>
        
        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <StatIconWrapper color="#C848AF">
            <FiCheckCircle />
          </StatIconWrapper>
          <StatContent>
            <StatValue>{assessmentBots}</StatValue>
            <StatLabel>Assessment Bots</StatLabel>
          </StatContent>
        </StatCard>
        
        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <StatIconWrapper color="#FE4372">
            <FiBookOpen />
          </StatIconWrapper>
          <StatContent>
            <StatValue>{readingRoomBots}</StatValue>
            <StatLabel>Reading Room Bots</StatLabel>
          </StatContent>
        </StatCard>
      </StatsBar>
      
      <FiltersContainer>
        <FilterGrid>
          <StyledFormGroup>
            <StyledLabel htmlFor="botTypeFilter">Bot Type</StyledLabel>
            <StyledSelectBox
              id="botTypeFilter"
              value={selectedBotType}
              onChange={(e) => setSelectedBotType(e.target.value as BotTypeEnum | '')}
            >
              <option value="">All Types</option>
              <option value="learning">Learning</option>
              <option value="assessment">Assessment</option>
              <option value="reading_room">Reading Room</option>
            </StyledSelectBox>
          </StyledFormGroup>
          
          <StyledFormGroup>
            <StyledLabel htmlFor="ragStatusFilter">RAG Status</StyledLabel>
            <StyledSelectBox
              id="ragStatusFilter"
              value={selectedRagStatus}
              onChange={(e) => setSelectedRagStatus(e.target.value as 'any' | 'true' | 'false')}
            >
              <option value="any">Any RAG Status</option>
              <option value="true">RAG Enabled</option>
              <option value="false">RAG Disabled</option>
            </StyledSelectBox>
          </StyledFormGroup>
          
          <StyledFormGroup>
            <StyledLabel htmlFor="sortBy">Sort By</StyledLabel>
            <StyledSelectBox
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="created_at_desc">Newest First</option>
              <option value="created_at_asc">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="updated_at_desc">Last Modified</option>
            </StyledSelectBox>
          </StyledFormGroup>
        </FilterGrid>
      </FiltersContainer>

      {error && <Alert variant="error" style={{ marginBottom: '24px' }}>{error}</Alert>}
      
      {chatbots.length === 0 && !isLoading ? (
        <EmptyState>
          <EmptyIcon>
            <FiPlus />
          </EmptyIcon>
          <EmptyTitle>
            {debouncedSearchTerm ? 'No skolrbots found' : 'No skolrbots yet'}
          </EmptyTitle>
          <EmptyText>
            {debouncedSearchTerm 
              ? 'Try adjusting your search or filters'
              : 'Create your first skolrbot to get started'
            }
          </EmptyText>
          {!debouncedSearchTerm && (
            <ModernButton
              variant="primary"
              onClick={handleCreateNewChatbot}
            >
              <FiPlus />
              Create Your First Skolrbot
            </ModernButton>
          )}
        </EmptyState>
      ) : (
        <ChatbotList 
          chatbots={chatbots}
          onEdit={handleEditChatbot}     
          onDelete={handleDeleteChatbot}
          viewMode={viewMode}
        />
      )}

      {/* Modal Form for Creating/Editing Skolrbots */}
      {showEditModal && (
        <ChatbotForm 
          onClose={handleFormClose} 
          onSuccess={handleFormSuccess}
          initialData={editChatbot ? {
            chatbot_id: editChatbot.chatbot_id,
            name: editChatbot.name,
            description: editChatbot.description || '',
            system_prompt: editChatbot.system_prompt,
            model: editChatbot.model || 'openai/gpt-4.1-nano',
            max_tokens: editChatbot.max_tokens || undefined,
            temperature: editChatbot.temperature || undefined,
            enable_rag: editChatbot.enable_rag || false,
            bot_type: editChatbot.bot_type || 'learning',
            assessment_criteria_text: editChatbot.assessment_criteria_text || '',
            welcome_message: editChatbot.welcome_message || '',
          } : undefined}
          editMode={!isCreating}
        />
      )}
    </PageWrapper>
  );
}