// src/app/student/dashboard/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import type { AssessmentStatusEnum } from '@/types/database.types';

// Lazy load heavy components
const AssessmentList = dynamic(() => import('@/components/student/AssessmentList'), {
  loading: () => <AssessmentSkeleton />,
  ssr: false
});

const FullPageLoader = dynamic(
  () => import('@/components/shared/AnimatedLoader').then(mod => ({ default: mod.FullPageLoader })),
  { ssr: false }
);

const FiArrowRight = dynamic(
  () => import('react-icons/fi').then(mod => ({ default: mod.FiArrowRight })),
  { ssr: false }
);

// Remove framer-motion for initial load performance
// Use CSS animations instead

// Types
interface DashboardData {
  user: {
    id: string;
    full_name: string | null;
    first_name: string | null;
    surname: string | null;
    username?: string | null;
    pin_code?: string | null;
  };
  rooms: Array<{
    room_id: string;
    is_active: boolean;
    joined_at: string;
    chatbot_count: number;
    rooms: {
      id: string;
      name: string;
      room_code: string;
      created_at: string;
      is_active: boolean;
    };
  }>;
  assessments: Array<{
    id: string;
    title: string;
    status: AssessmentStatusEnum;
    score: number | null;
    feedback: string | null;
    created_at: string;
    student_id: string;
    chatbot_id: string;
    chatbots: {
      id: string;
      name: string;
      subject: string | null;
    } | null;
  }>;
  stats: {
    totalRooms: number;
    totalAssessments: number;
    averageScore: number;
    recentActivity: number;
  };
}

// Loading Skeletons for better perceived performance
function DashboardSkeleton() {
  return (
    <PageWrapper>
      <ContentWrapper>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ height: '40px', width: '300px', background: '#f0f0f0', borderRadius: '8px', margin: '0 auto 16px' }} />
          <div style={{ height: '20px', width: '400px', background: '#f0f0f0', borderRadius: '4px', margin: '0 auto' }} />
        </div>
        
        <TopRow>
          <div style={{ height: '150px', background: '#f0f0f0', borderRadius: '16px' }} />
          <div style={{ height: '150px', background: '#f0f0f0', borderRadius: '16px' }} />
        </TopRow>
        
        <div style={{ height: '400px', background: '#f0f0f0', borderRadius: '16px', marginTop: '24px' }} />
      </ContentWrapper>
    </PageWrapper>
  );
}

function AssessmentSkeleton() {
  return (
    <SectionContainer>
      <div style={{ height: '24px', width: '200px', background: '#f0f0f0', borderRadius: '4px', marginBottom: '20px' }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: '80px', background: '#f0f0f0', borderRadius: '8px', marginBottom: '12px' }} />
      ))}
    </SectionContainer>
  );
}

