// src/components/student/JoinRoom.tsx
'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { Card, Button, Input, Alert } from '@/styles/StyledComponents';
import { isValidRoomCode } from '@/lib/utils/room-codes';
import { createClient } from '@/lib/supabase/client';

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
  const router = useRouter();

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
      // First check if the room exists
      const supabase = createClient();
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('room_id, is_active')
        .eq('room_code', formattedCode)
        .single();

      if (roomError) {
        if (roomError.code === 'PGRST116') { // No rows returned
          setError('Room not found. Please check the code and try again.');
        } else {
          setError('Error checking room. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      if (!room.is_active) {
        setError('This room is currently inactive. Please contact your teacher.');
        setIsLoading(false);
        return;
      }

      // Room exists and is active - redirect to the join room page
      router.push(`/join-room?code=${formattedCode}`);
      
      // Close the modal
      onClose();
      
      // Call the success callback
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
      setIsLoading(false);
    }
  };

  return (
    <Overlay>
      <JoinCard>
        <Header>
          <Title>Join Classroom</Title>
          <Description>
            Enter the room code provided by your teacher
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
            autoFocus
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
              {isLoading ? 'Joining...' : 'Continue'}
            </Button>
          </ButtonGroup>
        </Form>
      </JoinCard>
    </Overlay>
  );
}