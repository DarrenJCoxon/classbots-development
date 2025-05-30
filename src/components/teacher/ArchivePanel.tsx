// src/components/teacher/ArchivePanel.tsx
'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Card, Alert } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { Room } from '@/types/database.types';

// Styled components
const ArchiveContainer = styled(Card)`
  margin-top: ${({ theme }) => theme.spacing.xl};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const ArchiveHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  
  h3 {
    margin: 0;
    font-size: 1.2rem;
  }
`;

const ArchiveList = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const ArchiveItem = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ theme }) => theme.colors.backgroundDark};
`;

const ItemInfo = styled.div`
  h4 {
    margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
    font-size: 1.1rem;
  }
  
  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.9rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

// Component interfaces
interface ArchivedRoom extends Room {
  // Add any additional properties needed for rooms
}

interface ArchivedStudent {
  user_id: string;
  full_name: string;
  email: string;
  joined_at: string;
  room_id: string;
  is_archived: boolean;
}

interface ArchivePanelProps {
  type: 'rooms' | 'students';
  roomId?: string; // Only needed for students
  onItemRestored: () => void;
}

export default function ArchivePanel({ type, roomId, onItemRestored }: ArchivePanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archivedRooms, setArchivedRooms] = useState<ArchivedRoom[]>([]);
  const [archivedStudents, setArchivedStudents] = useState<ArchivedStudent[]>([]);
  const [restoringIds, setRestoringIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchArchivedItems();
  }, []);

  const fetchArchivedItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (type === 'rooms') {
        // Fetch archived rooms
        const response = await fetch(`/api/teacher/rooms?archivedOnly=true`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch archived rooms (status ${response.status})`);
        }
        
        const data = await response.json();
        setArchivedRooms(data);
      } else if (type === 'students' && roomId) {
        // Fetch archived students for a specific room
        const response = await fetch(`/api/teacher/room-details?roomId=${roomId}&archivedOnly=true`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch archived students (status ${response.status})`);
        }
        
        const data = await response.json();
        const studentsWithRoomId = data.students.map((student: any) => ({
          ...student,
          room_id: roomId
        }));
        setArchivedStudents(studentsWithRoomId);
      }
    } catch (err) {
      console.error(`Error fetching archived ${type}:`, err);
      setError(err instanceof Error ? err.message : `Failed to fetch archived ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreRoom = async (roomId: string) => {
    setRestoringIds(prev => ({ ...prev, [roomId]: true }));
    
    try {
      const response = await fetch(`/api/teacher/rooms/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomId,
          archive: false // Set to false to restore
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to restore room (status ${response.status})`);
      }
      
      // Update local state
      setArchivedRooms(prev => prev.filter(room => room.room_id !== roomId));
      onItemRestored();
    } catch (err) {
      console.error('Error restoring room:', err);
      setError(err instanceof Error ? err.message : 'Failed to restore room');
    } finally {
      setRestoringIds(prev => {
        const newState = { ...prev };
        delete newState[roomId];
        return newState;
      });
    }
  };

  const handleRestoreStudent = async (studentId: string, roomId: string) => {
    setRestoringIds(prev => ({ ...prev, [studentId]: true }));
    
    try {
      const response = await fetch(`/api/teacher/students/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId,
          roomId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to restore student (status ${response.status})`);
      }
      
      // Update local state
      setArchivedStudents(prev => prev.filter(student => student.user_id !== studentId));
      onItemRestored();
    } catch (err) {
      console.error('Error restoring student:', err);
      setError(err instanceof Error ? err.message : 'Failed to restore student');
    } finally {
      setRestoringIds(prev => {
        const newState = { ...prev };
        delete newState[studentId];
        return newState;
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  const renderArchiveList = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <LoadingSpinner />
          <p>Loading archived {type}...</p>
        </div>
      );
    }

    if (error) {
      return <Alert variant="error">{error}</Alert>;
    }

    if (type === 'rooms' && archivedRooms.length === 0) {
      return <Alert variant="info">No archived rooms found.</Alert>;
    }

    if (type === 'students' && archivedStudents.length === 0) {
      return <Alert variant="info">No archived students found for this room.</Alert>;
    }

    if (type === 'rooms') {
      return (
        <ArchiveList>
          {archivedRooms.map(room => (
            <ArchiveItem key={room.room_id}>
              <ItemInfo>
                <h4>{room.room_name}</h4>
                <p>Code: {room.room_code} | Archived on: {formatDate(room.updated_at || room.created_at)}</p>
              </ItemInfo>
              <ActionButtons>
                {restoringIds[room.room_id] ? (
                  <ModernButton disabled size="small" variant="ghost">
                    <LoadingSpinner size="small" /> Restoring...
                  </ModernButton>
                ) : (
                  <ModernButton 
                    size="small" 
                    variant="ghost"
                    onClick={() => handleRestoreRoom(room.room_id)}
                  >
                    Restore Room
                  </ModernButton>
                )}
              </ActionButtons>
            </ArchiveItem>
          ))}
        </ArchiveList>
      );
    } else {
      return (
        <ArchiveList>
          {archivedStudents.map(student => (
            <ArchiveItem key={student.user_id}>
              <ItemInfo>
                <h4>{student.full_name}</h4>
                <p>{student.email} | Archived on: {formatDate(student.joined_at)}</p>
              </ItemInfo>
              <ActionButtons>
                {restoringIds[student.user_id] ? (
                  <ModernButton disabled size="small" variant="ghost">
                    <LoadingSpinner size="small" /> Restoring...
                  </ModernButton>
                ) : (
                  <ModernButton 
                    size="small" 
                    variant="ghost"
                    onClick={() => handleRestoreStudent(student.user_id, student.room_id)}
                  >
                    Restore Student
                  </ModernButton>
                )}
              </ActionButtons>
            </ArchiveItem>
          ))}
        </ArchiveList>
      );
    }
  };

  return (
    <ArchiveContainer>
      <ArchiveHeader>
        <h3>Archived {type === 'rooms' ? 'Rooms' : 'Students'}</h3>
        <ModernButton 
          size="small" 
          variant="ghost"
          onClick={fetchArchivedItems}
          disabled={loading}
        >
          {loading ? <LoadingSpinner size="small" /> : 'Refresh'}
        </ModernButton>
      </ArchiveHeader>
      {renderArchiveList()}
    </ArchiveContainer>
  );
}