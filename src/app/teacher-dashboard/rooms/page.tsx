// src/app/teacher-dashboard/rooms/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from '@/components/shared/PageStructure';
import { Alert } from '@/styles/StyledComponents';
import { ModernRoomsList } from '@/components/teacher/ModernRoomsList';
import { Button } from '@/components/ui';
import RoomForm from '@/components/teacher/RoomForm';
import EditRoomModal from '@/components/teacher/EditRoomModal';
import ArchivePanel from '@/components/teacher/ArchivePanel';
import { FullPageLoader } from '@/components/shared/AnimatedLoader';
import type { Room as BaseRoom, Chatbot, TeacherRoom } from '@/types/database.types';
import { FiArchive } from 'react-icons/fi';


const ArchiveButton = styled(Button)`
  position: fixed;
  bottom: 40px;
  right: 40px;
  z-index: 100;
  box-shadow: 0 10px 40px rgba(152, 93, 215, 0.3);
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    bottom: 30px;
    right: 30px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    bottom: 20px;
    right: 20px;
  }
`;

// Styled components for DeleteModal
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
`;

const ModalContent = styled(motion.div)`
  width: 100%;
  max-width: 450px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
`;

const ModalTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text};
`;

const ModalText = styled.p`
  margin: 0 0 24px 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 16px;
  line-height: 1.5;
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
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <ModalContent
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalTitle>Delete {itemType}</ModalTitle>
            <ModalText>
              Are you sure you want to delete the {itemType.toLowerCase()} &quot;
              <strong>{itemName}</strong>
              &quot;? This action cannot be undone and may affect associated data (e.g., student memberships, chat history).
            </ModalText>
            <ModalActions>
              <Button variant="ghost" onClick={onCancel} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                 variant="danger"
                 onClick={onConfirm}
                 disabled={isDeleting}
                 loading={isDeleting}
              >
                {isDeleting ? 'Deleting...' : `Yes, Delete ${itemType}`}
              </Button>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
}


export default function ManageRoomsPage() {
  const [rooms, setRooms] = useState<TeacherRoom[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<BaseRoom | null>(null);
  const [showArchivedRooms, setShowArchivedRooms] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'Room';
    id: string | null;
    name: string;
  }>({ isOpen: false, type: 'Room', id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [archiveModal, setArchiveModal] = useState<{
    isOpen: boolean;
    id: string | null;
    name: string;
  }>({ isOpen: false, id: null, name: '' });
  const [isArchiving, setIsArchiving] = useState(false);

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
  
  const openArchiveModal = (room: BaseRoom) => {
    setArchiveModal({ isOpen: true, id: room.room_id, name: room.room_name });
  };
  
  const closeArchiveModal = () => {
    setArchiveModal({ isOpen: false, id: null, name: '' });
  };
  
  const handleArchiveRoom = async () => {
    if (!archiveModal.id) return;
    
    setIsArchiving(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/teacher/rooms/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomId: archiveModal.id,
          archive: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to archive room`);
      }
      
      console.log(`Room ${archiveModal.id} archived successfully.`);
      closeArchiveModal();
      fetchData();
    } catch (error) {
      console.error(`Error archiving Room:`, error);
      setError(error instanceof Error ? error.message : `Failed to archive Room.`);
    } finally {
      setIsArchiving(false);
    }
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


  if (isLoading) {
    return <FullPageLoader message="Loading your classrooms..." variant="dots" />;
  }

  return (
    <PageWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
        {chatbots.length === 0 && !error && (
          <Alert variant='info' style={{marginBottom: '24px'}}>
              You need to create at least one chatbot before you can create a classroom room.
          </Alert>
        )}

        {error && <Alert variant="error" style={{ marginBottom: '24px' }}>{error}</Alert>}

        <ModernRoomsList
          rooms={rooms}
          onCreateRoom={() => setShowRoomForm(true)}
          onEditRoom={handleEditRoom}
          onDeleteRoom={openDeleteModal}
          onArchiveRoom={openArchiveModal}
          canCreateRoom={chatbots.length > 0}
        />
        
        <AnimatePresence>
          {!showArchivedRooms && (
            <ArchiveButton
              as={motion.button}
              variant="secondary"
              size="large"
              onClick={() => setShowArchivedRooms(true)}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiArchive />
              View Archive
            </ArchiveButton>
          )}
        </AnimatePresence>
        
        {showArchivedRooms && (
          <ArchivePanel 
            type="rooms"
            onItemRestored={fetchData}
          />
        )}
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
      
      {/* Archive Modal */}
      <AnimatePresence>
        {archiveModal.isOpen && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeArchiveModal}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalTitle>Archive Room</ModalTitle>
              <ModalText>
                Are you sure you want to archive the room &quot;
                <strong>{archiveModal.name}</strong>
                &quot;? The room will still be accessible but won't appear in your active rooms list.
              </ModalText>
              <ModalActions>
                <Button variant="ghost" onClick={closeArchiveModal} disabled={isArchiving}>
                  Cancel
                </Button>
                <Button
                   variant="secondary"
                   onClick={handleArchiveRoom}
                   disabled={isArchiving}
                   loading={isArchiving}
                >
                  {isArchiving ? 'Archiving...' : 'Archive Room'}
                </Button>
              </ModalActions>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}