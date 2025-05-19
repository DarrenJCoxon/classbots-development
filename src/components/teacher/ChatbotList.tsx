// src/components/teacher/ChatbotList.tsx
'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { Card, Button, Badge } from '@/styles/StyledComponents';
import type { Chatbot } from '@/types/database.types';

// Card View Styled Components (Existing)
const ListGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const StyledChatbotCard = styled(Card)<{ $cardAccentColor?: string }>`
  position: relative;
  display: flex;
  flex-direction: column;
  ${({ $cardAccentColor }) => 
    $cardAccentColor && `border-top: 4px solid ${$cardAccentColor};`}

  a > h3 { 
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: 1.25rem;
    text-decoration: none;
    display: block; 
    transition: color ${({ theme }) => theme.transitions.fast};

    &:hover {
      color: ${({ theme }) => theme.colors.primary};
      text-decoration: underline;
    }
  }
  
  p.description {
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: ${({ theme }) => theme.spacing.md};
    flex-grow: 1; 
    min-height: 40px; 
  }
  .model-info {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textMuted};
    background: ${({ theme }) => theme.colors.backgroundDark};
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.borderRadius.small};
    margin-bottom: ${({ theme }) => theme.spacing.md};
    display: inline-block;
  }
  .actions {
    display: flex;
    gap: ${({ theme }) => theme.spacing.md};
    margin-top: auto; 
    padding-top: ${({ theme }) => theme.spacing.md}; 
    flex-wrap: no-wrap; 
    
    button { 
        flex-grow: 1; 
        flex-basis: calc(50% - ${({ theme }) => `calc(${theme.spacing.md} / 2)`});
        max-width: calc(50% - ${({ theme }) => `calc(${theme.spacing.md} / 2)`});
        text-align: center; 

         @media (max-width: 380px) { 
            flex-basis: 100%; 
            max-width: 100%;
            &:not(:last-child) {
              margin-bottom: ${({ theme }) => theme.spacing.sm};
            }
         }
    }
  }
`;

// Styled Components for Table/List View
const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  margin-top: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
`;

const Table = styled.table`
  width: 100%;
  min-width: 800px; 
  border-collapse: collapse;
  
  th, td {
    padding: ${({ theme }) => theme.spacing.md};
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    vertical-align: middle;
  }

  th {
    background-color: ${({ theme }) => theme.colors.backgroundCard};
    color: ${({ theme }) => theme.colors.textLight};
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
    white-space: nowrap;
  }

  td {
    font-size: 0.9rem;
  }

  tr:last-child td {
    border-bottom: none;
  }
  
  .description-cell {
    max-width: 250px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const ActionButtonsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
`;

const ActionButtonsContainerCard = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: auto; 
  padding-top: ${({ theme }) => theme.spacing.md}; 
  flex-wrap: wrap;
`;

const ActionButton = styled(Button)`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xs};
  white-space: nowrap;
  
  svg {
    font-size: 0.85rem;
  }
  
  @media (max-width: 380px) { 
    flex-basis: 100%; 
    
    &:not(:last-child) {
      margin-bottom: ${({ theme }) => theme.spacing.sm};
    }
  }
`;

const getModelDisplayName = (model: string | undefined) => {
    if (!model) return 'Default Model';
    const modelNames: Record<string, string> = {
        'x-ai/grok-3-mini-beta': 'Grok 3 Mini',
        'qwen/qwen3-235b-a22b': 'Qwen3 235B',
        'google/gemini-2.5-flash-preview': 'Gemini 2.5 Flash',
        'openai/gpt-4.1-nano': 'GPT-4.1 Nano', 
    };
    return modelNames[model] || model;
};

// Ensure this interface is EXPORTED
export interface ChatbotListProps {
  chatbots: Chatbot[];
  onEdit: (chatbotId: string) => void;
  onDelete: (chatbotId: string, chatbotName: string) => void; 
  viewMode: 'card' | 'list';
}

export default function ChatbotList({ chatbots, onEdit, onDelete, viewMode }: ChatbotListProps) {

  if (chatbots.length === 0) {
    return <Card><p>No chatbots found.</p></Card>;
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (viewMode === 'list') {
    return (
      <TableContainer>
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Description</th>
              <th>Model</th>
              <th>RAG</th>
              <th>Last Modified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {chatbots.map((chatbot) => (
              <tr key={chatbot.chatbot_id}>
                <td>
                  <Link href={`/teacher-dashboard/chatbots/${chatbot.chatbot_id}/test-chat`} title={`Test chat with ${chatbot.name}`}>
                    {chatbot.name}
                  </Link>
                </td>
                <td>
                  <Badge variant={chatbot.bot_type === 'assessment' ? 'warning' : 'default'}>
                    {chatbot.bot_type ? chatbot.bot_type.charAt(0).toUpperCase() + chatbot.bot_type.slice(1) : 'N/A'}
                  </Badge>
                </td>
                <td className="description-cell" title={chatbot.description || undefined}>
                  {chatbot.description || '-'}
                </td>
                <td>{getModelDisplayName(chatbot.model)}</td>
                <td>
                  <Badge variant={chatbot.enable_rag ? 'success' : 'default'}>
                    {chatbot.enable_rag ? 'Enabled' : 'Disabled'}
                  </Badge>
                </td>
                <td>{formatDate(chatbot.updated_at || chatbot.created_at)}</td>
                <td>
                  <ActionButtonsContainer>
                    <Button
                      size="small"
                      variant="outline"
                      onClick={() => onEdit(chatbot.chatbot_id)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="magenta"
                      onClick={() => onDelete(chatbot.chatbot_id, chatbot.name)}
                    >
                      Delete
                    </Button>
                  </ActionButtonsContainer>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <ListGrid>
      {chatbots.map((chatbot) => {
        return (
          <StyledChatbotCard 
              key={chatbot.chatbot_id}
          >
            <Link href={`/teacher-dashboard/chatbots/${chatbot.chatbot_id}/test-chat`} title={`Test chat with ${chatbot.name}`}>
              <h3>{chatbot.name}</h3>
            </Link>
            <p className="description">{chatbot.description || 'No description provided.'}</p>
            <div className="model-info">
              Model: {getModelDisplayName(chatbot.model)}
            </div>
            <ActionButtonsContainerCard>
              <ActionButton
                size="small"
                variant="outline" 
                onClick={() => onEdit(chatbot.chatbot_id)}
                title="Edit chatbot settings"
              >
                Edit
              </ActionButton>
              <ActionButton
                size="small"
                variant="magenta"
                onClick={() => onDelete(chatbot.chatbot_id, chatbot.name)}
                title="Delete this chatbot"
              >
                Delete
              </ActionButton>
            </ActionButtonsContainerCard>
          </StyledChatbotCard>
        );
      })}
    </ListGrid>
  );
}