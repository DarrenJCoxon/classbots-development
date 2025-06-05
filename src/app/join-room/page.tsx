'use client';

import { useState, useEffect, Suspense } from 'react';
import styled from 'styled-components';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input, Alert } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { isValidRoomCode } from '@/lib/utils/room-codes';
import { ModernStudentNav } from '@/components/student/ModernStudentNav';
import { User } from '@supabase/supabase-js';

// Steps for joining a room
enum JoinStep {
  ROOM_CODE = 'room_code',
  STUDENT_NAME = 'student_name',
  JOINING = 'joining',
  COMPLETE = 'complete'
}

const PageWrapper = styled.div<{ $hasNav?: boolean }>`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  position: relative;
  display: flex;
  ${({ $hasNav }) => $hasNav ? '' : 'align-items: center;'}
  ${({ $hasNav }) => $hasNav ? '' : 'justify-content: center;'}
  ${({ $hasNav }) => $hasNav ? '' : 'padding: 24px;'}
  
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

const MainContent = styled.div<{ $hasNav?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  margin-left: ${({ $hasNav }) => $hasNav ? '280px' : '0'};
  min-height: 100vh;
  
  @media (max-width: 768px) {
    margin-left: ${({ $hasNav }) => $hasNav ? '70px' : '0'};
  }
`;

const JoinCard = styled.div`
  width: 100%;
  max-width: 400px;
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 1;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 16px;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.secondary}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Form = styled.form`
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const InputStyled = styled(Input)`
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 24px;
  padding: 16px;
  border: 2px solid rgba(152, 93, 215, 0.2);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(152, 93, 215, 0.1);
  }
`;

const RoomCodeInput = styled(InputStyled)`
  text-transform: uppercase;
  letter-spacing: 0.2em;
`;

const Text = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textLight};
  line-height: 1.5;
`;

const ErrorAlert = styled(Alert)`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const CodeBox = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 2rem;
  font-weight: 600;
  margin: 16px 0;
  border: 3px dashed rgba(152, 93, 215, 0.3);
  padding: 16px;
  border-radius: 12px;
  letter-spacing: 0.2em;
  background: rgba(152, 93, 215, 0.05);
  background-image: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.secondary}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const LoadingFallback = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
