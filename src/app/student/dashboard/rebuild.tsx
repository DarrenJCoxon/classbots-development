// src/app/student/dashboard/rebuild.tsx
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container, Card, Button, Alert, Input } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
// createClient import removed as it's not used in this component

// Styled components for dashboard
const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.xl} 0;
  min-height: 100vh;
`;

const WelcomeHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  h1 {
    font-size: 2rem;
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
  }
  p {
    font-size: 1.1rem;
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const Section = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const JoinRoomSection = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  display: flex;
  flex-direction: column;
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const JoinRoomForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  width: 100%;
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const JoinRoomInput = styled(Input)`
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
  text-align: center;
  
  @media (min-width: 768px) {
    flex: 1;
    margin-right: ${({ theme }) => theme.spacing.md};
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const RoomCard = styled(Card)`
  display: flex;
  flex-direction: column;
  justify-content: space-between; 
  h3 {
    font-size: 1.25rem;
    color: ${({ theme }) => theme.colors.primaryDark};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
  }
  .room-code {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-family: ${({ theme }) => theme.fonts.mono};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }
  .chatbot-count {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
`;

const EmptyStateText = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => theme.spacing.lg} 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  gap: ${({ theme }) => theme.spacing.md};
`;

const AccountBanner = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  background-color: ${({ theme }) => theme.colors.primary}10;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
  
  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
  }
  
  strong {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const SuccessAccountBanner = styled(AccountBanner)`
  background-color: ${({ theme }) => theme.colors.green}10;
  border: 1px solid ${({ theme }) => theme.colors.green};
  
  strong {
    color: ${({ theme }) => theme.colors.green};
  }
