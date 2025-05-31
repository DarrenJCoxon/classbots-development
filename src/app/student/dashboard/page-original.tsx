// src/app/student/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import { FullPageLoader } from '@/components/shared/AnimatedLoader';
import AssessmentList from '@/components/student/AssessmentList';
import { FiArrowRight } from 'react-icons/fi';
import type { AssessmentStatusEnum } from '@/types/database.types';

// Log when this file loads
console.log('STUDENT DASHBOARD PAGE LOADING', new Date().toISOString());

// Types
interface StudentProfile {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  surname: string | null;
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

// Styled components with modern design
const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  position: relative;
  
  /* Subtle animated background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(76, 190, 243, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(152, 93, 215, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 40% 20%, rgba(200, 72, 175, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  padding: 40px 24px;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 40px 24px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 24px 16px;
  }
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 800;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.blue}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 28px;
    letter-spacing: 0.5px;
  }
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 32px;
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

const AccountCard = styled.div`
  padding: 24px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(76, 190, 243, 0.2);
  box-shadow: 0 8px 32px rgba(76, 190, 243, 0.05);
  
  p {
    margin: 0 0 12px 0;
    color: ${({ theme }) => theme.colors.text};
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  strong {
    color: ${({ theme }) => theme.colors.blue};
    font-weight: 600;
  }
`;

const AnonymousCard = styled(AccountCard)`
  border: 1px solid rgba(152, 93, 215, 0.2);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
  
  strong {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const JoinRoomCard = styled.div`
  padding: 24px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(200, 72, 175, 0.2);
  box-shadow: 0 8px 32px rgba(200, 72, 175, 0.05);
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 20px 0;
`;

const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const RoomCard = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(152, 93, 215, 0.1);
  }
  
  h3 {
    font-size: 18px;
    font-weight: 700;
    font-family: ${({ theme }) => theme.fonts.heading};
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.primary};
    margin: 0 0 12px 0;
  }
  
  .room-code {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.primary}20, 
      ${({ theme }) => theme.colors.magenta}20
    );
    border: 1px solid ${({ theme }) => theme.colors.primary}30;
    color: ${({ theme }) => theme.colors.primary};
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    font-family: ${({ theme }) => theme.fonts.mono};
    letter-spacing: 1px;
    margin-bottom: 12px;
  }
  
  .chatbot-count {
    font-size: 14px;
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: 20px;
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

const JoinRoomInput = styled.input`
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 600;
  text-align: center;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    background: white;
    border-color: ${({ theme }) => theme.colors.magenta};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.magenta}20;
  }
  
  @media (min-width: 768px) {
    flex: 1;
    margin-right: 8px;
  }
`;

const EmptyStateText = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textLight};
  padding: 40px 20px;
  font-size: 16px;
`;

const SectionContainer = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
  margin-bottom: 24px;
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
      const apiUrl = `/api/student/dashboard-data?user_id=${studentId}&direct=1&_t=${Date.now()}`;
      
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
      
      // Handle API response format
      // The API returns { studentProfile, joinedRooms, recentAssessments }
      
      // Set student profile
      if (response_data.studentProfile) {
        setStudentProfile(response_data.studentProfile);
        setIsAnonymousUser(!response_data.studentProfile.pin_code || !response_data.studentProfile.username);
      }
      
      // Set rooms - API returns joinedRooms
      if (response_data.joinedRooms) {
        console.log(`Loaded ${response_data.joinedRooms.length} rooms:`, response_data.joinedRooms);
        setRooms(response_data.joinedRooms.map((room: any) => ({
          ...room,
          is_active: true,
          teacher_id: '',
          created_at: room.joined_at
        })));
      } else {
        console.log('No rooms found in response');
        setRooms([]);
      }
      
      // Set assessments
      if (response_data.recentAssessments && Array.isArray(response_data.recentAssessments)) {
        setAssessments(response_data.recentAssessments);
        console.log(`Loaded ${response_data.recentAssessments.length} assessments:`, response_data.recentAssessments);
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
    return <FullPageLoader message="Loading your dashboard..." variant="dots" />;
  }
  
  // Error state
  if (error) {
    return (
      <PageWrapper>
        <ContentWrapper>
          <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>
          <ModernButton 
            onClick={() => loadDashboard()} 
            variant="primary"
          >
            Retry
          </ModernButton>
        </ContentWrapper>
      </PageWrapper>
    );
  }
  
  // Main dashboard content
  return (
    <PageWrapper>
      <ContentWrapper>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ textAlign: 'center', marginBottom: '40px' }}
        >
          <Title>Welcome, {studentProfile?.first_name || studentProfile?.full_name || 'Student'}!</Title>
          <Subtitle>
            {rooms.length > 0 
              ? `You have access to ${rooms.length} ${rooms.length === 1 ? 'classroom' : 'classrooms'} with ${rooms.reduce((total, room) => total + room.chatbots.length, 0)} chatbots.`
              : "You haven't joined any classrooms yet. Join one to get started!"
            }
          </Subtitle>
        </motion.div>
      
      <TopRow>
        {/* Account Information */}
        <div>
          {isAnonymousUser ? (
            <AnonymousCard>
              <div>
                <p><strong>Important:</strong> Your account is currently only accessible on this device.</p>
                <p>Create a PIN code to access your classrooms from any device.</p>
              </div>
              <ModernButton 
                onClick={() => router.push('/student/pin-setup')}
                variant="primary" 
                style={{ marginTop: '16px', width: '100%' }}
              >
                Create PIN
                <FiArrowRight />
              </ModernButton>
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
            <ModernButton 
              type="submit" 
              disabled={isJoiningRoom} 
              variant="primary"
            >
              {isJoiningRoom ? 'Joining...' : 'Join Room'}
            </ModernButton>
          </JoinRoomForm>
        </JoinRoomCard>
      </TopRow>
      
        {/* My Classrooms */}
        <SectionContainer id="classrooms">
          <SectionTitle>My Classrooms ({rooms.length})</SectionTitle>
          {rooms.length > 0 ? (
            <RoomGrid>
              {rooms.map((room, index) => (
                <motion.div
                  key={room.room_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <RoomCard>
                    <div>
                      <h3>{room.room_name}</h3>
                      <span className="room-code">{room.room_code}</span>
                      <p className="chatbot-count">
                        {room.chatbots.length} {room.chatbots.length === 1 ? 'Skolr' : 'Skolrs'} available
                      </p>
                    </div>
                    <ModernButton 
                      onClick={() => enterRoom(room.room_id)} 
                      variant="primary" 
                      style={{width: '100%'}}
                    >
                      Enter Classroom
                      <FiArrowRight />
                    </ModernButton>
                  </RoomCard>
                </motion.div>
              ))}
            </RoomGrid>
          ) : (
            <EmptyStateText>
              You haven&apos;t joined any classrooms yet. Use the form above to join a classroom with a code.
            </EmptyStateText>
          )}
        </SectionContainer>
      
        {/* Assessments */}
        <div id="assessments">
          <AssessmentList assessments={assessments} />
        </div>
      </ContentWrapper>
    </PageWrapper>
  );
}