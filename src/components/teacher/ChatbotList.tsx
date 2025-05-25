// src/components/teacher/ChatbotList.tsx
'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { Card, Badge } from '@/styles/StyledComponents';
import { GlassCard } from '@/components/shared/GlassCard';
import { ModernButton } from '@/components/shared/ModernButton';
import { ChatbotCard } from './ChatbotCard';
import type { Chatbot } from '@/types/database.types';

// Card View Styled Components (Existing)
const ListGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const StyledChatbotCard = styled(GlassCard)<{ $cardAccentColor?: string }>`
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${({ theme }) => `linear-gradient(90deg, 
      ${theme.colors.purple} 0%, 
      ${theme.colors.primary} 50%, 
      ${theme.colors.blue} 100%)`};
    opacity: 0.8;
  }

  a > h3 { 
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: 1.25rem;
    text-decoration: none;
    display: block; 
    transition: color ${({ theme }) => theme.transitions.fast};
    font-family: ${({ theme }) => theme.fonts.heading};
    text-transform: uppercase;

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
  margin-top: 24px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
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
    background: rgba(152, 93, 215, 0.05);
    color: ${({ theme }) => theme.colors.text};
    font-weight: 700;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
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

const ModernBadge = styled.span<{ $variant?: 'default' | 'warning' | 'success' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'warning':
        return 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)';
      case 'success':
        return 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)';
      default:
        return 'linear-gradient(135deg, rgba(152, 93, 215, 0.1) 0%, rgba(76, 190, 243, 0.1) 100%)';
    }
  }};
  color: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'warning':
        return theme.colors.secondary;
      case 'success':
        return theme.colors.green;
      default:
        return theme.colors.primary;
    }
  }};
  border: 1px solid ${({ $variant, theme }) => {
    switch ($variant) {
      case 'warning':
        return 'rgba(251, 191, 36, 0.3)';
      case 'success':
        return 'rgba(16, 185, 129, 0.3)';
      default:
        return 'rgba(152, 93, 215, 0.2)';
    }
  }};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
`;

const ActionButtonsContainerCard = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: auto; 
  padding-top: ${({ theme }) => theme.spacing.md}; 
  flex-wrap: wrap;
`;

const ActionButton = styled(ModernButton)`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xs};
  white-space: nowrap;
  text-decoration: none;
  
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
    return <Card><p>No skolrbots found.</p></Card>;
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
                  <ModernBadge $variant={chatbot.bot_type === 'assessment' ? 'warning' : 'default'}>
                    {chatbot.bot_type ? chatbot.bot_type.charAt(0).toUpperCase() + chatbot.bot_type.slice(1) : 'N/A'}
                  </ModernBadge>
                </td>
                <td className="description-cell" title={chatbot.description || undefined}>
                  {chatbot.description || '-'}
                </td>
                <td>{getModelDisplayName(chatbot.model)}</td>
                <td>
                  <ModernBadge $variant={chatbot.enable_rag ? 'success' : 'default'}>
                    {chatbot.enable_rag ? 'Enabled' : 'Disabled'}
                  </ModernBadge>
                </td>
                <td>{formatDate(chatbot.updated_at || chatbot.created_at)}</td>
                <td>
                  <ActionButtonsContainer>
                    <Link href={`/teacher-dashboard/chatbots/${chatbot.chatbot_id}/test-chat`}>
                      <ModernButton
                        size="small"
                        variant="primary"
                        as="span"
                      >
                        Test
                      </ModernButton>
                    </Link>
                    <ModernButton
                      size="small"
                      variant="ghost"
                      onClick={() => onEdit(chatbot.chatbot_id)}
                    >
                      Edit
                    </ModernButton>
                    <ModernButton
                      size="small"
                      variant="danger"
                      onClick={() => onDelete(chatbot.chatbot_id, chatbot.name)}
                    >
                      Delete
                    </ModernButton>
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
      {chatbots.map((chatbot) => (
        <ChatbotCard
          key={chatbot.chatbot_id}
          chatbot={chatbot}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ListGrid>
  );
}