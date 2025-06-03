// Modern Skolr card component with glassmorphism matching ModernRoomCard
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMessageSquare, 
  FiDatabase, 
  FiActivity,
  FiMoreVertical,
  FiEdit,
  FiPlay,
  FiTrash2,
  FiChevronRight,
  FiCpu,
  FiToggleLeft,
  FiToggleRight,
  FiBookOpen,
  FiClipboard,
  FiVideo,
  FiUsers
} from 'react-icons/fi';
import { GlassCard } from '@/components/shared/GlassCard';
import Link from 'next/link';
import type { Chatbot } from '@/types/database.types';
import { ModernButton } from '@/components/shared/ModernButton';

interface ModernChatbotCardProps {
  chatbot: Chatbot & { student_count?: number };
  onEdit: (chatbotId: string) => void;
  onDelete: (chatbotId: string, chatbotName: string) => void;
}

const ChatbotCardContainer = styled(GlassCard)`
  padding: 0;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  width: 100%;
  max-width: 100%;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 60px rgba(152, 93, 215, 0.2);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    &:hover {
      transform: none;
    }
    min-height: auto;
  }
`;

const CardHeader = styled.div`
  padding: 16px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}10, 
    ${({ theme }) => theme.colors.magenta}05
  );
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  position: relative;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 12px;
    padding-right: 50px;
  }
`;

const ChatbotTitle = styled.h3`
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.text};
  padding-right: 30px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 14px;
    margin-bottom: 0;
    letter-spacing: 0;
  }
`;

const ChatbotDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`;

const CardBody = styled.div`
  padding: 16px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 16px 26px 16px 16px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 12px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 0;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    gap: 6px;
    margin-bottom: 0;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const StatItem = styled.div`
  text-align: center;
  padding: 8px 4px;
  background: rgba(152, 93, 215, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  min-width: 0;
  overflow: hidden;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 6px 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    border-radius: 8px;
  }
`;

const StatIcon = styled.div`
  width: 28px;
  height: 28px;
  margin: 0 auto 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}20, 
    ${({ theme }) => theme.colors.blue}20
  );
  border-radius: 50%;
  
  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.primary};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 20px;
    height: 20px;
    margin: 0 0 2px 0;
    
    svg {
      width: 12px;
      height: 12px;
    }
  }
`;

const StatValue = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  padding: 0 2px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 11px;
    margin-bottom: 0;
    font-weight: 600;
  }
`;

const StatLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textLight};
  text-transform: uppercase;
  letter-spacing: 0.3px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 9px;
    letter-spacing: 0;
    line-height: 1.2;
  }
`;

const CardFooter = styled.div`
  padding: 12px 16px;
  background: rgba(152, 93, 215, 0.03);
  border-top: 1px solid rgba(152, 93, 215, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 10px 12px;
  }
`;

