// src/components/teacher/RoomList.tsx
'use client';

import { useState } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { Card, Button, Badge } from '@/styles/StyledComponents';
import type { Room as BaseRoom } from '@/types/database.types'; // Import base Room type

// --- Styled Components (Keep as they are) ---
const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    /* Hide table view on smaller screens if mobile view is preferred */
    /* display: none; */
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 700px; /* Ensure minimum width for desktop view */
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
  vertical-align: top; /* Align content nicely */
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap; /* Allow buttons to wrap */
`;

const RoomCode = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  background-color: ${({ theme }) => theme.colors.backgroundDark}; /* Add background */
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  display: inline-block; /* Ensure padding works */

  &:hover {
    text-decoration: underline;
    background-color: ${({ theme }) => theme.colors.border}; /* Darker on hover */
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
  background: rgba(0, 0, 0, 0.6); /* Darker overlay */
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

// --- Mobile view styled components commented out since they're not used ---
/* 
const MobileCardList = styled.div`
  display: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    // Enable this block if you want to show cards instead of table on mobile
    // display: flex;
    // flex-direction: column;
    // gap: ${({ theme }) => theme.spacing.md};
  }
`;
// ... (MobileCard, RoomCardHeader, RoomCardTitle, RoomCardDetails, DetailItem, MobileActions) ...
// Add the full definitions for these if you plan to use the mobile card view.
*/

// --- Define the expected Room type WITH joined data ---
// This structure should match what the API returns from the .select() with joins
interface RoomWithChatbots extends BaseRoom {
  room_chatbots: { // The name of the joined relation
    chatbots: { // The nested object within the relation
      chatbot_id: string;
      name: string;
    } | null; // chatbots might be null if !inner fails or no match
  }[] | null; // The room_chatbots array itself might be null or empty
}

// --- Define Props for RoomList ---
interface RoomListProps {
  rooms: RoomWithChatbots[]; // Use the more specific type
  onUpdate: () => void;
  onEditRoom: (room: BaseRoom) => void; // Edit probably only needs base room info
  onDeleteRoom: (room: BaseRoom) => void; // Delete needs base room info
}

// --- Define Props for DeleteModal ---
interface DeleteModalProps {
  isOpen: boolean;
  roomName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean; // Added loading state
}

// --- Delete Modal Component ---
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
            style={{ backgroundColor: '#F87F7F', color: 'white' }} // Danger style
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

// --- Main RoomList Component ---
export default function RoomList({ rooms, onUpdate, onEditRoom, onDeleteRoom }: RoomListProps) {
  const [loadingState, setLoadingState] = useState<{ [key: string]: boolean }>({}); // Track loading per room for actions
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    roomId: string | null;
    roomName: string;
  }>({
    isOpen: false,
    roomId: null,
    roomName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false); // Loading state for delete confirmation

  // --- Action Handlers ---
  const toggleRoomStatus = async (roomId: string, currentStatus: boolean) => {
    setLoadingState(prev => ({ ...prev, [roomId]: true })); // Set loading for this specific room
    try {
      const response = await fetch(`/api/teacher/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (!response.ok) throw new Error('Failed to update room status');
      onUpdate(); // Refresh the list via the parent component
    } catch (error) {
      console.error('Error updating room status:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Could not update room status.'}`);
    } finally {
      setLoadingState(prev => ({ ...prev, [roomId]: false })); // Clear loading for this room
    }
  };

  const copyRoomCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      alert(`Room code "${code}" copied to clipboard!`); // Simple feedback
    } catch (error) {
      console.error('Failed to copy room code:', error);
      alert('Failed to copy room code.');
    }
  };

  const generateMagicLink = async (roomId: string, roomCode: string) => {
    try {
      // No need to fetch room again, code is already available
      const joinLink = `${window.location.origin}/join?code=${roomCode}`;
      await navigator.clipboard.writeText(joinLink);
      alert(`Student join link copied to clipboard:\n${joinLink}`);
    } catch (error) {
      console.error('Error generating join link:', error);
      alert('Failed to generate join link.');
    }
  };

  const openDeleteModal = (room: BaseRoom) => { // Expect BaseRoom here
    setDeleteModal({
      isOpen: true,
      roomId: room.room_id,
      roomName: room.room_name,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, roomId: null, roomName: '' });
  };

  const handleDeleteRoomConfirm = async () => {
    if (!deleteModal.roomId) return;

    setIsDeleting(true); // Set modal loading state
    try {
      // Call the prop passed from Dashboard which handles API call + refresh
      await onDeleteRoom({ room_id: deleteModal.roomId, room_name: deleteModal.roomName } as BaseRoom);
      closeDeleteModal(); // Close modal on success
    } catch (error) {
      // Error handling might be done in the parent, or show here
      console.error('Error during delete confirmation:', error);
      alert(`Failed to delete room: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Optionally keep modal open on error
    } finally {
      setIsDeleting(false); // Clear modal loading state
    }
  };

  // --- Helper to count chatbots (FIXED TYPE) ---
  const getChatbotCount = (room: RoomWithChatbots): number => {
    // Access the structure defined by the API query and RoomWithChatbots interface
    if (room.room_chatbots && Array.isArray(room.room_chatbots)) {
      // Filter out any null entries potentially caused by left join issues or empty relations
      return room.room_chatbots.filter(rc => rc && rc.chatbots).length;
    }
    return 0; // Default to 0 if the structure isn't as expected
  };
  // ----------------------------------------------


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
      <Card>
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
                const isLoading = loadingState[room.room_id] || false; // Check loading state for this room

                return (
                  <tr key={room.room_id}>
                    <Td>
                      <RoomNameLink href={`/room/${room.room_id}`} title={`Go to room: ${room.room_name}`}>
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
                          onClick={() => onEditRoom(room)} // Pass the base room object
                          disabled={isLoading}
                          title="Edit Chatbots for this Room"
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outline" // Changed variant
                          onClick={() => generateMagicLink(room.room_id, room.room_code)}
                          disabled={isLoading}
                          title="Copy Student Join Link"
                        >
                          Join Link
                        </Button>
                        <Button
                          size="small"
                          variant={room.is_active ? 'secondary' : 'primary'} // Use secondary for deactivation
                          onClick={() => toggleRoomStatus(room.room_id, room.is_active)}
                          disabled={isLoading}
                          title={room.is_active ? 'Deactivate Room' : 'Activate Room'}
                        >
                          {isLoading ? '...' : room.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="small"
                          variant="secondary" // Keep secondary, maybe add danger style later
                           style={{ backgroundColor: '#F87F7F', color: 'white', borderColor: '#F87F7F' }} // Danger style
                          onClick={() => openDeleteModal(room)} // Pass base room object
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

        {/* Mobile Card View (Commented out for now) */}
        {/*
        <MobileCardList>
          {rooms.map((room) => {
             const chatbotCount = getChatbotCount(room);
             const isLoading = loadingState[room.room_id] || false;
             return ( <MobileCard key={room.room_id}> ... </MobileCard> );
          })}
        </MobileCardList>
         */}
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        roomName={deleteModal.roomName}
        onConfirm={handleDeleteRoomConfirm}
        onCancel={closeDeleteModal}
        isDeleting={isDeleting} // Pass loading state
      />
    </>
  );
}