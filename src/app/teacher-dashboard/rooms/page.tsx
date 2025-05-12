// src/app/teacher-dashboard/rooms/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled, { useTheme } from 'styled-components';
// No longer need useRouter if not used directly on this page for navigation
// import { useRouter } from 'next/navigation';
import { Button, Alert, Card, Container } from '@/styles/StyledComponents';
import RoomList from '@/components/teacher/RoomList';
import RoomForm from '@/components/teacher/RoomForm';
import EditRoomModal from '@/components/teacher/EditRoomModal';
import type { Room as BaseRoom, Chatbot, TeacherRoom } from '@/types/database.types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageWrapper = styled.div``;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  font-size: 1.8rem;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

// Styled components for DeleteModal
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
  max-width: 450px;
  margin: 20px;
  position: relative;
  text-align: center;
  border-top: none !important;
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

interface DeleteModalProps {
  isOpen: boolean;
  itemType: 'Room';
  itemName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteModal({ isOpen, itemType, itemName, onConfirm, onCancel, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <ModalOverlay>
      <ModalContent>
        <ModalTitle>Delete {itemType}</ModalTitle>
        <ModalText>
          Are you sure you want to delete the {itemType.toLowerCase()} &quot;
          <strong>{itemName}</strong>
          &quot;? This action cannot be undone and may affect associated data (e.g., student memberships, chat history).
        </ModalText>
        <ModalActions>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
             variant="danger"
             onClick={onConfirm}
             disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : `Yes, Delete ${itemType}`}
          </Button>
        </ModalActions>
      </ModalContent>
    </ModalOverlay>
  );
}


export default function ManageRoomsPage() {
  const [rooms, setRooms] = useState<TeacherRoom[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<BaseRoom | null>(null);
  const theme = useTheme();
  // const router = useRouter(); // Removed if not used

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'Room';
    id: string | null;
    name: string;
  }>({ isOpen: false, type: 'Room', id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [roomsResponse, chatbotsResponse] = await Promise.all([
        fetch('/api/teacher/rooms'),
        fetch('/api/teacher/chatbots')
      ]);

      if (!roomsResponse.ok) {
        const errData = await roomsResponse.json().catch(()=>({error: `Failed to parse rooms error response (status ${roomsResponse.status})`}));
        throw new Error(errData.error || `Failed to fetch rooms (status ${roomsResponse.status})`);
      }
      if (!chatbotsResponse.ok) {
        const errData = await chatbotsResponse.json().catch(()=>({error: `Failed to parse chatbots error response (status ${chatbotsResponse.status})`}));
        throw new Error(errData.error || `Failed to fetch chatbots (status ${chatbotsResponse.status})`);
      }

      const roomsData: TeacherRoom[] = await roomsResponse.json();
      const chatbotsData: Chatbot[] = await chatbotsResponse.json();

      setRooms(roomsData);
      setChatbots(chatbotsData);
    } catch (err) {
      console.error("Error fetching page data:", err);
      setError(err instanceof Error ? err.message : 'Could not load data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRoomCreatedOrUpdated = () => {
    setShowRoomForm(false);
    setEditingRoom(null);
    fetchData();
  };

  const openDeleteModal = (room: BaseRoom) => {
    setDeleteModal({ isOpen: true, type: 'Room', id: room.room_id, name: room.room_name });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, type: 'Room', id: null, name: '' });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.id) return;

    setIsDeleting(true);
    setError(null);

    try {
        const response = await fetch(`/api/teacher/rooms/${deleteModal.id}`, { method: 'DELETE' });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to delete room`);
        }

        console.log(`Room ${deleteModal.id} deleted successfully.`);
        closeDeleteModal();
        fetchData();
    } catch (error) {
        console.error(`Error deleting Room:`, error);
        setError(error instanceof Error ? error.message : `Failed to delete Room.`);
    } finally {
        setIsDeleting(false);
    }
  };

  const handleEditRoom = (room: BaseRoom) => {
    setEditingRoom(room);
  };

  const handleCloseEditRoom = () => {
    setEditingRoom(null);
  };

  const handleRoomEditSuccess = () => {
    setEditingRoom(null);
    fetchData();
  };


  return (
    <PageWrapper>
      <Container>
        <PageHeader>
          <Title>Classroom Rooms</Title>
          <Button
            onClick={() => setShowRoomForm(true)}
            disabled={chatbots.length === 0 && !isLoading}
            title={chatbots.length === 0 && !isLoading ? "Create a chatbot before creating a room" : "Create New Room"}
          >
            + Create New Room
          </Button>
        </PageHeader>

        {chatbots.length === 0 && !isLoading && !error && (
          <Alert variant='info' style={{marginBottom: '16px'}}>
              You need to create at least one chatbot before you can create a classroom room.
          </Alert>
        )}

        {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}

        {isLoading ? (
          <Card style={{ textAlign: 'center', padding: '40px' }}>
            <LoadingSpinner /> Loading rooms...
          </Card>
        ) : error ? null : (
          <RoomList
            rooms={rooms}
            onUpdate={fetchData}
            onEditRoom={handleEditRoom}
            onDeleteRoom={openDeleteModal}
            // 👇 CORRECTED: Pass the blue (skolrCyan) color from the theme
            accentColor={theme.colors.blue}
          />
        )}
      </Container>

      {showRoomForm && (
        <RoomForm
          chatbots={chatbots}
          onClose={() => setShowRoomForm(false)}
          onSuccess={handleRoomCreatedOrUpdated}
        />
      )}

      {editingRoom && (
        <EditRoomModal
          room={editingRoom}
          chatbots={chatbots}
          onClose={handleCloseEditRoom}
          onSuccess={handleRoomEditSuccess}
        />
      )}

      <DeleteModal
        isOpen={deleteModal.isOpen}
        itemType={deleteModal.type}
        itemName={deleteModal.name}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        isDeleting={isDeleting}
      />
    </PageWrapper>
  );
}