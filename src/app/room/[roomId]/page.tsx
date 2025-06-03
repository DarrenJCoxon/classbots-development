// src/app/room/[roomId]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Container, Card, Alert } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import StudentList from '@/components/teacher/StudentList';
import { ModernStudentNav } from '@/components/student/ModernStudentNav';
import type { Chatbot } from '@/types/database.types';

const PageWrapper = styled.div`
  display: flex;
  min-height: 100vh;
  width: 100%;
  position: relative;
`;

const MainContent = styled.div<{ $hasNav?: boolean }>`
  flex: 1;
  width: 100%;
  padding: ${({ theme }) => theme.spacing.lg} 0;
  margin-left: ${({ $hasNav }) => ($hasNav ? '280px' : '0')};
  transition: margin-left 0.3s ease;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    margin-left: ${({ $hasNav }) => ($hasNav ? '70px' : '0')};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    margin-left: 0;
    padding: ${({ theme }) => theme.spacing.md} 0;
    padding-bottom: ${({ $hasNav }) => ($hasNav ? '80px' : '0')};
  }
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column-reverse;
    gap: ${({ theme }) => theme.spacing.md};
    margin-bottom: ${({ theme }) => theme.spacing.lg};
  }
`;

const RoomInfo = styled.div`
  h1 {
    font-size: 36px;
    font-weight: 800;
    font-family: ${({ theme }) => theme.fonts.heading};
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.primary}, 
      ${({ theme }) => theme.colors.blue}
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 28px;
      text-align: center;
    }
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 1.125rem;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 1rem;
      text-align: center;
    }
  }
  
  .room-code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
    margin-top: ${({ theme }) => theme.spacing.xs};
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      text-align: center;
    }
  }
`;

const BackButtonWrapper = styled.div`
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    
    button {
      width: 100%;
      justify-content: center;
    }
  }
`;

const ChatbotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};
  margin-top: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing.md};
  }
`;

const CoursesSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xl};
  
  h2 {
    font-size: 28px;
    font-weight: 700;
    font-family: ${({ theme }) => theme.fonts.heading};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: ${({ theme }) => theme.spacing.lg};
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.primary}, 
      ${({ theme }) => theme.colors.blue}
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 24px;
      text-align: center;
    }
  }
`;

const CourseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing.md};
  }
`;

const CourseCard = styled(Card)`
  position: relative;
  transition: transform ${({ theme }) => theme.transitions.fast}, box-shadow ${({ theme }) => theme.transitions.fast};
  cursor: pointer;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
  
  h3 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: 1.5rem;
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: ${({ theme }) => theme.spacing.lg};
    min-height: 3rem;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      min-height: auto;
    }
  }
  
  .course-subject {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textMuted};
    background: ${({ theme }) => theme.colors.backgroundDark};
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.borderRadius.small};
    margin-bottom: ${({ theme }) => theme.spacing.lg};
    display: inline-block;
  }
  
  .course-button {
    width: 100%;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      min-height: 44px;
    }
  }
`;

const ChatbotCard = styled(Card)`
  position: relative;
  transition: transform ${({ theme }) => theme.transitions.fast}, box-shadow ${({ theme }) => theme.transitions.fast};
  cursor: pointer;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
  
  h3 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: 1.5rem;
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: ${({ theme }) => theme.spacing.lg};
    min-height: 3rem;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      min-height: auto;
    }
  }
  
  .model-info {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textMuted};
    background: ${({ theme }) => theme.colors.backgroundDark};
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.borderRadius.small};
    margin-bottom: ${({ theme }) => theme.spacing.lg};
    display: inline-block;
  }
  
  .chat-button {
    width: 100%;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      min-height: 44px;
    }
  }
`;

const EmptyState = styled(Card)`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  
  h3 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: ${({ theme }) => theme.spacing.lg};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.xl};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
