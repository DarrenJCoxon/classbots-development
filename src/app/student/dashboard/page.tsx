// src/app/student/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Button, Alert, Input } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import AssessmentList from '@/components/student/AssessmentList';
import type { AssessmentStatusEnum } from '@/types/database.types';

// Log when this file loads
console.log('STUDENT DASHBOARD PAGE LOADING', new Date().toISOString());

// Types
interface StudentProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  is_anonymous?: boolean;
  username?: string;
  pin_code?: string;
}

interface Chatbot {
  chatbot_id: string;
  name: string;
  bot_type: string;
}

interface Room {
  room_id: string;
  room_name: string;
  room_code: string;
  is_active: boolean;
  created_at: string;
  teacher_id: string;
  chatbots: Chatbot[];
}

// Import AssessmentSummary type from the component
import type { AssessmentSummary } from '@/components/student/AssessmentList';

// Styled components 
const PageWrapper = styled.div`
  padding: 20px 0;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 24px;
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 24px;
  
  @media (min-width: 992px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const AccountCard = styled(Card)`
  padding: 16px;
  background-color: ${({ theme }) => theme.colors.green}10;
  border: 1px solid ${({ theme }) => theme.colors.green};
  
  p {
    margin: 0 0 8px 0;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  strong {
    color: ${({ theme }) => theme.colors.green};
  }
`;

const AnonymousCard = styled(AccountCard)`
  background-color: ${({ theme }) => theme.colors.primary}10;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  
  strong {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const JoinRoomCard = styled(Card)`
  padding: 16px;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
`;

const RoomCard = styled(Card)`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  
  h3 {
    font-size: 1.25rem;
    color: ${({ theme }) => theme.colors.primaryDark};
    margin-top: 0;
    margin-bottom: 8px;
  }
  
  .room-code {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-family: ${({ theme }) => theme.fonts.mono};
    margin-bottom: 8px;
  }
  
  .chatbot-count {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: 16px;
  }
`;

const JoinRoomForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;
  
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
    margin-right: 8px;
  }
`;

const EmptyStateText = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 16px 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
`;

// Main dashboard component
export default function StudentDashboardPage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [joinRoomError, setJoinRoomError] = useState<string | null>(null);
  const [joinRoomSuccess, setJoinRoomSuccess] = useState<string | null>(null);
  const [isAnonymousUser, setIsAnonymousUser] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  
  const router = useRouter();
  
  // Set up window resize listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initial width
      setWindowWidth(window.innerWidth);
      
      // Listen for resize
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  // Function to identify student
  const getStudentId = () => {
    if (typeof window === 'undefined') return null;
    
    // Check various sources for student ID
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('user_id');
    const urlUid = urlParams.get('uid');
    
    // Handle access signature if present
    let decodedUserId = null;
    const accessSignature = urlParams.get('access_signature');
    const timestamp = urlParams.get('ts');
    
    if (accessSignature && timestamp) {
      try {
        const decoded = atob(accessSignature);
        const [userId, signatureTimestamp] = decoded.split(':');
        
        if (signatureTimestamp === timestamp) {
          decodedUserId = userId;
          console.log('Successfully decoded access signature for user:', decodedUserId);
        }
      } catch (e) {
        console.error('Failed to decode access signature:', e);
      }
    }
    
    const storedDirectId = localStorage.getItem('student_direct_access_id');
    const storedCurrentId = localStorage.getItem('current_student_id');
    const storedPinLoginId = localStorage.getItem('direct_pin_login_user');
    
    // Return the first valid ID found
    const id = decodedUserId || urlUserId || urlUid || storedDirectId || storedCurrentId || storedPinLoginId;
    
    // Store the ID in localStorage for reliability
    if (id) {
      localStorage.setItem('student_direct_access_id', id);
      localStorage.setItem('current_student_id', id);
    }
    
    return id;
  };
  
  // Load student profile and data
  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get student ID
      const studentId = getStudentId();
      
      if (!studentId) {
        console.error('No student ID available');
        throw new Error('Cannot identify student. Please log in again.');
      }
      
      // Build API URL
      const apiUrl = `/api/student/direct-dashboard?userId=${studentId}`;
      
      // Fetch dashboard data
      const response = await fetch(apiUrl, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          router.push('/student-access');
          throw new Error('Not authenticated. Please log in.');
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to load dashboard');
      }
      
      const response_data = await response.json();
      console.log('Dashboard data loaded:', response_data);
      
      // Handle standardized response format
      let data;
      if (response_data.success && response_data.data) {
        data = response_data.data;
      } else if (response_data.profile || response_data.rooms || response_data.recentAssessments) {
        // Fallback for old format
        data = response_data;
      } else {
        throw new Error(response_data.error || 'Invalid response format');
      }
      
      // Set student profile
      if (data.profile) {
        setStudentProfile(data.profile);
        setIsAnonymousUser(!data.profile.pin_code || !data.profile.username);
      }
      
      // Set rooms
      if (data.rooms) {
        setRooms(data.rooms);
      } else if (data.joinedRooms) {
        setRooms(data.joinedRooms.map((room: any) => ({
          ...room,
          is_active: true,
          teacher_id: '',
          created_at: room.joined_at
        })));
      } else {
        setRooms([]);
      }
      
      // Set assessments
      if (data.recentAssessments && Array.isArray(data.recentAssessments)) {
        setAssessments(data.recentAssessments);
        console.log(`Loaded ${data.recentAssessments.length} assessments:`, data.recentAssessments);
      } else {
        console.log('No assessments found in response');
        setAssessments([]);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err instanceof Error ? err.message : 'Error loading dashboard');
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
        return;
      }
      
      const userId = studentId || studentProfile?.user_id;
      
      // Join room API call
      const response = await fetch('/api/student/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: joinRoomCode.trim().toUpperCase(),
          user_id: userId,
          student_name: studentProfile?.full_name || 'Student',
          skip_auth: true
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
      }
      
      setJoinRoomSuccess('Successfully joined room!');
      setJoinRoomCode('');
      
      // Refresh dashboard
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
    
    // Create access signature for security
    const timestamp = Date.now();
    const accessSignature = btoa(`${studentId}:${timestamp}`);
    
    // Navigate to room
    router.push(`/room/${roomId}?direct=true&access_signature=${accessSignature}&ts=${timestamp}&uid=${studentId}`);
  };
  
  // Load dashboard on mount
  useEffect(() => {
    loadDashboard();
  }, []);
  
  // Loading state
  if (loading) {
    return (
      <PageWrapper>
        <LoadingContainer>
          <LoadingSpinner size="large" />
          <p>Loading your dashboard...</p>
        </LoadingContainer>
      </PageWrapper>
    );
  }
  
  // Error state
  if (error) {
    return (
      <PageWrapper>
        <Alert variant="error">{error}</Alert>
        <Button 
          onClick={() => loadDashboard()} 
          style={{ marginTop: '16px' }}
        >
          Retry
        </Button>
      </PageWrapper>
    );
  }
  
  // Main dashboard content
  return (
    <PageWrapper>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Title>Welcome, {studentProfile?.full_name || 'Student'}!</Title>
        <Subtitle>
          {rooms.length > 0 
            ? `You have access to ${rooms.length} ${rooms.length === 1 ? 'classroom' : 'classrooms'} with ${rooms.reduce((total, room) => total + room.chatbots.length, 0)} chatbots.`
            : "You haven't joined any classrooms yet. Join one to get started!"
          }
        </Subtitle>
      </div>
      
      <TopRow>
        {/* Account Information */}
        <div>
          {isAnonymousUser ? (
            <AnonymousCard>
              <div>
                <p><strong>Important:</strong> Your account is currently only accessible on this device.</p>
                <p>Create a PIN code to access your classrooms from any device.</p>
              </div>
              <Button as={Link} href="/student/pin-setup" variant="primary" style={{ marginTop: '16px' }}>
                Create PIN
              </Button>
            </AnonymousCard>
          ) : (
            studentProfile?.pin_code && studentProfile?.username && (
              <AccountCard>
                <p><strong>Account Info</strong></p>
                <p>Username: <strong>{studentProfile.username}</strong></p>
                <p>PIN Code: <strong>{studentProfile.pin_code}</strong></p>
                <p>Use these details to log in from any device.</p>
              </AccountCard>
            )
          )}
        </div>
        
        {/* Join Room */}
        <JoinRoomCard>
          <SectionTitle>Join a Classroom</SectionTitle>
          {joinRoomError && <Alert variant="error" style={{ marginBottom: '16px' }}>{joinRoomError}</Alert>}
          {joinRoomSuccess && <Alert variant="success" style={{ marginBottom: '16px' }}>{joinRoomSuccess}</Alert>}
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
        </JoinRoomCard>
      </TopRow>
      
      {/* My Classrooms */}
      <Card style={{ marginBottom: '24px' }}>
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
      </Card>
      
      {/* Assessments */}
      <AssessmentList assessments={assessments} />
    </PageWrapper>
  );
}