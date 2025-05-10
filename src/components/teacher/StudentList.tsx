// src/components/teacher/StudentList.tsx
'use client';

import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { Card, Alert, Button } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Import a spinner

const ListContainer = styled(Card)`
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h3`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none; 
  }
`;

const TableHeader = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.875rem;
`;

const TableCell = styled.td`
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const LoadingState = styled(EmptyState)` // Reuse EmptyState style for consistency
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({ theme }) => theme.spacing.sm};
`;


const MobileList = styled.div`
  display: none;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: block;
  }
`;

const MobileCard = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const MobileHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const StudentName = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const MobileDetails = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 0.875rem;
  
  .label {
    color: ${({ theme }) => theme.colors.textMuted};
    margin-right: ${({ theme }) => theme.spacing.md};
  }
  
  .value {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const MobileActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

interface Student {
  user_id: string;
  name: string;
  email: string;
  joined_at: string | null;
  // message_count: number; // Removed as API doesn't provide it yet
  // last_activity: string | null; // Removed
}

interface StudentListProps {
  roomId: string;
}

export default function StudentList({ roomId }: StudentListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchStudents = useCallback(async () => {
    console.log(`[StudentList] Fetching students for roomId: ${roomId}`);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/teacher/students?roomId=${roomId}`);
      
      if (!response.ok) {
        let errorMessage = `Failed to fetch students (status ${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Failed to parse error JSON
        }
        console.error(`[StudentList] API error: ${errorMessage}`);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('[StudentList] Students data received:', data);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[StudentList] Catch block error fetching students:', err);
      setError(err instanceof Error ? err.message : 'Could not load student data.');
      setStudents([]); // Clear students on error
    } finally {
      console.log('[StudentList] Setting loading to false.');
      setLoading(false);
    }
  }, [roomId]); // roomId is the dependency

  useEffect(() => {
    if (roomId) { // Only fetch if roomId is available
        fetchStudents();
    } else {
        console.warn("[StudentList] RoomId is missing, not fetching students.");
        setLoading(false); // Don't hang in loading state if no roomId
    }
  }, [roomId, fetchStudents]); // fetchStudents is stable due to useCallback

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString();
    } catch {
        return 'Invalid Date';
    }
  };

  const handleViewChats = (studentId: string) => {
    router.push(`/room/${roomId}/student/${studentId}`);
  };

  if (loading) {
    return (
      <ListContainer>
        <Title>Students</Title>
        <LoadingState><LoadingSpinner size="small" /> Loading student data...</LoadingState>
      </ListContainer>
    );
  }

  // Error display takes precedence over empty state if an error occurred
  if (error) {
    return (
      <ListContainer>
        <Title>Students</Title>
        <Alert variant="error">
          Error: {error}
          <Button size="small" onClick={fetchStudents} style={{ marginLeft: '10px' }}>
            Retry
          </Button>
        </Alert>
      </ListContainer>
    );
  }

  if (students.length === 0) {
    return (
      <ListContainer>
        <Title>Students</Title>
        <EmptyState>
          <p>No students have joined this room yet, or data could not be loaded.</p>
          <Button size="small" onClick={fetchStudents} style={{ marginTop: '10px' }}>
            Refresh List
          </Button>
        </EmptyState>
      </ListContainer>
    );
  }

  return (
    <ListContainer>
      <Title>Students ({students.length})</Title>
      
      <Table>
        {/* ... (thead remains the same) ... */}
        <thead>
          <tr>
            <TableHeader>Name</TableHeader>
            <TableHeader>Email</TableHeader>
            <TableHeader>Joined</TableHeader>
            <TableHeader>Actions</TableHeader>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.user_id}>
              <TableCell>{student.name}</TableCell>
              <TableCell>{student.email}</TableCell>
              <TableCell>{formatDate(student.joined_at)}</TableCell>
              <TableCell>
                <Button
                  size="small"
                  onClick={() => handleViewChats(student.user_id)}
                >
                  View Chats
                </Button>
              </TableCell>
            </tr>
          ))}
        </tbody>
      </Table>
      
      <MobileList>
        {students.map((student) => (
          <MobileCard key={student.user_id}>
            <MobileHeader>
              <StudentName>{student.name}</StudentName>
            </MobileHeader>
            <MobileDetails>
              <span className="label">Email:</span>
              <span className="value">{student.email}</span>
              <span className="label">Joined:</span>
              <span className="value">{formatDate(student.joined_at)}</span>
            </MobileDetails>
            <MobileActions>
              <Button
                size="small"
                onClick={() => handleViewChats(student.user_id)}
                style={{ width: '100%' }}
              >
                View Chats
              </Button>
            </MobileActions>
          </MobileCard>
        ))}
      </MobileList>
    </ListContainer>
  );
}