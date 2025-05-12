// src/app/teacher-dashboard/rooms/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled, { useTheme } from 'styled-components';
import { Button, Alert, Card } from '@/styles/StyledComponents';
import RoomList from '@/components/teacher/RoomList';
import RoomForm from '@/components/teacher/RoomForm';
import EditRoomModal from '@/components/teacher/EditRoomModal';
import type { Room as BaseRoom, Chatbot, TeacherRoom } from '@/types/database.types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageWrapper = styled.div``; // This can be a simple div or your main page layout container

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

// This ContentCard will wrap the main content (loading state or RoomList)
// and will receive the accent color.
const ContentCard = styled(Card)`
  /* Base Card styles are inherited. 
     The $accentColor prop passed to it will be handled by the base Card definition 
     in StyledComponents.ts (e.g., for border-top). 
  */
`;

export default function ManageRoomsPage() {
  const [rooms, setRooms] = useState<TeacherRoom[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<BaseRoom | null>(null);
  const theme = useTheme(); // To access theme.colors for the accent

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

  const handleDeleteRoom = async (room: BaseRoom) => {
     if (window.confirm(`Are you sure you want to delete room "${room.room_name}"? This will also delete associated student memberships and chat history.`)) {
        setIsLoading(true); // Indicate general loading for the page during delete
        setError(null);
        try {
            const response = await fetch(`/api/teacher/rooms/${room.room_id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errData = await response.json().catch(()=>({ error: 'Failed to parse delete error response' }));
                throw new Error(errData.error || 'Failed to delete room');
            }
            // Success, re-fetch data to update the list
            // No need for alert here if fetchData updates UI correctly
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete room.');
        } finally {
            fetchData(); // Always refetch data, isLoading will be handled by fetchData
        }
    }
  };

  return (
    <PageWrapper>
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
      
      {/* Informational alert if no chatbots exist, shown only when not loading */}
      {chatbots.length === 0 && !isLoading && !error && ( // Also check for no error
        <Alert variant='info' style={{marginBottom: '16px'}}>
            You need to create at least one chatbot before you can create a classroom room.
        </Alert>
      )}

      {/* Display error if any */}
      {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}

      {/* Main content area with accent color */}
      <ContentCard $accentColor={theme.colors.blue} $accentSide="top">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <LoadingSpinner /> Loading rooms...
          </div>
        ) : error ? null : ( // If there's an error, the Alert above handles it, don't render RoomList
          <RoomList
            rooms={rooms}
            onUpdate={fetchData} 
            onEditRoom={setEditingRoom} 
            onDeleteRoom={handleDeleteRoom}
            // No accentColor prop needed for RoomList itself now
          />
        )}
      </ContentCard>

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