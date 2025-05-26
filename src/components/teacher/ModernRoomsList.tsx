// Modern rooms list component with enhanced features
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiGrid, 
  FiList, 
  FiSearch, 
  FiFilter,
  FiPlus,
  FiActivity,
  FiUsers,
  FiMessageSquare,
  FiMoreVertical,
  FiEdit,
  FiTrash2,
  FiArchive,
  FiCopy,
  FiLink,
  FiUpload,
  FiChevronRight
} from 'react-icons/fi';
import { ModernRoomCard } from './ModernRoomCard';
import { ModernButton } from '@/components/shared/ModernButton';
import type { TeacherRoom } from '@/types/database.types';
import StudentCsvUpload from './StudentCsvUpload';
import Link from 'next/link';

interface ModernRoomsListProps {
  rooms: TeacherRoom[];
  onEditRoom: (room: TeacherRoom) => void;
  onDeleteRoom: (room: TeacherRoom) => void;
  onArchiveRoom: (room: TeacherRoom) => void;
  onCreateRoom: () => void;
  canCreateRoom: boolean;
}

const ListContainer = styled.div`
  width: 100%;
  overflow-x: hidden;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0 16px;
  }
`;

const CreateRoomButton = styled(ModernButton)`
  white-space: nowrap;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 10px 16px;
    font-size: 14px;
    
    svg {
      display: none; /* Hide icon on mobile to save space */
    }
  }
`;

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
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 28px;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
    justify-content: space-between;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 12px;
  }
`;

const SearchBar = styled.div`
  position: relative;
  width: 300px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
    order: 3;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
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
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none; /* Hide view toggle on mobile to save space */
  }
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

const StatsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
  
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
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textLight};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const RoomsGrid = styled.div<{ isGrid: boolean }>`
  display: grid;
  grid-template-columns: ${({ isGrid }) => 
    isGrid ? 'repeat(auto-fill, minmax(380px, 1fr))' : '1fr'
  };
  gap: 32px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: ${({ isGrid }) => 
      isGrid ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr'
    };
    gap: 24px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: 16px;
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

// List View Styles
const ListTable = styled.table`
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  overflow: hidden;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: linear-gradient(135deg, 
    rgba(152, 93, 215, 0.05), 
    rgba(200, 72, 175, 0.05)
  );
`;

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  transition: all 0.2s ease;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: rgba(152, 93, 215, 0.02);
  }
`;

const TableHeaderCell = styled.th`
  padding: 16px 20px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textLight};
`;

const TableCell = styled.td`
  padding: 20px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  vertical-align: middle;
`;

const RoomNameLink = styled(Link)`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const RoomCodeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}20, 
    ${({ theme }) => theme.colors.magenta}20
  );
  border: 1px solid ${({ theme }) => theme.colors.primary}30;
  color: ${({ theme }) => theme.colors.primary};
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  font-family: ${({ theme }) => theme.fonts.mono};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.primary}30, 
      ${({ theme }) => theme.colors.magenta}30
    );
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
`;

const ActionButtonsCell = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

// Dropdown Menu Styles
const DropdownContainer = styled.div`
  position: relative;
`;

