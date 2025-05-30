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
import { ModernButton, IconButton } from '@/components/shared/ModernButton';;
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
  width: 100%;
  max-width: 100%;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 60px rgba(152, 93, 215, 0.2);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    &:hover {
      transform: none; /* Disable hover effects on mobile */
    }
    min-height: auto; /* Remove any minimum height */
  }
`;

const CardHeader = styled.div`
  padding: 20px 20px 16px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}10, 
    ${({ theme }) => theme.colors.magenta}05
  );
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  position: relative;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 16px;
    padding-right: 50px; /* Space for dropdown button */
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 12px;
    padding-right: 50px; /* Space for dropdown button */
  }
`;

const RoomTitle = styled.h3`
  margin: 0 0 6px 0;
  font-size: 18px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 16px;
    margin-bottom: 4px;
    gap: 8px;
    letter-spacing: 0.3px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 14px;
    margin-bottom: 0;
    gap: 6px;
    letter-spacing: 0;
  }
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
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 3px 8px;
    font-size: 10px;
  }
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
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none; /* Hide description on mobile */
  }
`;

const CardBody = styled.div`
  padding: 20px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 16px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 12px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    gap: 8px;
    margin-bottom: 12px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 6px;
    margin-bottom: 12px;
  }
`;

const StatItem = styled.div`
  text-align: center;
  padding: 10px;
  background: rgba(152, 93, 215, 0.05);
  border-radius: 10px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  min-width: 0;
  overflow: hidden;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 6px 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    border-radius: 8px;
  }
`;

const StatIcon = styled.div`
  width: 32px;
  height: 32px;
  margin: 0 auto 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}20, 
    ${({ theme }) => theme.colors.blue}20
  );
  border-radius: 50%;
  
  svg {
    width: 16px;
    height: 16px;
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
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  padding: 0 2px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 12px;
    margin-bottom: 0;
    font-weight: 600;
  }
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textLight};
  text-transform: uppercase;
  letter-spacing: 0.3px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 9px;
    letter-spacing: 0;
    line-height: 1;
  }
`;

const ChatbotsList = styled.div`
  margin-bottom: 12px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    margin-bottom: 8px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none; /* Hide chatbots list on mobile */
  }
`;

const ChatbotChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  margin: 0 6px 6px 0;
  background: rgba(76, 190, 243, 0.1);
  border: 1px solid rgba(76, 190, 243, 0.3);
  border-radius: 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.blue};
  font-weight: 500;
  
  svg {
    width: 12px;
    height: 12px;
    margin-right: 4px;
  }
`;

const CardFooter = styled.div`
  padding: 16px 20px;
  background: rgba(152, 93, 215, 0.03);
  border-top: 1px solid rgba(152, 93, 215, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 12px 16px;
    gap: 10px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 10px 12px;
    gap: 8px;
    flex-wrap: wrap;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    justify-content: space-between;
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

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none; /* Hide action buttons on mobile to keep it minimal */
  }
`;

const IconButtonStyled = styled(IconButton)`
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
  gap: 4px;
  padding: 6px 14px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  color: white;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateX(4px);
    box-shadow: 0 8px 24px rgba(152, 93, 215, 0.3);
  }
  
  svg {
    transition: transform 0.3s ease;
    width: 14px;
    height: 14px;
  }
  
  &:hover svg {
    transform: translateX(4px);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 6px 12px;
    font-size: 11px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 6px 12px;
    font-size: 11px;
    gap: 4px;
    border-radius: 6px;
    
    &:hover {
      transform: none;
    }
    
    svg {
      width: 12px;
      height: 12px;
    }
  }
`;

const ImportButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(152, 93, 215, 0.1);
  color: ${({ theme }) => theme.colors.primary};
  border: 1px solid rgba(152, 93, 215, 0.3);
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    background: rgba(152, 93, 215, 0.2);
    border-color: rgba(152, 93, 215, 0.5);
    transform: translateY(-2px);
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 6px 12px;
    font-size: 11px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 6px 12px;
    font-size: 11px;
    gap: 4px;
    
    &:hover {
      transform: none;
    }
    
    svg {
      width: 12px;
      height: 12px;
    }
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
  top: 12px;
  right: 12px;
  z-index: 10;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    top: 12px;
    right: 12px;
  }
`;

const DropdownButton = styled(IconButton)`
  padding: 6px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  
  &:hover {
    background: white;
  }
  
  svg {
    width: 16px;
    height: 16px;
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
    <>
    <RoomCardContainer
      as={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      variant="light"
    >
      <CardHeader>
        <DropdownContainer ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
          <DropdownButton
            $variant="ghost"
            $size="small"
            aria-label="Room options"
            onClick={() => {
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
        
        <ButtonGroup>
          <ImportButton onClick={() => setShowCsvUpload(true)}>
            <FiUpload />
            Import Students
          </ImportButton>
          
          <ViewButton href={`/teacher-dashboard/rooms/${room.room_id}`}>
            View Details
            <FiChevronRight />
          </ViewButton>
        </ButtonGroup>
      </CardFooter>
    </RoomCardContainer>
    
    {showCsvUpload && (
      <StudentCsvUpload
        roomId={room.room_id}
        roomName={room.room_name}
        onClose={() => setShowCsvUpload(false)}
      />
    )}
    </>
  );
};