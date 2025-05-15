// src/components/teacher/ChatbotList.tsx
'use client';

import Link from 'next/link';
import styled from 'styled-components'; // Removed useTheme as it's not directly used now
import { Card, Button } from '@/styles/StyledComponents'; 
import type { Chatbot } from '@/types/database.types';

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

  /* Optional: Apply a passed accent color to the top border */
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
    gap: ${({ theme }) => theme.spacing.md}; // Adjusted gap for two buttons
    margin-top: auto; 
    padding-top: ${({ theme }) => theme.spacing.md}; 
    flex-wrap: no-wrap; // Prevent wrapping if space allows for two buttons
    
    button { // Target button elements directly for sizing
        flex-grow: 1; 
        /* Each button can take up to 50% of the space minus gap */
        flex-basis: calc(50% - ${({ theme }) => `calc(${theme.spacing.md} / 2)`});
        max-width: calc(50% - ${({ theme }) => `calc(${theme.spacing.md} / 2)`});
        text-align: center; 

         @media (max-width: 380px) { // Stricter breakpoint for stacking two buttons
            flex-basis: 100%; 
            max-width: 100%;
            &:not(:last-child) {
              margin-bottom: ${({ theme }) => theme.spacing.sm}; // Add margin if they stack
            }
         }
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

interface ChatbotListProps {
  chatbots: Chatbot[];
  onEdit: (chatbotId: string) => void;
  onDelete: (chatbotId: string, chatbotName: string) => void;
}

export default function ChatbotList({ chatbots, onEdit, onDelete }: ChatbotListProps) {
  // const theme = useTheme(); // Not strictly needed if not applying accents directly here

  if (chatbots.length === 0) {
    return <Card><p>No chatbots created yet. Click &quot;+ Create Chatbot&quot; to get started!</p></Card>;
  }

  return (
    <ListGrid>
      {chatbots.map((chatbot) => { // Removed index as it wasn't used for key
        return (
          <StyledChatbotCard 
              key={chatbot.chatbot_id}
              // Example: if you wanted to cycle card accents:
              // $cardAccentColor={cardAccentColors[index % cardAccentColors.length]} 
          >
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
                title="Edit chatbot settings and knowledge base"
              >
                Edit {/* CHANGED from "Configure" */}
              </Button>
              {/* "Knowledge" Button has been REMOVED */}
              <Button
                  size="small"
                  variant="magenta" // Using magenta variant
                  onClick={() => onDelete(chatbot.chatbot_id, chatbot.name)}
                  title="Delete this chatbot"
              >
                  Delete
              </Button>
            </div>
          </StyledChatbotCard>
        );
      })}
    </ListGrid>
  );
}