const DropdownButton = styled(ModernButton)`
  padding: 8px;
  
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
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
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

// Dropdown menu component
const RoomDropdownMenu: React.FC<{
  room: TeacherRoom;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onImportStudents: () => void;
}> = ({ room, onEdit, onArchive, onDelete, onCopyCode, onCopyLink, onImportStudents }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  return (
    <DropdownContainer ref={dropdownRef}>
      <DropdownButton
        variant="ghost"
        size="small"
        onClick={() => setIsOpen(!isOpen)}
      >
        <FiMoreVertical />
      </DropdownButton>
      
      <AnimatePresence>
        {isOpen && (
          <DropdownMenu
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <DropdownItem onClick={onEdit}>
              <FiEdit />
              Edit Room
            </DropdownItem>
            <DropdownItem onClick={onCopyCode}>
              <FiCopy />
              Copy Room Code
            </DropdownItem>
            <DropdownItem onClick={onCopyLink}>
              <FiLink />
              Copy Join URL
            </DropdownItem>
            <DropdownItem onClick={onImportStudents}>
              <FiUpload />
              Import Students
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={onArchive}>
              <FiArchive />
              Archive Room
            </DropdownItem>
            <DropdownItem onClick={onDelete}>
              <FiTrash2 />
              Delete Room
            </DropdownItem>
          </DropdownMenu>
        )}
      </AnimatePresence>
    </DropdownContainer>
  );
};

export const ModernRoomsList: React.FC<ModernRoomsListProps> = ({
  rooms,
  onEditRoom,
  onDeleteRoom,
  onArchiveRoom,
  onCreateRoom,
  canCreateRoom
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [csvUploadRoom, setCsvUploadRoom] = useState<TeacherRoom | null>(null);
  
  // Filter rooms based on search
  const filteredRooms = rooms.filter(room =>
    room.room_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.room_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (room.description && room.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Calculate stats
  const totalStudents = 0; // This would come from a separate API call in a real app
  const activeRooms = rooms.filter(room => room.is_active).length;
  const totalChatbots = rooms.reduce((sum, room) => 
    sum + (room.room_chatbots?.length || 0), 0
  );
  
  // Helper functions
  const copyRoomCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      alert(`Room code "${code}" copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy room code:', error);
      alert('Failed to copy room code.');
    }
  };

  const generateJoinUrl = async (roomCode: string) => {
    try {
      const joinLink = `${window.location.origin}/join-room?code=${roomCode}`;
      await navigator.clipboard.writeText(joinLink);
      alert(`Student join URL copied to clipboard:\n${joinLink}`);
    } catch (error) {
      console.error('Error generating join link:', error);
      alert('Failed to generate join link.');
    }
  };
  
  return (
    <ListContainer>
      <ListHeader>
        <Title>My Classrooms</Title>
        <HeaderActions>
          <SearchBar>
            <SearchIcon />
            <SearchInput
              type="text"
              placeholder="Search rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBar>
          
          <ViewToggle>
            <ToggleButton
              $isActive={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
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
          
          <CreateRoomButton
            variant="primary"
            size="medium"
            onClick={onCreateRoom}
            disabled={!canCreateRoom}
            title={!canCreateRoom ? "Create a chatbot before creating a room" : "Create New Room"}
          >
            <FiPlus />
            Create Room
          </CreateRoomButton>
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
            <StatValue>{activeRooms}</StatValue>
            <StatLabel>Active Rooms</StatLabel>
          </StatContent>
        </StatCard>
        
        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <StatIconWrapper color="#4CBEF3">
            <FiUsers />
          </StatIconWrapper>
          <StatContent>
            <StatValue>{totalStudents}</StatValue>
            <StatLabel>Total Students</StatLabel>
          </StatContent>
        </StatCard>
        
        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <StatIconWrapper color="#C848AF">
            <FiMessageSquare />
          </StatIconWrapper>
          <StatContent>
            <StatValue>{totalChatbots}</StatValue>
            <StatLabel>Active Chatbots</StatLabel>
          </StatContent>
        </StatCard>
      </StatsBar>
      
      {filteredRooms.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <FiPlus />
          </EmptyIcon>
          <EmptyTitle>
            {searchTerm ? 'No rooms found' : 'No rooms yet'}
          </EmptyTitle>
          <EmptyText>
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Create your first classroom to get started'
            }
          </EmptyText>
          {!searchTerm && (
            <ModernButton
              variant="primary"
              onClick={onCreateRoom}
              disabled={!canCreateRoom}
            >
              <FiPlus />
              Create Your First Room
            </ModernButton>
          )}
        </EmptyState>
      ) : viewMode === 'grid' ? (
        <AnimatePresence mode="wait">
          <RoomsGrid isGrid={true}>
            {filteredRooms.map((room, index) => (
              <motion.div
                key={room.room_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <ModernRoomCard
                  room={room}
                  onEdit={onEditRoom}
                  onDelete={onDeleteRoom}
                  onArchive={onArchiveRoom}
                />
              </motion.div>
            ))}
          </RoomsGrid>
        </AnimatePresence>
      ) : (
        <ListTable>
          <TableHeader>
            <tr>
              <TableHeaderCell>Room Name</TableHeaderCell>
              <TableHeaderCell>Room Code</TableHeaderCell>
              <TableHeaderCell>Chatbots</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Created</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </tr>
          </TableHeader>
          <tbody>
            {filteredRooms.map((room) => (
              <TableRow key={room.room_id}>
                <TableCell>
                  <RoomNameLink href={`/teacher-dashboard/rooms/${room.room_id}`}>
                    {room.room_name}
                    <FiChevronRight />
                  </RoomNameLink>
                </TableCell>
                <TableCell>
                  <RoomCodeBadge onClick={() => copyRoomCode(room.room_code)}>
                    {room.room_code}
                  </RoomCodeBadge>
                </TableCell>
                <TableCell>
                  {room.room_chatbots?.length || 0} Active
                </TableCell>
                <TableCell>
                  <StatusBadge $isActive={room.is_active}>
                    {room.is_active ? (
                      <>
                        <FiActivity />
                        Active
                      </>
                    ) : (
                      'Inactive'
                    )}
                  </StatusBadge>
                </TableCell>
                <TableCell>
                  {new Date(room.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <ActionButtonsCell>
                    <ModernButton
                      variant="ghost"
                      size="small"
                      onClick={() => onEditRoom(room)}
                    >
                      Edit
                    </ModernButton>
                    <ModernButton
                      variant="ghost"
                      size="small"
                      onClick={() => generateJoinUrl(room.room_code)}
                    >
                      Join URL
                    </ModernButton>
                    <ModernButton
                      variant="primary"
                      size="small"
                      onClick={() => setCsvUploadRoom(room)}
                    >
                      Import Students
                    </ModernButton>
                    <ModernButton
                      variant="ghost"
                      size="small"
                      onClick={() => onArchiveRoom(room)}
                    >
                      Archive
                    </ModernButton>
                    <ModernButton
                      variant="danger"
                      size="small"
                      onClick={() => onDeleteRoom(room)}
                    >
                      Delete
                    </ModernButton>
                  </ActionButtonsCell>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </ListTable>
      )}
      
      {csvUploadRoom && (
        <StudentCsvUpload
          roomId={csvUploadRoom.room_id}
          roomName={csvUploadRoom.room_name}
          onClose={() => setCsvUploadRoom(null)}
        />
      )}
    </ListContainer>
  );
};