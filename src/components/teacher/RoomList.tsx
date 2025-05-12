// src/components/teacher/RoomList.tsx
'use client';

import { useState } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { Card, Button, Badge } from '@/styles/StyledComponents';
import type { Room as BaseRoom } from '@/types/database.types'; // Import base Room type

// --- Styled Components ---
const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none; // Hide table on smaller screens
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
`;

const Th = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textLight};
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.875rem;
  letter-spacing: 0.05em;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  vertical-align: top;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const RoomCode = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  display: inline-block;

  &:hover {
    text-decoration: underline;
    background-color: ${({ theme }) => theme.colors.border};
  }
`;

const RoomNameLink = styled(Link)`
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-weight: 500;
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`;

const EmptyState = styled(Card)`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.textLight};

  h3 {
    margin-bottom: ${({ theme }) => theme.spacing.md};
    color: ${({ theme }) => theme.colors.text};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.xl};
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
`;

const ModalContent = styled(Card)`
  width: 100%;
  max-width: 400px;
  margin: 20px;
  position: relative;
  text-align: center;
`;

const ModalTitle = styled.h3`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
`;

const ModalText = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textLight};
`;

const ModalActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
`;

// --- Mobile view styled components ---
const MobileCardList = styled.div`
  display: none; // Hidden by default

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: flex; // Show on smaller screens
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
  }
`;

const MobileRoomCard = styled(Card)` // Renamed to avoid conflict
  padding: ${({ theme }) => theme.spacing.lg};
`;

const RoomCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start; /* Align items to start for better badge placement */
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const RoomCardTitle = styled(Link)` // Make it a link
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-weight: 600;
  font-size: 1.2rem;
  margin-right: ${({ theme }) => theme.spacing.sm}; // Space for badge

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const RoomCardDetails = styled.div`
  display: grid;
  grid-template-columns: auto 1fr; // Label and value
  gap: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 0.9rem;
`;

const DetailItem = styled.div`
  .label {
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: 500;
  }
  .value {
    color: ${({ theme }) => theme.colors.text};
    word-break: break-word; /* Prevent long codes from breaking layout */
  }
