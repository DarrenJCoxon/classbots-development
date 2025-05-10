// src/components/teacher/ChatbotList.tsx
'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { Card, Button } from '@/styles/StyledComponents';
import type { Chatbot } from '@/types/database.types';

// ... (ListGrid, StyledChatbotCard, getModelDisplayName styled components remain the same) ...
const ListGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const StyledChatbotCard = styled(Card)`
  position: relative;
  display: flex;
  flex-direction: column;

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
    min-height: 2.5rem;
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
    gap: ${({ theme }) => theme.spacing.sm};
    margin-top: auto; 
    padding-top: ${({ theme }) => theme.spacing.md};
    flex-wrap: wrap;
    button, a { 
        flex-grow: 1;
        min-width: calc(33% - ${({ theme }) => theme.spacing.sm} * 2 / 3);
        text-align: center;
         @media (max-width: 420px) { 
            min-width: 100%;
         }
    }
  }
`;

const getModelDisplayName = (model: string | undefined) => {
    if (!model) return 'Default Model';
    const modelNames: Record<string, string> = {
        'x-ai/grok-3-mini-beta': 'Grok 3 Mini',
        'qwen/qwen3-235b-a22b': 'Qwen3 235B',
        'google/gemini-2.5-flash-preview': 'Gemini 2.5 Flash'
    };
    return modelNames[model] || model;
};

interface ChatbotListProps {
  chatbots: Chatbot[];
  onEdit: (chatbotId: string) => void;
  onDelete: (chatbotId: string, chatbotName: string) => void;
}

export default function ChatbotList({ chatbots, onEdit, onDelete }: ChatbotListProps) {
  if (chatbots.length === 0) {
    return <Card><p>No chatbots created yet. Click &quot;+ Create Chatbot&quot; to get started!</p></Card>;
  }

  return (
    <ListGrid>
      {chatbots.map(chatbot => (
        <StyledChatbotCard key={chatbot.chatbot_id}>
          {/* MODIFIED LINK for chatbot name */}
          <Link href={`/teacher-dashboard/chatbots/${chatbot.chatbot_id}/test-chat`} title={`Test chat with ${chatbot.name}`}>
            <h3>{chatbot.name}</h3>
          </Link>
          <p className="description">{chatbot.description || 'No description provided.'}</p>
          <div className="model-info">
            Model: {getModelDisplayName(chatbot.model)}
          </div>
          <div className="actions">
            <Button
              size="small"
              variant="outline"
              onClick={() => onEdit(chatbot.chatbot_id)}
              title="Edit chatbot configuration"
            >
              Configure
            </Button>
            <Button
                as={Link} 
                href={`/teacher-dashboard/chatbots/${chatbot.chatbot_id}/knowledge-base`}
                size="small"
                variant="outline"
                title="Manage knowledge base documents"
            >
                Knowledge
            </Button>
            <Button
                size="small"
                variant="danger"
                onClick={() => onDelete(chatbot.chatbot_id, chatbot.name)}
                title="Delete this chatbot"
            >
                Delete
            </Button>
          </div>
        </StyledChatbotCard>
      ))}
    </ListGrid>
  );
}