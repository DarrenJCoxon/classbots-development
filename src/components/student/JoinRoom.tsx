// src/components/student/JoinRoom.tsx
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, Input, Alert } from '@/styles/StyledComponents';
import { isValidRoomCode } from '@/lib/utils/room-codes';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const JoinCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  margin: 20px;
  position: relative;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h2`
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text};
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const RoomCodeInput = styled(Input)`
  text-align: center;
  text-transform: uppercase;
  font-size: 1.5rem;
  letter-spacing: 0.1em;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
`;

interface JoinRoomProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function JoinRoom({ onClose, onSuccess }: JoinRoomProps) {
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formattedCode = roomCode.toUpperCase();

    if (!isValidRoomCode(formattedCode)) {
      setError('Invalid room code format');
      setIsLoading(false);
      return;
    }

    try {
      if (!isAuthenticated) {
        // If not authenticated, redirect to signup with room code
        router.push(`/auth?type=student&redirect=/join?code=${formattedCode}`);
        return;
      }

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

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <Overlay>
        <JoinCard>
          <Header>
            <Title>Loading...</Title>
          </Header>
        </JoinCard>
      </Overlay>
    );
  }

  return (
    <Overlay>
      <JoinCard>
        <Header>
          <Title>Join Classroom</Title>
          <Description>
            {isAuthenticated 
              ? 'Enter the room code provided by your teacher'
              : 'You need to log in to join a classroom'
            }
          </Description>
        </Header>

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
          
          <ButtonGroup>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              style={{ flex: 1 }}
            >
              {isLoading ? 'Joining...' : isAuthenticated ? 'Join Room' : 'Sign In'}
            </Button>
          </ButtonGroup>
        </Form>
      </JoinCard>
    </Overlay>
  );
}