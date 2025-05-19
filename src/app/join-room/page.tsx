'use client';

import { useState, useEffect, Suspense } from 'react';
import styled from 'styled-components';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, Input, Alert } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { isValidRoomCode } from '@/lib/utils/room-codes';

// Steps for joining a room
enum JoinStep {
  ROOM_CODE = 'room_code',
  STUDENT_NAME = 'student_name',
  JOINING = 'joining',
  COMPLETE = 'complete'
}

const PageWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.backgroundDark};
`;

const JoinCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.primary};
`;

const Form = styled.form`
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const InputStyled = styled(Input)`
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}30;
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
  color: ${({ theme }) => theme.colors.primary};
  margin: ${({ theme }) => theme.spacing.md} 0;
  border: 3px dashed ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  letter-spacing: 0.2em;
  background: ${({ theme }) => theme.colors.primary}10;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

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
            
            const data = await response.json();
            
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
      
      const data = await response.json();
      
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
      <PageWrapper>
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
            
            <Button 
              type="submit" 
              disabled={isLoading} 
              style={{ width: '100%' }} 
              size="large"
            >
              {isLoading ? 'Checking...' : 'Continue'}
            </Button>
          </Form>
        </JoinCard>
      </PageWrapper>
    );
  }

  // Step 2: Enter Student Name
  if (currentStep === JoinStep.STUDENT_NAME) {
    return (
      <PageWrapper>
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
            <Button 
              type="submit" 
              disabled={isLoading} 
              style={{ width: '100%' }} 
              size="large"
            >
              {isLoading ? 'Joining...' : 'Join Classroom'}
            </Button>
          </Form>
        </JoinCard>
      </PageWrapper>
    );
  }

  // Step 3: Joining (Loading state)
  if (currentStep === JoinStep.JOINING) {
    return (
      <PageWrapper>
        <JoinCard>
          <Title>Joining Classroom</Title>
          <CodeBox>Room: {roomCode}</CodeBox>
          <Text>Setting up your account...</Text>
          <LoadingSpinner />
        </JoinCard>
      </PageWrapper>
    );
  }

  // Step 4: Complete
  return (
    <PageWrapper>
      <JoinCard>
        <Title>Successfully Joined!</Title>
        <CodeBox>Room: {roomCode}</CodeBox>
        <Alert variant="success">Welcome to the classroom, {studentName}!</Alert>
        <Text>Redirecting to your classroom...</Text>
        <LoadingSpinner />
      </JoinCard>
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