`;

const MobileActions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); // Responsive buttons
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;
// --- End Mobile view styled components ---


interface RoomWithChatbots extends BaseRoom {
  room_chatbots: {
    chatbots: {
      chatbot_id: string;
      name: string;
    } | null;
  }[] | null;
}

interface RoomListProps {
  rooms: RoomWithChatbots[];
  onUpdate: () => void;
  onEditRoom: (room: BaseRoom) => void;
  onDeleteRoom: (room: BaseRoom) => void;
}

interface DeleteModalProps {
  isOpen: boolean;
  roomName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteModal({ isOpen, roomName, onConfirm, onCancel, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null;
  return (
    <ModalOverlay>
      <ModalContent>
        <ModalTitle>Delete Room</ModalTitle>
        <ModalText>
          Are you sure you want to delete the room &quot;<strong>{roomName}</strong>&quot;? This action cannot be undone and will remove all student memberships and associated data.
        </ModalText>
        <ModalActions>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            style={{ backgroundColor: '#F87F7F', color: 'white' }}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete Room'}
          </Button>
        </ModalActions>
      </ModalContent>
    </ModalOverlay>
  );
}

export default function RoomList({ rooms, onUpdate, onEditRoom, onDeleteRoom }: RoomListProps) {
  const [loadingState, setLoadingState] = useState<{ [key: string]: boolean }>({});
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    roomId: string | null;
    roomName: string;
  }>({ isOpen: false, roomId: null, roomName: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleRoomStatus = async (roomId: string, currentStatus: boolean) => {
    setLoadingState(prev => ({ ...prev, [roomId]: true }));
    try {
      const response = await fetch(`/api/teacher/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (!response.ok) throw new Error('Failed to update room status');
      onUpdate();
    } catch (error) {
      console.error('Error updating room status:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Could not update room status.'}`);
    } finally {
      setLoadingState(prev => ({ ...prev, [roomId]: false }));
    }
  };

  const copyRoomCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      alert(`Room code "${code}" copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy room code:', error);
      alert('Failed to copy room code.');
    }
  };

  const generateMagicLink = async (roomId: string, roomCode: string) => {
    try {
      const joinLink = `${window.location.origin}/join?code=${roomCode}`;
      await navigator.clipboard.writeText(joinLink);
      alert(`Student join link copied to clipboard:\n${joinLink}`);
    } catch (error) {
      console.error('Error generating join link:', error);
      alert('Failed to generate join link.');
    }
  };

  const openDeleteModal = (room: BaseRoom) => {
    setDeleteModal({ isOpen: true, roomId: room.room_id, roomName: room.room_name });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, roomId: null, roomName: '' });
  };

  const handleDeleteRoomConfirm = async () => {
    if (!deleteModal.roomId) return;
    setIsDeleting(true);
    try {
      await onDeleteRoom({ room_id: deleteModal.roomId, room_name: deleteModal.roomName } as BaseRoom);
      closeDeleteModal();
    } catch (error) {
      console.error('Error during delete confirmation:', error);
      alert(`Failed to delete room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getChatbotCount = (room: RoomWithChatbots): number => {
    if (room.room_chatbots && Array.isArray(room.room_chatbots)) {
      return room.room_chatbots.filter(rc => rc && rc.chatbots).length;
    }
    return 0;
  };

  if (rooms.length === 0) {
    return (
      <EmptyState>
        <h3>No Rooms Created</h3>
        <p>Create your first classroom room to get started!</p>
      </EmptyState>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <TableContainer>
        <Table>
          <thead>
            <tr>
              <Th>Room Name</Th>
              <Th>Room Code</Th>
              <Th>Chatbots</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => {
              const chatbotCount = getChatbotCount(room);
              const isLoading = loadingState[room.room_id] || false;

              return (
                <tr key={room.room_id}>
                  <Td>
                    <RoomNameLink href={`/teacher-dashboard/rooms/${room.room_id}`} title={`View details for room: ${room.room_name}`}>
                      {room.room_name}
                    </RoomNameLink>
                  </Td>
                  <Td>
                    <RoomCode onClick={() => copyRoomCode(room.room_code)} title="Click to copy room code">
                      {room.room_code}
                    </RoomCode>
                  </Td>
                  <Td>
                    {chatbotCount > 0 ? `${chatbotCount} Attached` : 'None'}
                  </Td>
                  <Td>
                    <Badge variant={room.is_active ? 'success' : 'default'}>
                      {room.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td>
                    {new Date(room.created_at).toLocaleDateString()}
                  </Td>
                  <Td>
                    <ActionButtons>
                      <Button
                        size="small"
                        onClick={() => onEditRoom(room)}
                        disabled={isLoading}
                        title="Edit Chatbots for this Room"
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outline"
                        onClick={() => generateMagicLink(room.room_id, room.room_code)}
                        disabled={isLoading}
                        title="Copy Student Join Link"
                      >
                        Join Link
                      </Button>
                      <Button
                        size="small"
                        variant={room.is_active ? 'secondary' : 'primary'}
                        onClick={() => toggleRoomStatus(room.room_id, room.is_active)}
                        disabled={isLoading}
                        title={room.is_active ? 'Deactivate Room' : 'Activate Room'}
                      >
                        {isLoading ? '...' : room.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                         style={{ backgroundColor: '#F87F7F', color: 'white', borderColor: '#F87F7F' }}
                        onClick={() => openDeleteModal(room)}
                        disabled={isLoading}
                        title="Delete Room"
                      >
                        Delete
                      </Button>
                    </ActionButtons>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </TableContainer>

      {/* Mobile Card View */}
      <MobileCardList>
        {rooms.map((room) => {
          const chatbotCount = getChatbotCount(room);
          const isLoading = loadingState[room.room_id] || false;
          return (
            <MobileRoomCard key={`mobile-${room.room_id}`}>
              <RoomCardHeader>
                <RoomCardTitle href={`/teacher-dashboard/rooms/${room.room_id}`} title={`View details for room: ${room.room_name}`}>
                  {room.room_name}
                </RoomCardTitle>
                <Badge variant={room.is_active ? 'success' : 'default'}>
                  {room.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </RoomCardHeader>
              <RoomCardDetails>
                <DetailItem>
                  <span className="label">Code:</span>
                  <RoomCode className="value" onClick={() => copyRoomCode(room.room_code)} title="Click to copy room code">
                    {room.room_code}
                  </RoomCode>
                </DetailItem>
                <DetailItem>
                  <span className="label">Chatbots:</span>
                  <span className="value">{chatbotCount > 0 ? `${chatbotCount} Attached` : 'None'}</span>
                </DetailItem>
                <DetailItem>
                  <span className="label">Created:</span>
                  <span className="value">{new Date(room.created_at).toLocaleDateString()}</span>
                </DetailItem>
              </RoomCardDetails>
              <MobileActions>
                <Button
                  size="small"
                  onClick={() => onEditRoom(room)}
                  disabled={isLoading}
                  title="Edit Chatbots for this Room"
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  variant="outline"
                  onClick={() => generateMagicLink(room.room_id, room.room_code)}
                  disabled={isLoading}
                  title="Copy Student Join Link"
                >
                  Join Link
                </Button>
                <Button
                  size="small"
                  variant={room.is_active ? 'secondary' : 'primary'}
                  onClick={() => toggleRoomStatus(room.room_id, room.is_active)}
                  disabled={isLoading}
                  title={room.is_active ? 'Deactivate Room' : 'Activate Room'}
                >
                  {isLoading ? '...' : room.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                 <Button
                    size="small"
                    variant="secondary"
                    style={{ backgroundColor: '#F87F7F', color: 'white', borderColor: '#F87F7F' }} // Danger style
                    onClick={() => openDeleteModal(room)}
                    disabled={isLoading}
                    title="Delete Room"
                  >
                    Delete
                  </Button>
              </MobileActions>
            </MobileRoomCard>
          );
        })}
      </MobileCardList>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        roomName={deleteModal.roomName}
        onConfirm={handleDeleteRoomConfirm}
        onCancel={closeDeleteModal}
        isDeleting={isDeleting}
      />
    </>
  );
}