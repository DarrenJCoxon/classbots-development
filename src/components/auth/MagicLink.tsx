// src/components/auth/MagicLink.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, Alert } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const MagicCard = styled(Card)`
  max-width: 400px;
  margin: 4rem auto;
  text-align: center;
`;

const Title = styled.h1`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.primary};
`;

const SubText = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.textLight};
`;

const RoomCode = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 2rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  margin: ${({ theme }) => theme.spacing.lg} 0;
  border: 3px dashed ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  letter-spacing: 0.2em;
  background: ${({ theme }) => theme.colors.primary}10;
`;

function MagicLinkContent() {
  const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  // roomId is used in the success handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [roomId, setRoomId] = useState<string>('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Function to handle the magic link process
    const handleMagicLink = async () => {
      // Check if we're in the browser
      if (typeof window === 'undefined') return;

      try {
        // Get parameters from URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const roomCodeParam = params.get('room');
        
        if (!token || !roomCodeParam) {
          console.error('Missing token or room code parameters');
          setError('Invalid magic link: missing parameters');
          setStatus('error');
          return;
        }
        
        setRoomCode(roomCodeParam);
        setStatus('processing');
        
        // Skip the room check - go directly to the API
        // This avoids potential permission issues with checking the room table
        
        // Process the magic link to join the room
        const response = await fetch('/api/auth/magic-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            room_code: roomCodeParam,
          }),
        });

        // Handle any response errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMessage = errorData?.error || `Error ${response.status}: Failed to join room`;
          throw new Error(errorMessage);
        }

        // Process the successful response
        const data = await response.json();
        setRoomId(data.room_id);
        setStatus('success');
        
        // Store user ID in localStorage for dashboard access
        if (data.user_id) {
          localStorage.setItem('student_direct_access_id', data.user_id);
          localStorage.setItem('current_student_id', data.user_id);
        }
        
        // Create access signature for direct access
        const timestamp = Date.now();
        const accessSignature = btoa(`${data.user_id}:${timestamp}`);
        
        // Redirect to chat with access signature
        setTimeout(() => {
          router.push(`/chat/${data.room_id}?direct=true&access_signature=${accessSignature}&ts=${timestamp}&uid=${data.user_id}`);
        }, 1500);
      } catch (err) {
        console.error('Magic link error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to process magic link';
        setError(errorMessage);
        setStatus('error');
      }
    };

    // Execute the function
    handleMagicLink();
  }, [router, supabase]);

  // Loading or processing state
  if (status === 'loading' || status === 'processing') {
    return (
      <MagicCard>
        <Title>Joining Classroom</Title>
        {roomCode && <RoomCode>{roomCode}</RoomCode>}
        <SubText>
          {status === 'loading' 
            ? 'Processing your magic link...' 
            : 'Setting up your account...'}
        </SubText>
        <LoadingSpinner />
      </MagicCard>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <MagicCard>
        <Title>Joined Classroom</Title>
        {roomCode && <RoomCode>{roomCode}</RoomCode>}
        <Alert variant="success">Successfully joined classroom!</Alert>
        <SubText>Redirecting to the classroom chat...</SubText>
        <LoadingSpinner />
      </MagicCard>
    );
  }

  // Error state
  return (
    <MagicCard>
      <Title>Error Joining Classroom</Title>
      {roomCode && <RoomCode>{roomCode}</RoomCode>}
      <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>
      
      <Button onClick={() => router.push(`/join-room?code=${roomCode}`)} style={{ marginTop: '16px' }}>
        Try Joining with Room Code
      </Button>
    </MagicCard>
  );
}

export default function MagicLink() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MagicLinkContent />
    </Suspense>
  );
}