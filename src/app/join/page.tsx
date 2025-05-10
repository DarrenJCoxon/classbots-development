// src/app/join/page.tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import styled from 'styled-components';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Container, Card, Button, Input, Alert } from '@/styles/StyledComponents';

const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.xxl};
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;

const JoinCard = styled(Card)`
  max-width: 400px;
  margin: 4rem auto;
  text-align: center;
`;

const Title = styled.h1`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.primary};
`;

const Form = styled.form`
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const RoomCodeInput = styled(Input)`
  text-align: center;
  text-transform: uppercase;
  font-size: 1.5rem;
  letter-spacing: 0.1em;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Text = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textLight};
`;

const LoadingFallback = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textMuted};
`;

function JoinPageContent() {
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const checkAuthentication = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setIsAuthenticated(true);
      
      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        setUserRole(profile.role);
      }
    }
  }, [supabase]);

  useEffect(() => {
    // Get room code from URL parameter
    const codeFromUrl = searchParams?.get('code');
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase());
    }
    
    checkAuthentication();
  }, [searchParams, checkAuthentication]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formattedCode = roomCode.toUpperCase();

    try {
      // Check if the room exists first
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('room_id, is_active')
        .eq('room_code', formattedCode)
        .single();

      if (roomError || !room) {
        throw new Error('Room not found');
      }

      if (!room.is_active) {
        throw new Error('Room is inactive');
      }

      if (isAuthenticated && userRole === 'student') {
        // If already authenticated as student, try to join directly
        const response = await fetch('/api/student/join-room', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ room_code: formattedCode }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to join room');
        }

        // Redirect to student dashboard
        router.push('/student');
      } else if (!isAuthenticated) {
        // If not authenticated, redirect to student signup with room code
        router.push(`/auth?type=student&redirect=/join?code=${formattedCode}`);
      } else {
        // If authenticated but not a student, show error
        throw new Error('You need to log in with a student account to join this room.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <PageWrapper>
        <Container>
          <JoinCard>
            <Title>Join Your Class</Title>
            <Text>You need to create a student account to join this classroom.</Text>
            
            <Button 
              onClick={() => router.push(`/auth?type=student&redirect=/join?code=${roomCode}`)}
              style={{ width: '100%' }}
            >
              Create Student Account
            </Button>
            
            {roomCode && (
              <Text style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
                Room code: <strong>{roomCode}</strong>
              </Text>
            )}
          </JoinCard>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Container>
        <JoinCard>
          <Title>Join Your Class</Title>
          <Text>Enter the room code your teacher provided</Text>
          
          {error && <Alert variant="error">{error}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <RoomCodeInput
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              required
            />
            <Button type="submit" disabled={isLoading} style={{ width: '100%' }}>
              {isLoading ? 'Joining...' : 'Join Class'}
            </Button>
          </Form>
        </JoinCard>
      </Container>
    </PageWrapper>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<LoadingFallback>Loading...</LoadingFallback>}>
      <JoinPageContent />
    </Suspense>
  );
}