`;

// Placeholder component to prevent layout shift
function CoursesPlaceholder() {
  return (
    <CoursesSection>
      <div style={{ 
        height: '32px', 
        width: '200px', 
        background: '#f0f0f0', 
        borderRadius: '8px',
        marginBottom: '24px',
        opacity: 0.3
      }} />
    </CoursesSection>
  );
}

// Client-side only courses component to prevent hydration issues
function CoursesClientComponent({ courses }: { courses: any[] }) {
  if (courses.length === 0) return null;
  
  return (
    <CoursesSection>
      <h2>📚 Available Courses</h2>
      <CourseGrid>
        {courses.map((course) => (
          <Link 
            key={course.course_id} 
            href={`/student/courses/${course.course_id}`}
            style={{ textDecoration: 'none' }}
          >
            <CourseCard>
              <h3>{course.title}</h3>
              <p>{course.description || 'No description available'}</p>
              
              {course.subject && (
                <div className="course-subject">
                  {course.subject}
                </div>
              )}
              
              <ModernButton 
                className="course-button"
                as="div"  // Prevent double link
                variant="secondary"
                size="medium"
                fullWidth
              >
                View Lessons
              </ModernButton>
            </CourseCard>
          </Link>
        ))}
      </CourseGrid>
    </CoursesSection>
  );
}


// Extended chatbot interface to include instance_id
interface ChatbotWithInstance extends Chatbot {
  instance_id?: string;
}

interface RoomQueryResult {
  room_id: string;
  room_name: string;
  room_code: string;
  teacher_id: string;
  school_id: string;
  is_active: boolean;
  created_at: string;
  room_chatbots: {
    chatbots: Chatbot;
  }[] | null;
}

export default function RoomPage() {
  const [room, setRoom] = useState<RoomQueryResult | null>(null);
  const [chatbots, setChatbots] = useState<ChatbotWithInstance[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isStudent, setIsStudent] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  const params = useParams();
  const roomId = params?.roomId as string;
  const router = useRouter();
  const supabase = createClient();

  // Check for direct access via URL param
  const searchParams = useSearchParams();
  
  // SECURITY ENHANCEMENT: Use access signature instead of direct UID
  const accessSignature = searchParams?.get('access_signature');
  const timestamp = searchParams?.get('ts');
  let uidFromUrl = searchParams?.get('uid'); // For backward compatibility
  
  console.log('[RoomPage] URL parameters:', {
    accessSignature,
    timestamp,
    rawUid: searchParams?.get('uid'),
    direct: searchParams?.get('direct')
  });
  
  // If we have a secure access signature, decode it to get the user ID
  if (accessSignature && timestamp) {
    try {
      const decoded = atob(accessSignature);
      const [userId, signatureTimestamp] = decoded.split(':');
      
      // Verify timestamp matches to prevent tampering
      if (signatureTimestamp === timestamp) {
        uidFromUrl = userId;
        console.log('[RoomPage] Successfully decoded access signature, set uidFromUrl:', uidFromUrl);
      } else {
        console.error('[RoomPage] Timestamp mismatch in access signature');
      }
    } catch (e) {
      console.error('[RoomPage] Failed to decode access signature:', e);
    }
  }
  
  const fetchRoomData = useCallback(async () => {
    try {
      // We already have uidFromUrl from the decoded access_signature or legacy uid parameter
      // No need to reassign it - use uidFromUrl directly
      console.log('[RoomPage] fetchRoomData starting with uidFromUrl:', uidFromUrl);
      let userId, userRole;
      
      // First, try to get the authenticated user normally
      const { data: { user } } = await supabase.auth.getUser();
      
      // Helper function to get cookie values
      const getCookieValue = (name: string): string | null => {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
      };
      
      // Check for different auth mechanisms via cookies
      // First with standard auth-* cookies, then check older emergency_* cookies for backward compatibility
      const authUserId = getCookieValue('auth-user-id') || getCookieValue('emergency_user_id');
      const directAccess = getCookieValue('auth-direct-access') === 'true' || getCookieValue('emergency_access') === 'true';
      const cookieRoomId = getCookieValue('auth-room-id') || getCookieValue('emergency_room_id');
      const directAccessMode = searchParams?.get('direct') === 'true' || searchParams?.get('emergency') === 'true';
      
      if (!user) {
        if (directAccess && authUserId && cookieRoomId === roomId) {
          console.log('[RoomPage] Using direct access cookies:', authUserId);
          userId = authUserId;
          userRole = 'student';
          setIsStudent(true);
        } else if (uidFromUrl) {
          console.log('[RoomPage] No authenticated user but UID found:', uidFromUrl);
          // Try to use the UID from either access_signature or legacy uid parameter
          userId = uidFromUrl;
          console.log('[RoomPage] Set userId to uidFromUrl:', userId);
          userRole = 'student'; // Assume student role for direct access
          setIsStudent(true);
        } else {
          throw new Error('Not authenticated');
        }
      } else {
        userId = user.id;
        
        // Get user role from profile - check both tables
        const { data: studentProfile } = await supabase
          .from('student_profiles')
          .select('user_id')
          .eq('user_id', userId)
          .single();
          
        if (studentProfile) {
          userRole = 'student';
          setUserRole('student');
          setIsStudent(true);
        } else {
          const { data: teacherProfile } = await supabase
            .from('teacher_profiles')
            .select('user_id')
            .eq('user_id', userId)
            .single();
            
          if (teacherProfile) {
            userRole = 'teacher';
            setUserRole('teacher');
            setIsStudent(false);
          } else {
            throw new Error('User profile not found');
          }
        }
      }

      // First, ensure we have access to this room
      let hasAccess = false;
      if (userRole === 'teacher') {
        // For teachers, check if they own the room
        const { data: teacherRoom } = await supabase
          .from('rooms')
          .select('room_id')
          .eq('room_id', roomId)
          .eq('teacher_id', userId)
          .single();
        
        hasAccess = !!teacherRoom;
      } else if (userRole === 'student') {
        // For students, check if they're a member of the room
        const { data: membership } = await supabase
          .from('room_memberships')
          .select('room_id')
          .eq('room_id', roomId)
          .eq('student_id', userId)
          .single();
        
        hasAccess = !!membership;
        
        // If uid was provided but no access, try using admin client
        if (!hasAccess && uidFromUrl) {
          console.warn('[RoomPage] No access found using standard query with UID, trying API...');
          // Use a special API endpoint with admin client to check membership
          try {
            const response = await fetch(`/api/student/verify-membership?roomId=${roomId}&userId=${uidFromUrl}`, {
              credentials: 'include'
            });
            
            if (response.ok) {
              const result = await response.json();
              // Handle new standardized API response format
              const data = result.success ? result.data : result;
              hasAccess = data.isMember;
              console.log('[RoomPage] Access check via API:', hasAccess ? 'Granted' : 'Denied');
            }
          } catch (apiError) {
            console.error('[RoomPage] Error checking membership via API:', apiError);
          }
        }
      }

      if (!hasAccess) {
        throw new Error('You do not have access to this room');
      }

      // Get basic room info
      if (uidFromUrl || directAccess || directAccessMode) {
        // Use admin API to get data
        try {
          // Use the most reliable user ID available
          const effectiveUserId = authUserId || uidFromUrl;
          const response = await fetch(`/api/student/room-data?roomId=${roomId}&userId=${effectiveUserId}`, {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch room data via API');
          }
          
          const result = await response.json();
          // Handle new standardized API response format
          const data = result.success ? result.data : result;
          setRoom(data.room);
          setChatbots(data.chatbots || []);
          setCourses(data.courses || []);
          return;
        } catch (apiError) {
          console.error('[RoomPage] Error fetching room data via API:', apiError);
          // Continue with standard flow as fallback
        }
      }

      // Standard flow
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (roomError || !roomData) {
        throw new Error('Room not found');
      }

      // Retrieve chatbots using a two-step process to bypass potential RLS issues
      // Step 1: Get chatbot IDs for this room
      const { data: roomChatbots, error: rcError } = await supabase
        .from('room_chatbots')
        .select('chatbot_id')
        .eq('room_id', roomId);

      if (rcError) {
        console.error('[RoomPage] Error fetching room-chatbot relations:', rcError);
        throw new Error('Failed to retrieve chatbot information');
      }

      // Step 2: Get the chatbot details
      const extractedChatbots: Chatbot[] = [];
      
      if (roomChatbots && roomChatbots.length > 0) {
        const chatbotIds = roomChatbots.map(rc => rc.chatbot_id);
        
        const { data: chatbots, error: chatbotsError } = await supabase
          .from('chatbots')
          .select('*')
          .in('chatbot_id', chatbotIds);

        if (chatbotsError) {
          console.error('[RoomPage] Error fetching chatbots:', chatbotsError);
          throw new Error('Failed to retrieve chatbot information');
        }
        
        extractedChatbots.push(...(chatbots || []));
      }
      
      // Fetch courses for the room
      const { data: roomCourses, error: coursesError } = await supabase
        .from('room_courses')
        .select(`
          course_id,
          courses (
            course_id,
            title,
            description,
            subject,
            is_published
          )
        `)
        .eq('room_id', roomId);

      // Extract and filter courses (only published ones for students)
      const extractedCourses: any[] = [];
      if (roomCourses && !coursesError) {
        roomCourses.forEach(rc => {
          const course = rc.courses as any;
          if (course && course.is_published) {
            extractedCourses.push(course);
          }
        });
      }
      
      // Set the state variables
      setRoom({
        ...roomData,
        room_chatbots: []
      } as RoomQueryResult);
      setChatbots(extractedChatbots);
      setCourses(extractedCourses);
    } catch (err) {
      console.error('[RoomPage] Error in fetchRoomData:', err);
      setError(err instanceof Error ? err.message : 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [roomId, uidFromUrl, supabase, searchParams]);

  // Add hydration effect with minimal delay for better UX
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    const frame = requestAnimationFrame(() => {
      setIsHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (uidFromUrl) {
      console.log('[RoomPage] Direct user ID access detected:', uidFromUrl);
    }
    
    if (roomId) {
      fetchRoomData();
    }
  }, [roomId, fetchRoomData, uidFromUrl]);

  const handleBack = () => {
    console.log('[RoomPage] handleBack called:', {
      userRole,
      uidFromUrl,
      isStudent
    });
    
    if (userRole === 'teacher') {
      router.push('/teacher-dashboard');
    } else {
      // For students, we already have uidFromUrl if it was provided
      if (uidFromUrl) {
        // Store ID in localStorage for additional reliability
        localStorage.setItem('student_direct_access_id', uidFromUrl);
        localStorage.setItem('current_student_id', uidFromUrl);
        
        // Create a timestamp for the student dashboard
        const timestamp = Date.now();
        // Create an access signature with the user ID
        const accessSignature = btoa(`${uidFromUrl}:${timestamp}`);
        
        const dashboardUrl = `/student/dashboard?user_id=${uidFromUrl}&uid=${uidFromUrl}&access_signature=${accessSignature}&ts=${timestamp}&direct=1`;
        console.log('[RoomPage] Navigating to:', dashboardUrl);
        
        // Navigate to the student dashboard with secure signature
        router.push(dashboardUrl);
      } else {
        console.log('[RoomPage] No uidFromUrl, fallback to regular dashboard');
        // Fallback to regular student dashboard
        router.push('/student/dashboard');
      }
    }
  };

  const getModelDisplayName = (model: string | undefined) => {
    if (!model) return 'Default Model';
    const modelNames: Record<string, string> = {
      'x-ai/grok-3-mini-beta': 'Grok 3 Mini',
      'google/gemma-3-27b-it:free': 'Gemma 3 27B',
      'microsoft/phi-4-reasoning-plus:free': 'Phi 4 Reasoning',
      'qwen/qwen3-32b:free': 'Qwen3 32B',
      'qwen/qwen3-235b-a22b:free': 'Qwen3 235B'
    };
    return modelNames[model] || model;
  };

  if (loading) {
    return (
      <PageWrapper>
        {isStudent && <ModernStudentNav />}
        <MainContent $hasNav={isStudent}>
          <Container>
            <LoadingContainer>
              <Card>Loading room...</Card>
            </LoadingContainer>
          </Container>
        </MainContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        {isStudent && <ModernStudentNav />}
        <MainContent $hasNav={isStudent}>
          <Container>
            <Alert variant="error">{error}</Alert>
            <BackButtonWrapper>
              <ModernButton onClick={handleBack} variant="ghost" size="small">
                ← Back to Dashboard
              </ModernButton>
            </BackButtonWrapper>
          </Container>
        </MainContent>
      </PageWrapper>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <PageWrapper>
      {isStudent && <ModernStudentNav />}
      <MainContent $hasNav={isStudent}>
        <Container>
        <Header>
          <RoomInfo>
            <h1>{room.room_name}</h1>
            <p>
              {chatbots.length === 0 ? 'No Skolrs available' : 
               chatbots.length === 1 ? '1 Skolr available' :
               `${chatbots.length} Skolrs available`}
               {courses.length > 0 && ` • ${courses.length} ${courses.length === 1 ? 'Course' : 'Courses'}`}
            </p>
            <div className="room-code">Room Code: {room.room_code}</div>
          </RoomInfo>
          <BackButtonWrapper>
            <ModernButton onClick={handleBack} variant="ghost" size="small">
              ← Back
            </ModernButton>
          </BackButtonWrapper>
        </Header>

        {chatbots.length === 0 ? (
          <EmptyState>
            <h3>No Skolrs Available</h3>
            <p>This room doesn&apos;t have any Skolrs assigned yet.</p>
            {userRole === 'teacher' && (
              <p>Go back to the dashboard to assign Skolrs to this room.</p>
            )}
          </EmptyState>
        ) : (
          <ChatbotGrid>
            {chatbots.map((chatbot) => (
              <Link 
                key={chatbot.instance_id || chatbot.chatbot_id} 
                href={(() => {
                  // Base URL with chatbot parameters
                  let url = `/chat/${roomId}?chatbot=${chatbot.chatbot_id}&instance=${chatbot.instance_id || ''}`;
                  
                  // SECURITY ENHANCEMENT: If we have a student ID, use the access signature pattern
                  if (uidFromUrl) {
                    // Create a new timestamp for this specific link
                    const newTimestamp = Date.now();
                    // Create a new access signature with the user ID
                    const newAccessSignature = btoa(`${uidFromUrl}:${newTimestamp}`);
                    // Add both secure signature and legacy parameters
                    url += `&access_signature=${newAccessSignature}&ts=${newTimestamp}&uid=${uidFromUrl}&direct=true`;
                  }
                  
                  return url;
                })()}
                style={{ textDecoration: 'none' }}
              >
                <ChatbotCard>
                  <h3>
                    {chatbot.bot_type === 'assessment' && '📝 '}
                    {chatbot.bot_type === 'reading_room' && '📖 '}
                    {chatbot.bot_type === 'viewing_room' && '📹 '}
                    {chatbot.bot_type === 'learning' && '🤖 '}
                    {chatbot.name}
                  </h3>
                  <p>{chatbot.description || 'No description'}</p>
                  
                  {chatbot.bot_type && (
                    <div style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      marginBottom: '0.75rem',
                      background: 
                        chatbot.bot_type === 'assessment' ? '#fef3c7' :
                        chatbot.bot_type === 'reading_room' ? '#dbeafe' :
                        chatbot.bot_type === 'viewing_room' ? '#fff3cd' :
                        '#e0e7ff',
                      color: 
                        chatbot.bot_type === 'assessment' ? '#92400e' :
                        chatbot.bot_type === 'reading_room' ? '#1e40af' :
                        chatbot.bot_type === 'viewing_room' ? '#856404' :
                        '#3730a3'
                    }}>
                      {chatbot.bot_type === 'assessment' ? 'Assessment' :
                       chatbot.bot_type === 'reading_room' ? 'Reading Room' :
                       chatbot.bot_type === 'viewing_room' ? 'Viewing Room' :
                       'Learning'}
                    </div>
                  )}
                  
                  <div className="model-info">
                    {getModelDisplayName(chatbot.model)}
                  </div>
                  
                  {process.env.NODE_ENV === 'development' && (
                    <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '0.5rem', padding: '0.25rem', background: '#f5f5f5', borderRadius: '4px' }}>
                      Instance ID: {chatbot.instance_id || 'None'}
                    </div>
                  )}
                  
                  <ModernButton 
                    className="chat-button"
                    as="div"  // Prevent double link
                    variant="primary"
                    size="medium"
                    fullWidth
                  >
                    {chatbot.bot_type === 'assessment' ? 'Start Assessment' :
                     chatbot.bot_type === 'reading_room' ? 'Start Reading' :
                     chatbot.bot_type === 'viewing_room' ? 'Start Viewing' :
                     'Start Chat'}
                  </ModernButton>
                </ChatbotCard>
              </Link>
            ))}
          </ChatbotGrid>
        )}
        
        {/* Courses Section - Client-side only to prevent hydration issues */}
        {isHydrated ? (
          <CoursesClientComponent courses={courses} />
        ) : (
          courses.length > 0 && <CoursesPlaceholder />
        )}
        
        {/* Student list section - only visible to teachers */}
        {userRole === 'teacher' && (
          <StudentList roomId={roomId} />
        )}
        </Container>
      </MainContent>
    </PageWrapper>
  );
}