// src/components/teacher/ChatbotList.tsx
'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { ModernButton } from '@/components/shared/ModernButton';
import { Grid, Card, CardBody, Text, Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell, Badge } from '@/components/ui';;
import { ModernChatbotCard } from './ModernChatbotCard';
import type { Chatbot } from '@/types/database.types';

// Custom styled components for specific needs
const CompactGrid = styled(Grid)`
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const ActionButtonsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
  flex-wrap: nowrap;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-wrap: wrap;
  }
`;

const DescriptionCell = styled(TableCell)`
  max-width: 250px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ChatbotNameLink = styled(Link)`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`;

const getModelDisplayName = (model: string | undefined) => {
  if (!model) return 'Default Model';
  const modelNames: Record<string, string> = {
    'x-ai/grok-3-mini-beta': 'Grok 3 Mini',
    'qwen/qwen3-235b-a22b': 'Qwen3 235B',
    'google/gemini-2.5-flash-preview': 'Gemini 2.5 Flash',
    'openai/gpt-4.1-nano': 'GPT 4.1 Nano', 
  };
  return modelNames[model] || model;
};

const getChatbotTypeVariant = (botType: string | null | undefined): 'primary' | 'warning' | 'info' => {
  if (botType === 'assessment') return 'warning';
  if (botType === 'reading_room') return 'info';
  return 'primary';
};

const getChatbotTypeLabel = (botType: string | null | undefined): string => {
  if (!botType) return 'Learning';
  if (botType === 'reading_room') return 'Reading';
  if (botType === 'assessment') return 'Assessment';
  return botType.charAt(0).toUpperCase() + botType.slice(1);
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
    return (
      <Card variant="minimal">
        <CardBody>
          <Text align="center" color="light">No skolrbots found.</Text>
        </CardBody>
      </Card>
    );
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (viewMode === 'list') {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Description</TableHeaderCell>
            <TableHeaderCell>Model</TableHeaderCell>
            <TableHeaderCell>Knowledge</TableHeaderCell>
            <TableHeaderCell>Last Modified</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chatbots.map((chatbot) => (
            <TableRow key={chatbot.chatbot_id}>
              <TableCell>
                <ChatbotNameLink href={`/teacher-dashboard/chatbots/${chatbot.chatbot_id}/test-chat`} title={`Test chat with ${chatbot.name}`}>
                  {chatbot.name}
                </ChatbotNameLink>
              </TableCell>
              <TableCell>
                <Badge $variant={getChatbotTypeVariant(chatbot.bot_type)}>
                  {getChatbotTypeLabel(chatbot.bot_type)}
                </Badge>
              </TableCell>
              <DescriptionCell title={chatbot.description || undefined}>
                {chatbot.description || '-'}
              </DescriptionCell>
              <TableCell>{getModelDisplayName(chatbot.model)}</TableCell>
              <TableCell>
                <Badge $variant={chatbot.enable_rag ? 'success' : 'default'}>
                  {chatbot.enable_rag ? 'Enabled' : 'Disabled'}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(chatbot.updated_at || chatbot.created_at)}</TableCell>
              <TableCell>
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
                  <ModernButton                     size="small"
                    variant="ghost"
                    onClick={() => onEdit(chatbot.chatbot_id)}
                  >
                    Edit
                  </ModernButton>
                  <ModernButton                     size="small"
                    variant="ghost"
                    onClick={() => onDelete(chatbot.chatbot_id, chatbot.name)}
                  >
                    Delete
                  </ModernButton>
                </ActionButtonsContainer>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <CompactGrid cols={3} gap="md" minItemWidth="280px">
      {chatbots.map((chatbot) => (
        <ModernChatbotCard
          key={chatbot.chatbot_id}
          chatbot={chatbot}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </CompactGrid>
  );
}