`;

// Types for API responses
interface Room {
  room_id: string;
  room_name: string;
  room_code: string;
  is_active: boolean;
  created_at: string;
  teacher_id: string;
}

interface Chatbot {
  chatbot_id: string;
  name: string;
  bot_type: string;
}

interface RoomWithChatbots extends Room {
  chatbots: Chatbot[];
}

interface StudentProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  is_anonymous?: boolean;
  username?: string;
  pin_code?: string;
}

// Main dashboard component
export default function RebuiltStudentDashboard() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [rooms, setRooms] = useState<RoomWithChatbots[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [joinRoomError, setJoinRoomError] = useState<string | null>(null);
  const [joinRoomSuccess, setJoinRoomSuccess] = useState<string | null>(null);
  const [isAnonymousUser, setIsAnonymousUser] = useState(false);
  
  const router = useRouter();
  // Create client but we don't use it directly since we use the API instead
  // (kept for potential future client-side auth needs)
  // const supabase = createClient();
  
  // Function to identify student
  const getStudentId = () => {
    // Check various sources for student ID
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('user_id'); // from dashboard redirect
    const urlUid = urlParams.get('uid');        // from chat/room redirect
    const storedDirectId = localStorage.getItem('student_direct_access_id');
    const storedCurrentId = localStorage.getItem('current_student_id');
    const storedPinLoginId = localStorage.getItem('direct_pin_login_user');
    
    console.log('[Dashboard] Looking for student ID:', {
      urlUserId,
      urlUid,
      storedDirectId,
      storedCurrentId,
      storedPinLoginId
    });
    
    // Return the first valid ID found
    const id = urlUserId || urlUid || storedDirectId || storedCurrentId || storedPinLoginId;
    
    // Also store the ID in localStorage for reliability
    if (id) {
      localStorage.setItem('student_direct_access_id', id);
      localStorage.setItem('current_student_id', id);
    }
    
    return id;
  };

  // Load student profile and rooms using API
  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get student ID from various sources
      const studentId = getStudentId();
      console.log('Student ID:', studentId);
      
      // Check cookies for emergency access - another place to find student IDs
      const getEmergencyCookieValue = (name: string): string | null => {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
      };
      
      const emergencyUserId = getEmergencyCookieValue('emergency_user_id');
      if (emergencyUserId && !studentId) {
        console.log('[Dashboard] Found emergency_user_id cookie:', emergencyUserId);
        // Save it to localStorage for future use
        localStorage.setItem('student_direct_access_id', emergencyUserId);
        localStorage.setItem('current_student_id', emergencyUserId);
      }
      
      // Final ID check, using emergencyUserId as fallback
      const effectiveId = studentId || emergencyUserId;
      
      // Build the API URL - use direct endpoint for reliability
      let apiUrl = '/api/student/direct-dashboard';
      
      // Add studentId as a query parameter if available
      if (effectiveId) {
        apiUrl += `?userId=${effectiveId}`;
      } else {
        console.error('No student ID available');
        throw new Error('Cannot identify student. Please log in again.');
      }
      
      // Fetch dashboard data from API
      const response = await fetch(apiUrl, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        
        // If not authenticated and no student ID found, redirect to login
        if (response.status === 401 && !studentId) {
          console.log('Not authenticated. Redirecting to login...');
          setTimeout(() => {
            router.push('/student-access');
          }, 3000);
          throw new Error('Not authenticated. Please log in.');
        }
        
        throw new Error(data.error || 'Failed to load dashboard data');
      }
      
      const data = await response.json();
      
      console.log('Dashboard data loaded:', data);
      
      // Set student profile
      if (data.profile) {
        setStudentProfile(data.profile);
        
        // Check if anonymous/temporary user
        // Directly use isAnonymous from API if available, otherwise determine from profile
        setIsAnonymousUser(
          data.isAnonymous === true || 
          !data.profile.pin_code || 
          !data.profile.username
        );
      } else if (data.studentProfile) {
        // Alternative API response format
        setStudentProfile(data.studentProfile);
        setIsAnonymousUser(data.isAnonymous === true);
      }
      
      // Set rooms
      if (data.rooms) {
        setRooms(data.rooms);
      } else if (data.joinedRooms) {
        // Alternative API response format - convert to our expected format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRooms(data.joinedRooms.map((room: any) => ({
          ...room,
          is_active: true,
          teacher_id: '',
          created_at: room.joined_at
        })));
      } else {
        setRooms([]);
      }
      
    } catch (err) {
      console.error('Error in dashboard initialization:', err);
      setError(err instanceof Error ? err.message : 'Error initializing dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle room joining
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!joinRoomCode.trim()) {
      setJoinRoomError('Please enter a room code');
      return;
    }
    
    setIsJoiningRoom(true);
    setJoinRoomError(null);
    setJoinRoomSuccess(null);
    
    try {
      const studentId = getStudentId();
      
      if (!studentId && !studentProfile?.user_id) {
        setJoinRoomError('Cannot identify student. Please log in again.');
        setIsJoiningRoom(false);
        return;
      }
      
      const userId = studentId || studentProfile?.user_id;
      
      console.log('Joining room with user ID:', userId);
      
      const response = await fetch('/api/student/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          room_code: joinRoomCode.trim().toUpperCase(),
          user_id: userId,
          student_name: studentProfile?.full_name || 'Student',
          skip_auth: true // Use direct access mode for reliability
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
      }
      
      setJoinRoomSuccess('Successfully joined room!');
      setJoinRoomCode('');
      
      // Store the returned user ID if provided
      if (data.userId) {
        localStorage.setItem('current_student_id', data.userId);
        localStorage.setItem('student_direct_access_id', data.userId);
      }
      
      // Refresh dashboard data
      loadDashboard();
      
    } catch (err) {
      console.error('Error joining room:', err);
      setJoinRoomError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsJoiningRoom(false);
    }
  };
  
  // Enter a specific room
  const enterRoom = (roomId: string) => {
    const studentId = getStudentId() || studentProfile?.user_id;
    if (!studentId) {
      setError('Cannot identify student. Please log in again.');
      return;
    }
    
    // Navigate to room page with all required parameters
    // The URL parameter could be either uid or student_id based on the server component
    router.push(`/room/${roomId}?direct=1&uid=${studentId}`);
  };
  
  // Initialize dashboard on load - called only once due to empty dependency array
  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Show loading state
  if (loading) {
    return (
      <PageWrapper>
        <Container>
          <LoadingContainer>
            <LoadingSpinner size="large" />
            <p>Loading your dashboard...</p>
          </LoadingContainer>
        </Container>
      </PageWrapper>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <PageWrapper>
        <Container>
          <Alert variant="error">{error}</Alert>
          <Button 
            onClick={() => loadDashboard()} 
            style={{ marginTop: '16px' }}
          >
            Retry
          </Button>
        </Container>
      </PageWrapper>
    );
  }
  
  return (
    <PageWrapper>
      <Container>
        <WelcomeHeader>
          <h1>Welcome, {studentProfile?.full_name || 'Student'}!</h1>
          <p>
            {rooms.length > 0 
              ? `You have access to ${rooms.length} ${rooms.length === 1 ? 'classroom' : 'classrooms'} with ${rooms.reduce((total, room) => total + room.chatbots.length, 0)} chatbots.`
              : "You haven't joined any classrooms yet. Join one to get started!"
            }
          </p>
        </WelcomeHeader>
        
        {isAnonymousUser && (
          <AccountBanner>
            <div>
              <p><strong>Important:</strong> Your account is currently only accessible on this device.</p>
              <p>Create a PIN code to access your classrooms from any device.</p>
            </div>
            <Button as={Link} href="/student/pin-setup" variant="primary">
              Create PIN
            </Button>
          </AccountBanner>
        )}
        
        {!isAnonymousUser && studentProfile?.pin_code && studentProfile?.username && (
          <SuccessAccountBanner>
            <div>
              <p><strong>Account Info</strong></p>
              <p>Username: <strong>{studentProfile.username}</strong></p>
              <p>PIN Code: <strong>{studentProfile.pin_code}</strong></p>
              <p>Use these details to log in from any device.</p>
            </div>
          </SuccessAccountBanner>
        )}
        
        <JoinRoomSection>
          <div style={{ width: '100%' }}>
            <SectionTitle style={{ marginBottom: '1rem' }}>Join a New Classroom</SectionTitle>
            {joinRoomError && <Alert variant="error" style={{ marginBottom: '1rem' }}>{joinRoomError}</Alert>}
            {joinRoomSuccess && <Alert variant="success" style={{ marginBottom: '1rem' }}>{joinRoomSuccess}</Alert>}
            <JoinRoomForm onSubmit={handleJoinRoom}>
              <JoinRoomInput
                type="text"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                maxLength={6}
              />
              <Button 
                type="submit" 
                disabled={isJoiningRoom} 
                variant="primary"
              >
                {isJoiningRoom ? 'Joining...' : 'Join Room'}
              </Button>
            </JoinRoomForm>
          </div>
        </JoinRoomSection>
        
        <Section>
          <SectionTitle>My Classrooms ({rooms.length})</SectionTitle>
          {rooms.length > 0 ? (
            <RoomGrid>
              {rooms.map(room => (
                <RoomCard key={room.room_id}>
                  <div>
                    <h3>{room.room_name}</h3>
                    <p className="room-code">Code: {room.room_code}</p>
                    <p className="chatbot-count">
                      {room.chatbots.length} {room.chatbots.length === 1 ? 'chatbot' : 'chatbots'} available
                    </p>
                  </div>
                  <Button 
                    onClick={() => enterRoom(room.room_id)} 
                    variant="primary" 
                    style={{width: '100%'}}
                  >
                    Enter Classroom
                  </Button>
                </RoomCard>
              ))}
            </RoomGrid>
          ) : (
            <EmptyStateText>
              You haven&apos;t joined any classrooms yet. Use the form above to join a classroom with a code.
            </EmptyStateText>
          )}
        </Section>
      </Container>
    </PageWrapper>
  );
}