// Styled components (keeping existing styles but optimizing)
const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  position: relative;
  
  /* CSS animation instead of framer-motion */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Background with CSS instead of pseudo-element for performance */
  background-image: 
    radial-gradient(circle at 20% 50%, rgba(76, 190, 243, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(152, 93, 215, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 40% 20%, rgba(200, 72, 175, 0.03) 0%, transparent 50%);
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  padding: 40px 24px;
  max-width: 1200px;
  margin: 0 auto;
  animation: fadeIn 0.4s ease-out;
  
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
  animation: fadeIn 0.4s ease-out;
  animation-fill-mode: backwards;
  
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
  
  /* Stagger animation */
  ${Array.from({ length: 10 }, (_, i) => `
    &:nth-child(${i + 1}) {
      animation-delay: ${i * 0.1}s;
    }
  `).join('')}
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

// Optimized dashboard component
export default function StudentDashboardPage() {
  const [user, setUser] = useState<DashboardData['user'] | null>(null);
  const [rooms, setRooms] = useState<DashboardData['rooms']>([]);
  const [assessments, setAssessments] = useState<DashboardData['assessments']>([]);
  const [stats, setStats] = useState<DashboardData['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [joinRoomError, setJoinRoomError] = useState<string | null>(null);
  const [joinRoomSuccess, setJoinRoomSuccess] = useState<string | null>(null);
  
  const router = useRouter();
  
  // Get student ID from various sources
  const getStudentId = () => {
    if (typeof window === 'undefined') return null;
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('user_id');
    const urlUid = urlParams.get('uid');
    
    let decodedUserId = null;
    const accessSignature = urlParams.get('access_signature');
    const timestamp = urlParams.get('ts');
    
    if (accessSignature && timestamp) {
      try {
        const decoded = atob(accessSignature);
        const [userId, signatureTimestamp] = decoded.split(':');
        if (signatureTimestamp === timestamp) {
          decodedUserId = userId;
        }
      } catch (e) {
        console.error('Failed to decode access signature:', e);
      }
    }
    
    const storedDirectId = localStorage.getItem('student_direct_access_id');
    const storedCurrentId = localStorage.getItem('current_student_id');
    const storedPinLoginId = localStorage.getItem('direct_pin_login_user');
    
    const id = decodedUserId || urlUserId || urlUid || storedDirectId || storedCurrentId || storedPinLoginId;
    
    if (id) {
      localStorage.setItem('student_direct_access_id', id);
      localStorage.setItem('current_student_id', id);
    }
    
    return id;
  };
  
  // Load all dashboard data in one optimized request
  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const studentId = getStudentId();
      
      if (!studentId) {
        throw new Error('Cannot identify student. Please log in again.');
      }
      
      // Single optimized API call
      const response = await fetch('/api/student/dashboard-all', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=60' // Client-side cache hint
        }
      });
      
      console.log('[Student Dashboard] API response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/student-access');
          throw new Error('Not authenticated. Please log in.');
        }
        
        let errorData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        } else {
          // If not JSON, it might be an HTML error page
          const text = await response.text();
          console.error('[Student Dashboard] Non-JSON response:', text.substring(0, 500));
          errorData = { error: 'Server returned non-JSON response', details: text.substring(0, 200) };
        }
        
        console.error('[Student Dashboard] API error:', errorData);
        throw new Error(errorData.error || 'Failed to load dashboard');
      }
      
      const data = await response.json();
      
      // Debug logging to trace name issue
      console.log('[Student Dashboard] Received user data:', data.user);
      
      setUser(data.user);
      setRooms(data.rooms);
      setAssessments(data.assessments);
      setStats(data.stats);
      
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
      const studentId = getStudentId() || user?.id;
      
      if (!studentId) {
        setJoinRoomError('Cannot identify student. Please log in again.');
        return;
      }
      
      const response = await fetch('/api/student/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: joinRoomCode.trim().toUpperCase(),
          user_id: studentId,
          student_name: user?.full_name || 'Student',
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
    const studentId = getStudentId() || user?.id;
    if (!studentId) {
      setError('Cannot identify student. Please log in again.');
      return;
    }
    
    const timestamp = Date.now();
    const accessSignature = btoa(`${studentId}:${timestamp}`);
    
    router.push(`/room/${roomId}?direct=true&access_signature=${accessSignature}&ts=${timestamp}&uid=${studentId}`);
  };
  
  // Load dashboard on mount
  useEffect(() => {
    loadDashboard();
  }, []);
  
  // Show skeleton while loading
  if (loading) {
    return <DashboardSkeleton />;
  }
  
  // Error state
  if (error || !user || !stats) {
    return (
      <PageWrapper>
        <ContentWrapper>
          <Alert variant="error" style={{ marginBottom: '16px' }}>{error || 'Failed to load dashboard'}</Alert>
          <ModernButton onClick={() => loadDashboard()} variant="primary">
            Retry
          </ModernButton>
        </ContentWrapper>
      </PageWrapper>
    );
  }
  
  const isAnonymousUser = !user.pin_code || !user.username;
  
  // Main dashboard content
  return (
    <PageWrapper>
      <ContentWrapper>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Title>Welcome, {user.first_name || user.full_name || 'Student'}!</Title>
          <Subtitle>
            {stats.totalRooms > 0 
              ? `You have access to ${stats.totalRooms} ${stats.totalRooms === 1 ? 'classroom' : 'classrooms'}.`
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
                <ModernButton 
                  onClick={() => router.push('/student/pin-setup')}
                  variant="primary" 
                  style={{ marginTop: '16px', width: '100%' }}
                >
                  Create PIN
                  <Suspense fallback={null}>
                    <FiArrowRight />
                  </Suspense>
                </ModernButton>
              </AnonymousCard>
            ) : (
              user.pin_code && user.username && (
                <AccountCard>
                  <p><strong>Account Info</strong></p>
                  <p>Username: <strong>{user.username}</strong></p>
                  <p>PIN Code: <strong>{user.pin_code}</strong></p>
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
              {rooms.map((room) => (
                <RoomCard key={room.room_id}>
                  <div>
                    <h3>{room.rooms.name}</h3>
                    <span className="room-code">{room.rooms.room_code}</span>
                    <p className="chatbot-count">
                      {room.chatbot_count} {room.chatbot_count === 1 ? 'Skolr' : 'Skolrs'} available
                    </p>
                  </div>
                  <ModernButton 
                    onClick={() => enterRoom(room.room_id)} 
                    variant="primary" 
                    style={{width: '100%'}}
                  >
                    Enter Classroom
                    <Suspense fallback={null}>
                      <FiArrowRight />
                    </Suspense>
                  </ModernButton>
                </RoomCard>
              ))}
            </RoomGrid>
          ) : (
            <EmptyStateText>
              You haven&apos;t joined any classrooms yet. Use the form above to join a classroom with a code.
            </EmptyStateText>
          )}
        </SectionContainer>
      
        {/* Assessments */}
        {assessments.length > 0 && (
          <div id="assessments">
            <Suspense fallback={<AssessmentSkeleton />}>
              <AssessmentList assessments={assessments.map(a => ({
                assessment_id: a.id,
                room_id: rooms[0]?.room_id || '',
                room_name: rooms.find(r => r.rooms.id === a.chatbot_id)?.rooms.name || null,
                chatbot_id: a.chatbot_id,
                chatbot_name: a.chatbots?.name || null,
                ai_grade_raw: a.score?.toString() || null,
                ai_feedback_student: a.feedback,
                assessed_at: a.created_at,
                status: a.status,
                teacher_override_grade: null,
                teacher_override_notes: null
              }))} />
            </Suspense>
          </div>
        )}
      </ContentWrapper>
    </PageWrapper>
  );
}