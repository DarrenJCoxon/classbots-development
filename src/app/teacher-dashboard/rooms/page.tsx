// src/app/teacher-dashboard/rooms/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
// import { useRouter } from 'next/navigation'; // << REMOVED UNUSED IMPORT
import { Button, Alert, Card } from '@/styles/StyledComponents';
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

export default function ManageRoomsPage() {
  const [rooms, setRooms] = useState<TeacherRoom[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<BaseRoom | null>(null);
  // const router = useRouter(); // << REMOVED UNUSED VARIABLE

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [roomsResponse, chatbotsResponse] = await Promise.all([
        fetch('/api/teacher/rooms'),
        fetch('/api/teacher/chatbots') 
      ]);

      if (!roomsResponse.ok) {
        const errData = await roomsResponse.json().catch(()=>({}));
        throw new Error(errData.error || `Failed to fetch rooms (status ${roomsResponse.status})`);
      }
      if (!chatbotsResponse.ok) {
        const errData = await chatbotsResponse.json().catch(()=>({}));
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

  const handleDeleteRoom = async (room: BaseRoom) => {
     if (window.confirm(`Are you sure you want to delete room "${room.room_name}"? This will also delete associated student memberships and chat history.`)) {
        try {
            const response = await fetch(`/api/teacher/rooms/${room.room_id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errData = await response.json().catch(()=>({}));
                throw new Error(errData.error || 'Failed to delete room');
            }
            fetchData(); 
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete room.');
        }
    }
  };

  return (
    <PageWrapper>
      <PageHeader>
        <Title>Classroom Rooms</Title>
        <Button 
          onClick={() => setShowRoomForm(true)}
          disabled={chatbots.length === 0}
          title={chatbots.length === 0 ? "Create a chatbot before creating a room" : "Create New Room"}
        >
          + Create New Room
        </Button>
      </PageHeader>
      {chatbots.length === 0 && !isLoading && (
        <Alert variant='info' style={{marginBottom: '16px'}}>
            You need to create at least one chatbot before you can create a classroom room.
        </Alert>
      )}

      {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}

      {isLoading ? (
        <Card style={{ textAlign: 'center', padding: '40px' }}><LoadingSpinner /> Loading rooms...</Card>
      ) : (
        <RoomList
          rooms={rooms}
          onUpdate={fetchData} 
          onEditRoom={setEditingRoom} 
          onDeleteRoom={handleDeleteRoom}
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
          onClose={() => setEditingRoom(null)}
          onSuccess={handleRoomCreatedOrUpdated}
        />
      )}
    </PageWrapper>
  );
}