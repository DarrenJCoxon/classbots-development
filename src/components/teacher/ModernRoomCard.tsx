// Modern room card component with glassmorphism
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, 
  FiMessageSquare, 
  FiSettings, 
  FiTrash2, 
  FiArchive,
  FiActivity,
  FiClock,
  FiChevronRight,
  FiBookOpen,
  FiMoreVertical,
  FiEdit,
  FiCopy,
  FiLink,
  FiUpload
} from 'react-icons/fi';
import { GlassCard } from '@/components/shared/GlassCard';
import { ModernButton } from '@/components/shared/ModernButton';
import Link from 'next/link';
import type { TeacherRoom } from '@/types/database.types';
import StudentCsvUpload from './StudentCsvUpload';

interface ModernRoomCardProps {
  room: TeacherRoom;
  onEdit: (room: TeacherRoom) => void;
  onDelete: (room: TeacherRoom) => void;
  onArchive: (room: TeacherRoom) => void;
}

const RoomCardContainer = styled(GlassCard)`
  padding: 0;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 60px rgba(152, 93, 215, 0.2);
  }
`;

const CardHeader = styled.div`
  padding: 24px 24px 20px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}10, 
    ${({ theme }) => theme.colors.magenta}05
  );
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
`;

const RoomTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 12px;
`;

const RoomCode = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  color: white;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
`;

const RoomDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 14px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const CardBody = styled.div`
  padding: 24px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  
  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

const StatItem = styled.div`
  text-align: center;
  padding: 12px;
  background: rgba(152, 93, 215, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(152, 93, 215, 0.1);
`;

const StatIcon = styled.div`
  width: 36px;
  height: 36px;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}20, 
    ${({ theme }) => theme.colors.blue}20
  );
  border-radius: 50%;
  
  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textLight};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ChatbotsList = styled.div`
  margin-bottom: 20px;
`;

const ChatbotChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  margin: 0 8px 8px 0;
  background: rgba(76, 190, 243, 0.1);
  border: 1px solid rgba(76, 190, 243, 0.3);
  border-radius: 20px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.blue};
  font-weight: 500;
  
  svg {
    width: 14px;
    height: 14px;
    margin-right: 4px;
  }