const StatusBadge = styled.span<{ $isActive: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: ${({ $isActive, theme }) => 
    $isActive 
      ? 'rgba(76, 190, 243, 0.1)' 
      : 'rgba(254, 67, 114, 0.1)'
  };
  color: ${({ $isActive, theme }) => 
    $isActive ? theme.colors.blue : theme.colors.pink
  };
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  
  svg {
    width: 14px;
    height: 14px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 4px 8px;
    font-size: 10px;
    gap: 2px;
    
    svg {
      width: 12px;
      height: 12px;
    }
  }
`;

// Removed TestButton - using LinkButton from UI components

// Dropdown styles
const DropdownContainer = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    top: 12px;
    right: 12px;
  }
`;

const DropdownButton = styled.button`
  padding: 6px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: white;
  }
  
  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.text};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 6px;
    
    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

const DropdownMenu = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(152, 93, 215, 0.1);
  z-index: 100;
  min-width: 180px;
  overflow: hidden;
`;

const DropdownItem = styled.button`
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.2s ease;
  text-align: left;
  
  &:hover {
    background: rgba(152, 93, 215, 0.05);
    color: ${({ theme }) => theme.colors.primary};
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const DropdownDivider = styled.div`
  height: 1px;
  background: rgba(152, 93, 215, 0.1);
  margin: 4px 0;
`;

const getModelDisplayName = (model: string | undefined) => {
  if (!model) return 'Default';
  const modelNames: Record<string, string> = {
    'x-ai/grok-3-mini-beta': 'Grok-3 Mini',
    'google/gemini-2.5-flash-preview': 'Gemini 2.5 Flash',
    'google/gemini-2.5-flash-preview-05-20': 'Gemini 2.5 Flash',
    'openai/gpt-4.1-mini': 'GPT-4.1 Mini',
    'nvidia/llama-3.1-nemotron-ultra-253b-v1': 'Llama-3.1',
    'deepseek/deepseek-r1-0528': 'DeepSeek-R1',
  };
  // For any model not in the map, format it nicely
  if (!modelNames[model]) {
    const cleanName = model?.split('/').pop() || model || 'Unknown';
    // Replace hyphens with spaces and capitalize properly
    return cleanName
      .replace(/-/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }
  return modelNames[model];
};

export const ModernChatbotCard: React.FC<ModernChatbotCardProps> = ({ 
  chatbot, 
  onEdit, 
  onDelete 
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
    
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <ChatbotCardContainer
      as={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      variant="light"
    >
      <CardHeader>
        <DropdownContainer ref={dropdownRef}>
          <DropdownButton
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
          >
            <FiMoreVertical />
          </DropdownButton>
          
          <AnimatePresence>
            {isDropdownOpen && (
              <DropdownMenu
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <DropdownItem onClick={() => {
                  onEdit(chatbot.chatbot_id);
                  setIsDropdownOpen(false);
                }}>
                  <FiEdit />
                  Edit Skolr
                </DropdownItem>
                <DropdownItem as={Link} href={`/teacher-dashboard/chatbots/${chatbot.chatbot_id}/knowledge-base`}>
                  <FiDatabase />
                  Manage Knowledge Base
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem onClick={() => {
                  onDelete(chatbot.chatbot_id, chatbot.name);
                  setIsDropdownOpen(false);
                }}>
                  <FiTrash2 />
                  Delete Skolr
                </DropdownItem>
              </DropdownMenu>
            )}
          </AnimatePresence>
        </DropdownContainer>
        
        <ChatbotTitle>
          {chatbot.name}
        </ChatbotTitle>
        {chatbot.description && (
          <ChatbotDescription>{chatbot.description}</ChatbotDescription>
        )}
      </CardHeader>
      
      <CardBody>
        <StatsGrid>
          <StatItem>
            <StatIcon>
              {chatbot.bot_type === 'reading_room' ? <FiBookOpen /> : 
               chatbot.bot_type === 'viewing_room' ? <FiVideo /> : 
               chatbot.bot_type === 'assessment' ? <FiClipboard /> : 
               <FiMessageSquare />}
            </StatIcon>
            <StatValue>{chatbot.bot_type === 'reading_room' ? 'Reading' : 
                       chatbot.bot_type === 'viewing_room' ? 'Viewing' : 
                       chatbot.bot_type === 'assessment' ? 'Assessment' : 
                       'Learning'}</StatValue>
            <StatLabel>Type</StatLabel>
          </StatItem>
          
          <StatItem>
            <StatIcon>
              <FiUsers />
            </StatIcon>
            <StatValue>{chatbot.student_count || 0}</StatValue>
            <StatLabel>Students</StatLabel>
          </StatItem>
          
          <StatItem>
            <StatIcon>
              {chatbot.enable_rag ? <FiToggleRight /> : <FiToggleLeft />}
            </StatIcon>
            <StatValue>{chatbot.enable_rag ? 'On' : 'Off'}</StatValue>
            <StatLabel>Knowledge</StatLabel>
          </StatItem>
        </StatsGrid>
      </CardBody>
      
      <CardFooter>
        <ModernButton 
          variant="primary"
          size="small"
          onClick={() => window.location.href = `/teacher-dashboard/chatbots/${chatbot.chatbot_id}/test-chat`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          Test Chat
          <FiChevronRight />
        </ModernButton>
      </CardFooter>
    </ChatbotCardContainer>
  );
};