`;

function JoinRoomContent() {
  const [currentStep, setCurrentStep] = useState<JoinStep>(JoinStep.ROOM_CODE);
  const [roomCode, setRoomCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isStudent, setIsStudent] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        // Check if user is a student
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();
            
          setIsStudent(profile?.role === 'student');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setAuthLoading(false);
      }
    };
    
    checkAuth();
  }, [supabase]);

  useEffect(() => {
    const codeFromUrl = searchParams?.get('code');
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase());
      
      // If code is provided but can be verified immediately,
      // check if it's valid right away
      if (isValidRoomCode(codeFromUrl.toUpperCase())) {
        // We'll verify the code in this useEffect instead of waiting for submit
        const verifyCodeFromUrl = async () => {
          setIsLoading(true);
          try {
            // Use the API to verify the room code
            const response = await fetch(`/api/student/verify-room-code?code=${codeFromUrl.toUpperCase()}`, {
              method: 'GET',
              credentials: 'include'
            });
            
            if (!response.ok) {
              // Don't set error yet - let the user edit the code manually
              console.warn('Room code from URL not found or invalid:', codeFromUrl);
              setIsLoading(false);
              return;
            }
            
            const result = await response.json();
            
            // Handle standardized API response format
            const data = result.success && result.data ? result.data : result;
            
            if (!data.room) {
              console.warn('Room code from URL returned no room data:', codeFromUrl);
              setIsLoading(false);
              return;
            }

            if (!data.room.is_active) {
              setError('This room is currently inactive. Please contact your teacher.');
              setIsLoading(false);
              return;
            }

            // Room code is valid, move to next step automatically
            setRoomId(data.room.room_id);
            setCurrentStep(JoinStep.STUDENT_NAME);
          } catch (err) {
            console.error('Error validating room code from URL:', err);
            // Silently fail - don't set error so user can edit code manually
          } finally {
            setIsLoading(false);
          }
        };
        
        verifyCodeFromUrl();
      }
    }
  }, [searchParams, supabase]);

  const verifyRoomCode = async () => {
    setIsLoading(true);
    setError('');

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      setIsLoading(false);
      return false;
    }
    
    const formattedCode = roomCode.toUpperCase();
    
    // Validate the room code format
    if (!isValidRoomCode(formattedCode)) {
      setError('Invalid room code format. Codes should be 6 characters (letters and numbers).');
      setIsLoading(false);
      return false;
    }

    try {
      // Use the API to verify the room code - this bypasses any RLS issues
      const response = await fetch(`/api/student/verify-room-code?code=${formattedCode}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error when looking up room code:', formattedCode, errorData);
        
        if (response.status === 404) {
          throw new Error('Room not found. Please check the code and try again.');
        } else {
          throw new Error(errorData.error || 'Error verifying room code. Please try again.');
        }
      }
      
      const result = await response.json();
      
      // Handle standardized API response format
      const data = result.success && result.data ? result.data : result;
      
      if (!data.room) {
        console.error('No room found for code:', formattedCode);
        throw new Error('Room not found. Please check the code and try again.');
      }

      if (!data.room.is_active) {
        throw new Error('This room is currently inactive. Please contact your teacher.');
      }

      setRoomId(data.room.room_id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoomCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await verifyRoomCode();
    if (isValid) {
      setCurrentStep(JoinStep.STUDENT_NAME);
    }
  };

  const handleStudentNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!studentName.trim()) {
      setError('Please enter your name');
      setIsLoading(false);
      return;
    }

    try {
      setCurrentStep(JoinStep.JOINING);

      // Instead of doing auth directly, use our server API that uses admin client
      const response = await fetch('/api/student/join-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          room_code: roomCode,
          student_name: studentName,
          skip_auth: true
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        // Try to get detailed error
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error joining room: ${response.status}`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
          // If JSON parsing fails, use status
          // We need to catch the error but don't use it directly
          throw new Error(`Error joining room: ${response.status}`);
        }
      }

      // Parse the successful response
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to join room');
      }
      
      // Get userId from the response for future use
      const userId = data.userId;
      
      if (!userId) {
        console.warn('User ID not returned in join-room response');
      }
      
      // Room ID might be in the response, but we already have it from earlier steps
      const joinedRoomId = data.roomId || roomId;
      
      // Capture the user ID to pass via URL parameters if cookies/session fails
      const uidParam = userId || data.userId;
      console.log('[Join Room] Captured user ID for URL params if needed:', uidParam);

      // 6. Set complete status and redirect to chat
      setCurrentStep(JoinStep.COMPLETE);
      
      // 7. First, try to find a chatbot for this room
      try {
        // Use the room-chatbots API for reliable access
        const roomChatbotsResponse = await fetch(`/api/student/room-chatbots?roomId=${joinedRoomId}`, {
          method: 'GET',
          credentials: 'include'
        });
        
        // Parse response first to avoid trying to parse it twice
        let chatbotData;
        try {
          chatbotData = await roomChatbotsResponse.json();
        } catch (parseError) {
          console.error('Error parsing chatbot data:', parseError);
          // No chatbot data, go to room selection with UID param for fallback auth
          setTimeout(() => {
            router.push(`/room/${joinedRoomId}${uidParam ? `?uid=${uidParam}` : ''}`);
          }, 1500);
          return;
        }
        
        if (!roomChatbotsResponse.ok || !chatbotData.chatbots?.length) {
          console.warn('No chatbots found for room, redirecting to room selection page');
          // No chatbot found, go to room selection with UID param for fallback auth
          setTimeout(() => {
            router.push(`/room/${joinedRoomId}${uidParam ? `?uid=${uidParam}` : ''}`);
          }, 1500);
          return;
        }
        
        // Always redirect to the room first, regardless of the number of chatbots
        console.log(`Found ${chatbotData.chatbots.length} chatbots, redirecting to room selection`);
        setTimeout(() => {
          // Include UID param for fallback auth
          router.push(`/room/${joinedRoomId}${uidParam ? `?uid=${uidParam}` : ''}`);
        }, 1500);
      } catch (error) {
        console.error('Error finding chatbots:', error);
        // Fall back to just room selection with UID param
        setTimeout(() => {
          router.push(`/room/${joinedRoomId}${uidParam ? `?uid=${uidParam}` : ''}`);
        }, 1500);
      }

    } catch (err) {
      console.error('Error in student creation:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setCurrentStep(JoinStep.STUDENT_NAME);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Enter Room Code
  if (currentStep === JoinStep.ROOM_CODE) {
    return (
      <PageWrapper $hasNav={!authLoading && isStudent}>
        {!authLoading && isStudent && <ModernStudentNav />}
        <MainContent $hasNav={!authLoading && isStudent}>
          <JoinCard>
          <Title>Join Classroom</Title>
          
          <Text>
            Enter your classroom code to get started. You&apos;ll be asked to provide your name after this step.
          </Text>
          
          {error && <ErrorAlert variant="error">{error}</ErrorAlert>}
          
          <Form onSubmit={handleRoomCodeSubmit}>
            <RoomCodeInput
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              autoFocus
              readOnly={false}
              disabled={isLoading}
            />
            
            <ModernButton 
              type="submit" 
              disabled={isLoading} 
              style={{ width: '100%' }} 
              size="large"
            >
              {isLoading ? 'Checking...' : 'Continue'}
            </ModernButton>
          </Form>
          </JoinCard>
        </MainContent>
      </PageWrapper>
    );
  }

  // Step 2: Enter Student Name
  if (currentStep === JoinStep.STUDENT_NAME) {
    return (
      <PageWrapper $hasNav={!authLoading && isStudent}>
        {!authLoading && isStudent && <ModernStudentNav />}
        <MainContent $hasNav={!authLoading && isStudent}>
          <JoinCard>
          <Title>Join Classroom</Title>
          
          <Text>
            Please enter your name to join the classroom.
          </Text>
          
          <CodeBox>Room: {roomCode}</CodeBox>
          
          {error && <ErrorAlert variant="error">{error}</ErrorAlert>}
          
          <Form onSubmit={handleStudentNameSubmit}>
            <InputStyled
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Your Name"
              autoFocus
              required
              disabled={isLoading}
            />
            <ModernButton 
              type="submit" 
              disabled={isLoading} 
              style={{ width: '100%' }} 
              size="large"
            >
              {isLoading ? 'Joining...' : 'Join Classroom'}
            </ModernButton>
          </Form>
          </JoinCard>
        </MainContent>
      </PageWrapper>
    );
  }

  // Step 3: Joining (Loading state)
  if (currentStep === JoinStep.JOINING) {
    return (
      <PageWrapper $hasNav={!authLoading && isStudent}>
        {!authLoading && isStudent && <ModernStudentNav />}
        <MainContent $hasNav={!authLoading && isStudent}>
          <JoinCard>
          <Title>Joining Classroom</Title>
          <CodeBox>Room: {roomCode}</CodeBox>
          <Text>Setting up your account...</Text>
          <LoadingSpinner />
          </JoinCard>
        </MainContent>
      </PageWrapper>
    );
  }

  // Step 4: Complete
  return (
    <PageWrapper $hasNav={!authLoading && isStudent}>
      {!authLoading && isStudent && <ModernStudentNav />}
      <MainContent $hasNav={!authLoading && isStudent}>
        <JoinCard>
        <Title>Successfully Joined!</Title>
        <CodeBox>Room: {roomCode}</CodeBox>
        <Alert variant="success">Welcome to the classroom, {studentName}!</Alert>
        <Text>Redirecting to your classroom...</Text>
        <LoadingSpinner />
        </JoinCard>
      </MainContent>
    </PageWrapper>
  );
}

export default function JoinRoomPage() {
  return (
    <Suspense fallback={<LoadingFallback><LoadingSpinner /></LoadingFallback>}>
      <JoinRoomContent />
    </Suspense>
  );
}