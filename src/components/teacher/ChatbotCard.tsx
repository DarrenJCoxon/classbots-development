// Chatbot card component with dashboard styling
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Chatbot } from '@/types/database.types';
import { FiMessageSquare, FiMoreVertical, FiEdit, FiTrash2, FiPlay, FiDatabase } from 'react-icons/fi';
import { DashboardCard } from '@/components/shared/DashboardCard';
import { LinkButton, Button } from '@/components/ui/Button';

interface ChatbotCardProps {
  chatbot: Chatbot;
  onEdit: (chatbotId: string) => void;
  onDelete: (chatbotId: string, chatbotName: string) => void;
}

const CardWrapper = styled.div`
  position: relative;
`;

const CardActions = styled.div`
  position: absolute;
  bottom: 16px;
  left: 24px;
  right: 24px;
  display: flex;
  gap: 8px;
  
  /* Ensure buttons take up available space */
  > * {
    flex: 1;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    bottom: 12px;
    left: 20px;
    right: 20px;
    gap: 6px;
  }
`;

// Removed SubtleButton - using UI Button components

// Removed EditButton - using UI Button components

const OptionsButton = styled(motion.button)`
  position: absolute;
  top: 20px;
  right: 20px;
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textLight};
  border-radius: 8px;
  transition: all 0.2s ease;
  z-index: 20;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: ${({ theme }) => theme.colors.text};
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const DropdownMenu = styled(motion.div)`
  position: absolute;
  top: 56px;
  right: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 8px;
  min-width: 180px;
  z-index: 100;
`;

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  
  &:hover {
    background: ${({ theme }) => theme.colors.backgroundDark};
  }
  
  &.danger {
    color: ${({ theme }) => theme.colors.pink};
  }
  
  svg {
    width: 16px;
    height: 16px;
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

export const ChatbotCard: React.FC<ChatbotCardProps> = ({ 
  chatbot, 
  onEdit,
  onDelete
}) => {
  const router = useRouter();
  const [showMenu, setShowMenu] = React.useState(false);

  const handleCardClick = () => {
    router.push(`/teacher-dashboard/chatbots/${chatbot.chatbot_id}/test-chat`);
  };

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleMenuItemClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setShowMenu(false);
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMenu) {
        setShowMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  const ragEnabled = chatbot.enable_rag ? 'RAG Enabled' : 'Standard';
  const subtitle = `${getModelDisplayName(chatbot.model)} • ${ragEnabled}`;

  return (
    <CardWrapper>
      <DashboardCard
        title={chatbot.name}
        value={chatbot.description || 'No description'}
        subtitle={subtitle}
        icon={<FiMessageSquare />}
        variant="primary"
        onClick={handleCardClick}
        layout="compact"
        hasActions={true}
      />
      
      <CardActions onClick={(e) => e.stopPropagation()}>
        <LinkButton 
          href={`/teacher-dashboard/chatbots/${chatbot.chatbot_id}/test-chat`}
          variant="ghost"
          size="small"
          icon={<FiPlay />}
          fullWidth
        >
          Test
        </LinkButton>
        <Button 
          onClick={() => onEdit(chatbot.chatbot_id)}
          variant="ghost"
          size="small"
          icon={<FiEdit />}
          fullWidth
        >
          Edit
        </Button>
        {chatbot.enable_rag && (
          <LinkButton 
            href={`/teacher-dashboard/chatbots/${chatbot.chatbot_id}/knowledge-base`}
            variant="ghost"
            size="small"
            icon={<FiDatabase />}
            fullWidth
          >
            Knowledge
          </LinkButton>
        )}
      </CardActions>
      
      <OptionsButton 
        onClick={handleOptionsClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <FiMoreVertical />
      </OptionsButton>
      
      {showMenu && (
        <DropdownMenu
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <MenuItem 
            className="danger" 
            onClick={(e) => handleMenuItemClick(e, () => onDelete(chatbot.chatbot_id, chatbot.name))}
          >
            <FiTrash2 />
            Delete Chatbot
          </MenuItem>
        </DropdownMenu>
      )}
    </CardWrapper>
  );
};