`;

const CardFooter = styled.div`
  padding: 20px 24px;
  background: rgba(152, 93, 215, 0.03);
  border-top: 1px solid rgba(152, 93, 215, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
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
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const IconButtonStyled = styled(ModernButton)`
  padding: 8px;
  border-radius: 8px;
  font-size: 18px;
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const ViewButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  color: white;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateX(4px);
    box-shadow: 0 8px 24px rgba(152, 93, 215, 0.3);
  }
  
  svg {
    transition: transform 0.3s ease;
  }
  
  &:hover svg {
    transform: translateX(4px);
  }
`;

const ActiveBadge = styled.div<{ $isActive: boolean }>`
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: ${({ $isActive, theme }) => 
    $isActive 
      ? `linear-gradient(135deg, ${theme.colors.blue}, ${theme.colors.primary})` 
      : `linear-gradient(135deg, ${theme.colors.pink}, ${theme.colors.magenta})`
  };
  color: white;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

// Dropdown styles
const DropdownContainer = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
`;

const DropdownButton = styled(ModernButton)`
  padding: 8px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  
  &:hover {
    background: white;
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const DropdownMenu = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(152, 93, 215, 0.1);
  z-index: 100;
  min-width: 200px;
  overflow: hidden;
`;

const DropdownItem = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.2s ease;
  text-align: left;
  
  &:hover {
    background: rgba(152, 93, 215, 0.05);
    color: ${({ theme }) => theme.colors.primary};
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const DropdownDivider = styled.div`
  height: 1px;
  background: rgba(152, 93, 215, 0.1);
  margin: 4px 0;
`;

export const ModernRoomCard: React.FC<ModernRoomCardProps> = ({ 
  room, 
  onEdit, 
  onDelete, 
  onArchive 
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Since TeacherRoom extends Room and doesn't have these fields, we'll use defaults
  // In a real app, you'd fetch this data from the API
  const studentCount = 0; // This would come from counting room memberships
  const chatbotCount = room.room_chatbots?.length || 0;
  const recentActivity = room.updated_at 
    ? new Date(room.updated_at).toLocaleDateString() 
    : 'No activity';
    
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
  
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.room_code);
      alert(`Room code "${room.room_code}" copied to clipboard!`);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Failed to copy room code:', error);
      alert('Failed to copy room code.');
    }
  };

  const generateJoinUrl = async () => {
    try {
      const joinLink = `${window.location.origin}/join-room?code=${room.room_code}`;
      await navigator.clipboard.writeText(joinLink);
      alert(`Student join URL copied to clipboard:\n${joinLink}`);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Error generating join link:', error);
      alert('Failed to generate join link.');
    }
  };

  return (
    <RoomCardContainer
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
            variant="ghost"
            size="small"
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
                  onEdit(room);
                  setIsDropdownOpen(false);
                }}>
                  <FiEdit />
                  Edit Room
                </DropdownItem>
                <DropdownItem onClick={copyRoomCode}>
                  <FiCopy />
                  Copy Room Code
                </DropdownItem>
                <DropdownItem onClick={generateJoinUrl}>
                  <FiLink />
                  Copy Join URL
                </DropdownItem>
                <DropdownItem onClick={() => {
                  setShowCsvUpload(true);
                  setIsDropdownOpen(false);
                }}>
                  <FiUpload />
                  Import Students
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem onClick={() => {
                  onArchive(room);
                  setIsDropdownOpen(false);
                }}>
                  <FiArchive />
                  Archive Room
                </DropdownItem>
                <DropdownItem onClick={() => {
                  onDelete(room);
                  setIsDropdownOpen(false);
                }}>
                  <FiTrash2 />
                  Delete Room
                </DropdownItem>
              </DropdownMenu>
            )}
          </AnimatePresence>
        </DropdownContainer>
        
        <RoomTitle>
          {room.room_name}
          <RoomCode>{room.room_code}</RoomCode>
        </RoomTitle>
        {room.description && (
          <RoomDescription>{room.description}</RoomDescription>
        )}
      </CardHeader>
      
      <CardBody>
        <StatsGrid>
          <StatItem>
            <StatIcon>
              <FiUsers />
            </StatIcon>
            <StatValue>{studentCount}</StatValue>
            <StatLabel>Students</StatLabel>
          </StatItem>
          
          <StatItem>
            <StatIcon>
              <FiMessageSquare />
            </StatIcon>
            <StatValue>{chatbotCount}</StatValue>
            <StatLabel>Chatbots</StatLabel>
          </StatItem>
          
          <StatItem>
            <StatIcon>
              <FiActivity />
            </StatIcon>
            <StatValue>{recentActivity}</StatValue>
            <StatLabel>Last Active</StatLabel>
          </StatItem>
        </StatsGrid>
        
        {room.room_chatbots && room.room_chatbots.length > 0 && (
          <ChatbotsList>
            {room.room_chatbots.map((rc, index) => (
              <ChatbotChip key={rc.chatbots?.chatbot_id || index}>
                <FiBookOpen />
                {rc.chatbots?.name || 'Unknown Chatbot'}
              </ChatbotChip>
            ))}
          </ChatbotsList>
        )}
      </CardBody>
      
      <CardFooter>
        <StatusBadge $isActive={room.is_active}>
          {room.is_active ? (
            <>
              <FiActivity />
              Active
            </>
          ) : (
            <>
              <FiClock />
              Inactive
            </>
          )}
        </StatusBadge>
        
        <ViewButton href={`/teacher-dashboard/rooms/${room.room_id}`}>
          View Details
          <FiChevronRight />
        </ViewButton>
      </CardFooter>
      
      {showCsvUpload && (
        <StudentCsvUpload
          roomId={room.room_id}
          roomName={room.room_name}
          onClose={() => setShowCsvUpload(false)}
        />
      )}
    </RoomCardContainer>
  );
};