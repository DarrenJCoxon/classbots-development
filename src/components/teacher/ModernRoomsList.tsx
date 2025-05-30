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
import { ModernButton, IconButton, ButtonGroup } from '@/components/shared/ModernButton';
import { PageWrapper, Container, Section, Grid, Flex, Stack, StatsCard, Card, CardBody, Heading, Text, PageTitle, SectionTitle, SearchInput, Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell, Badge, StatusBadge, CodeBadge } from '@/components/ui';;
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

// Custom styled components that aren't in the unified library yet
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

const SearchBarWrapper = styled.div`
  width: 300px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
    order: 3;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
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

const RoomsGrid = styled.div<{ $isGrid: boolean }>`
  display: grid;
  grid-template-columns: ${({ $isGrid }) => 
    $isGrid ? 'repeat(auto-fill, minmax(380px, 1fr))' : '1fr'
  };
  gap: 32px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: ${({ $isGrid }) => 
      $isGrid ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr'
    };
    gap: 20px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
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

const ActionButtonsCell = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

// Dropdown Menu Styles
const DropdownContainer = styled.div`
  position: relative;
`;

const DropdownButton = styled(IconButton)`
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
        $variant="ghost"
        $size="small"
        aria-label="Room options"
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
    <PageWrapper gradient>
      <Container size="large" spacing="xl">
        <Stack spacing="lg">
          <Flex justify="between" align="center" wrap gap="md">
            <PageTitle gradient>My Classrooms</PageTitle>
            <Flex gap="md" align="center" wrap>
              <SearchBarWrapper>
                <SearchInput
                  placeholder="Search rooms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </SearchBarWrapper>
              
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
                <FiPlus /> Create Room
              </CreateRoomButton>
            </Flex>
          </Flex>
          
          <Grid cols={3} gap="md">
            <StatsCard
              icon={<FiActivity />}
              title="Active Rooms"
              value={activeRooms}
              accentColor="primary"
            />
            
            <StatsCard
              icon={<FiUsers />}
              title="Total Students"
              value={totalStudents}
              accentColor="success"
            />
            
            <StatsCard
              icon={<FiMessageSquare />}
              title="Active Chatbots"
              value={totalChatbots}
              accentColor="secondary"
            />
          </Grid>
          
          {filteredRooms.length === 0 ? (
            <Card variant="minimal" hoverable={false}>
              <CardBody>
                <Stack spacing="md" align="center">
                  <EmptyIcon>
                    <FiPlus />
                  </EmptyIcon>
                  <Heading level="h3" noMargin>
                    {searchTerm ? 'No rooms found' : 'No rooms yet'}
                  </Heading>
                  <Text color="light" align="center">
                    {searchTerm 
                      ? 'Try adjusting your search terms'
                      : 'Create your first classroom to get started'
                    }
                  </Text>
                  {!searchTerm && (
                    <ModernButton
                      variant="primary"
                      onClick={onCreateRoom}
                      disabled={!canCreateRoom}
                    >
                      <FiPlus /> Create Your First Room
                    </ModernButton>
                  )}
                </Stack>
              </CardBody>
            </Card>
          ) : viewMode === 'grid' ? (
            <AnimatePresence mode="wait">
              <RoomsGrid $isGrid={true}>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Room Name</TableHeaderCell>
                  <TableHeaderCell>Room Code</TableHeaderCell>
                  <TableHeaderCell>Chatbots</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRooms.map((room) => (
                  <TableRow key={room.room_id}>
                    <TableCell>
                      <RoomNameLink href={`/teacher-dashboard/rooms/${room.room_id}`}>
                        {room.room_name}
                        <FiChevronRight />
                      </RoomNameLink>
                    </TableCell>
                    <TableCell>
                      <CodeBadge 
                        $variant="primary" 
                        $gradient
                        onClick={() => copyRoomCode(room.room_code)}
                      >
                        {room.room_code}
                      </CodeBadge>
                    </TableCell>
                    <TableCell>
                      {room.room_chatbots?.length || 0} Active
                    </TableCell>
                    <TableCell>
                      <StatusBadge 
                        isActive={room.is_active}
                        icon={room.is_active ? <FiActivity /> : null}
                      >
                        {room.is_active ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {new Date(room.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <ActionButtonsCell>
                        <ModernButton                           variant="ghost"
                          size="small"
                          onClick={() => onEditRoom(room)}
                        >
                          Edit
                        </ModernButton>
                        <ModernButton                           variant="ghost"
                          size="small"
                          onClick={() => generateJoinUrl(room.room_code)}
                        >
                          Join URL
                        </ModernButton>
                        <ModernButton                           variant="primary"
                          size="small"
                          onClick={() => setCsvUploadRoom(room)}
                        >
                          Import Students
                        </ModernButton>
                        <ModernButton                           variant="ghost"
                          size="small"
                          onClick={() => onArchiveRoom(room)}
                        >
                          Archive
                        </ModernButton>
                        <ModernButton                           variant="ghost"
                          size="small"
                          onClick={() => onDeleteRoom(room)}
                        >
                          Delete
                        </ModernButton>
                      </ActionButtonsCell>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {csvUploadRoom && (
            <StudentCsvUpload
              roomId={csvUploadRoom.room_id}
              roomName={csvUploadRoom.room_name}
              onClose={() => setCsvUploadRoom(null)}
            />
          )}
        </Stack>
      </Container>
    </PageWrapper>
  );
};