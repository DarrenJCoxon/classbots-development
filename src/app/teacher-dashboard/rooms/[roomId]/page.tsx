// src/app/teacher-dashboard/rooms/[roomId]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Card, Button, Alert, Badge } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { Room, Chatbot, Profile } from '@/types/database.types'; // Base types

// --- Data Structure for the Page State ---
interface StudentInRoom extends Pick<Profile, 'user_id' | 'full_name' | 'email'> {
  joined_at: string;
}

interface RoomDetailsData {
  room: Room;
  chatbots: Pick<Chatbot, 'chatbot_id' | 'name' | 'description' | 'bot_type'>[];
  students: StudentInRoom[];
}

// --- Styled Components ---
const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.lg} 0;
  min-height: 100vh;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md} 0;
  }
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
`;

const RoomInfo = styled.div`
  h1 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: 2rem;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 1.5rem;
    }
  }
  
  .room-code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
    margin-top: ${({ theme }) => theme.spacing.xs};
    font-size: 1.1rem;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 1rem;
    }
  }
`;

const BackButton = styled(Button)`
  // No specific styles needed if general Button styling is sufficient
`;

const Section = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.5rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

// Chatbots Section
const ChatbotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const ChatbotCard = styled(Card)`
  h3 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    font-size: 1.2rem;
  }
  p {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.9rem;
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    min-height: 40px; /* Ensure some consistent height */
  }
  .bot-type {
    font-size: 0.8rem;
    font-style: italic;
  }
`;

// Students Section
const StudentListTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: ${({ theme }) => theme.spacing.md};
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  th {
    color: ${({ theme }) => theme.colors.textLight};
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  // Styled Link for student names in table
  td a { // Target <a> rendered by <Link>
    color: ${({ theme }) => theme.colors.text};
    text-decoration: none;
    font-weight: 500;
    &:hover {
      color: ${({ theme }) => theme.colors.primary};
      text-decoration: underline;
    }
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none; // Hide table on smaller screens
  }
`;

const StudentListMobile = styled.div`
  display: none;
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: block; // Show cards on smaller screens
  }
`;

const StudentCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};

  .student-name-link { // Use a class for the Link component itself
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    display: block;
    text-decoration: none;
     &:hover {
        text-decoration: underline;
     }
  }
  .student-email, .joined-at {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.textMuted};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
  }
`;


const EmptyStateText = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => theme.spacing.lg} 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  gap: ${({ theme }) => theme.spacing.md};
`;

export default function TeacherRoomDetailPage() {
  const [roomDetails, setRoomDetails] = useState<RoomDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;

  const fetchRoomDetails = useCallback(async () => {
    if (!roomId) {
      setError("Room ID not found in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/teacher/room-details?roomId=${roomId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch room details (status ${response.status})`);
      }
      const data: RoomDetailsData = await response.json();
      setRoomDetails(data);
    } catch (err) {
      console.error("Error fetching room details:", err);
      setError(err instanceof Error ? err.message : "Could not load room details.");
      setRoomDetails(null);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoomDetails();
  }, [fetchRoomDetails]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <Container>
          <LoadingContainer>
            <LoadingSpinner size="large" />
            <p>Loading room details...</p>
          </LoadingContainer>
        </Container>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <Container>
          <Alert variant="error">{error}</Alert>
          <Button onClick={() => router.push('/teacher-dashboard/rooms')} style={{ marginTop: '16px' }}>
            Back to Rooms
          </Button>
        </Container>
      </PageWrapper>
    );
  }

  if (!roomDetails) {
    return (
      <PageWrapper>
        <Container>
          <Alert variant="info">Room details not found.</Alert>
           <Button onClick={() => router.push('/teacher-dashboard/rooms')} style={{ marginTop: '16px' }}>
            Back to Rooms
          </Button>
        </Container>
      </PageWrapper>
    );
  }

  const { room, chatbots, students } = roomDetails;

  return (
    <PageWrapper>
      <Container>
        <Header>
          <RoomInfo>
            <h1>{room.room_name}</h1>
            <p className="room-code">Room Code: {room.room_code}</p>
          </RoomInfo>
          <BackButton 
            variant="outline"
            onClick={() => router.push('/teacher-dashboard/rooms')}
          >
            ← All Rooms
          </BackButton>
        </Header>

        <Section>
          <SectionTitle>Assigned Chatbots ({chatbots.length})</SectionTitle>
          {chatbots.length > 0 ? (
            <ChatbotGrid>
              {chatbots.map(bot => (
                <ChatbotCard key={bot.chatbot_id}>
                  <h3>{bot.name}</h3>
                  <p>{bot.description || 'No description provided.'}</p>
                  <Badge variant={bot.bot_type === 'assessment' ? 'warning' : 'default'}>
                    Type: {bot.bot_type || 'Learning'}
                  </Badge>
                </ChatbotCard>
              ))}
            </ChatbotGrid>
          ) : (
            <EmptyStateText>No chatbots are currently assigned to this room.</EmptyStateText>
          )}
        </Section>

        <Section>
          <SectionTitle>Enrolled Students ({students.length})</SectionTitle>
          {students.length > 0 ? (
            <>
              <StudentListTable>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.user_id}>
                      <td>
                        {/* Corrected Link usage: No <a> child */}
                        <Link href={`/teacher-dashboard/rooms/${roomId}/students/${student.user_id}`}>
                           {student.full_name}
                        </Link>
                      </td>
                      <td>{student.email}</td>
                      <td>{formatDate(student.joined_at)}</td>
                      <td>
                        <Button 
                          size="small" 
                          as={Link} 
                          href={`/teacher-dashboard/rooms/${roomId}/students/${student.user_id}`}
                          variant="outline"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </StudentListTable>

              <StudentListMobile>
                {students.map(student => (
                  <StudentCard key={`mobile-${student.user_id}`}>
                    {/* Corrected Link usage: No <a> child */}
                    <Link href={`/teacher-dashboard/rooms/${roomId}/students/${student.user_id}`} className="student-name-link">
                        {student.full_name}
                    </Link>
                    <p className="student-email">{student.email}</p>
                    <p className="joined-at">Joined: {formatDate(student.joined_at)}</p>
                     <Button 
                        size="small" 
                        as={Link} 
                        href={`/teacher-dashboard/rooms/${roomId}/students/${student.user_id}`}
                        variant="outline"
                        style={{marginTop: '8px', width: '100%'}}
                      >
                        View Student Details
                      </Button>
                  </StudentCard>
                ))}
              </StudentListMobile>
            </>
          ) : (
            <EmptyStateText>No students have joined this room yet.</EmptyStateText>
          )}
        </Section>

      </Container>
    </PageWrapper>
  );
}