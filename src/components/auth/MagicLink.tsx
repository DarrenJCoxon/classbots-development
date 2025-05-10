// src/components/auth/MagicLink.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, Alert } from '@/styles/StyledComponents';

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
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleMagicLink = async () => {
      // Check if we're in the browser
      if (typeof window === 'undefined') return;

      const params = new URLSearchParams(window.location.search);
      // Get all possible parameters
      const code = params.get('token') || params.get('code');
      const roomCodeParam = params.get('room');
      
      if (!code || !roomCodeParam) {
        console.log('Missing parameters:', { code, roomCodeParam });
        setError('Invalid magic link: missing required parameters');
        setStatus('error');
        return;
      }

      setRoomCode(roomCodeParam);

      try {
        // Exchange code for session using client-side supabase only
        const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
        if (authError) throw authError;

        // Get user data
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError || new Error('No user found');

        // Get room details
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('room_id, school_id')
          .eq('room_code', roomCodeParam)
          .single();

        if (roomError || !room) throw roomError || new Error('Room not found');

        // Create or update user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            { 
              user_id: user.id,
              email: user.email || '',
              role: 'student',
              school_id: room.school_id 
            },
            { onConflict: 'user_id' }
          );

        if (profileError) throw profileError;

        // Join the room
        const { error: joinError } = await supabase
          .from('room_memberships')
          .insert({
            room_id: room.room_id,
            student_id: user.id
          });

        // Ignore duplicate errors
        if (joinError && !joinError.message.includes('duplicate')) {
          throw joinError;
        }

        setStatus('success');
        
        // Redirect to student dashboard after 2 seconds
        setTimeout(() => {
          router.push('/student');
        }, 2000);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process magic link');
        setStatus('error');
      }
    };

    handleMagicLink();
  }, [router, supabase]);

  return (
    <MagicCard>
      <Title>Join Classroom</Title>
      
      {roomCode && (
        <RoomCode>{roomCode}</RoomCode>
      )}

      {status === 'loading' && (
        <SubText>Processing your invitation...</SubText>
      )}

      {status === 'success' && (
        <>
          <Alert variant="success">Successfully joined classroom!</Alert>
          <SubText>Redirecting to your dashboard...</SubText>
        </>
      )}

      {status === 'error' && (
        <>
          <Alert variant="error">{error}</Alert>
          <Button onClick={() => router.push('/auth')}>
            Go to Login
          </Button>
        </>
      )}
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