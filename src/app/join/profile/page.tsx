'use client';

import { useState, useEffect, Suspense } from 'react';
import styled from 'styled-components';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, Input, Alert } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { isValidRoomCode } from '@/lib/utils/room-codes';

const PageWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.backgroundDark};
`;

const ProfileCard = styled(Card)`
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

const NameInput = styled(Input)`
  font-size: 1.2rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}30;
  }
`;

const Text = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textLight};
  line-height: 1.5;
`;

const CodeBox = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  margin: ${({ theme }) => theme.spacing.md} 0;
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  letter-spacing: 0.1em;
  background: ${({ theme }) => theme.colors.primary}10;
`;

const LoadingFallback = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
`;

function ProfileContent() {
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const roomCode = searchParams?.get('code') || '';

  useEffect(() => {
    // If no room code is provided, redirect to join page
    if (!roomCode) {
      router.push('/join-room');
      return;
    }
    
    // Also validate the room code format
    if (!isValidRoomCode(roomCode)) {
      setError('Invalid room code format');
      router.push('/join-room');
    }
  }, [roomCode, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your name');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Find the room by code with consistent approach
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('room_id, is_active')
        .eq('room_code', roomCode)
        .single();

      if (roomError) {
        console.error('Error when looking up room by code:', roomCode, roomError);
        // Check if this is a "no rows" error (PGRST116) vs. a real database error
        if (roomError.code === 'PGRST116') {
          throw new Error('Room not found. Please check the code and try again.');
        } else {
          throw new Error('Database error when looking up room: ' + roomError.message);
        }
      }
      
      if (!room) {
        console.error('No room found but also no error for code:', roomCode);
        throw new Error('Room not found. Please check the code and try again.');
      }

      if (!room.is_active) {
        throw new Error('This room is currently inactive. Please contact your teacher.');
      }

      // 2. Generate a temporary anonymous account
      const timestamp = new Date().getTime();
      const randomId = Math.random().toString(36).substring(2, 12);
      const tempEmail = `anonymous-${timestamp}-${randomId}@temp.classbots.ai`;
      const tempPassword = Math.random().toString(36).substring(2, 14);

      // 3. Sign up with anonymous credentials
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          data: {
            role: 'student',
            full_name: fullName,
            is_anonymous: true
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error('Failed to create temporary account');
      }

      // 4. Sign in with the anonymous account
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: tempPassword,
      });
      // signInData is unused in this process

      if (signInError) {
        throw signInError;
      }

      // 5. Create a profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: signUpData.user.id,
          email: tempEmail,
          full_name: fullName,
          role: 'student',
          is_anonymous: true
        });

      if (profileError) {
        throw profileError;
      }

      // 6. Join the room
      const { error: joinError } = await supabase
        .from('room_memberships')
        .insert({
          room_id: room.room_id,
          student_id: signUpData.user.id
        });

      if (joinError) {
        throw joinError;
      }

      // 7. Redirect to student dashboard
      router.push('/student/dashboard');

    } catch (err) {
      console.error('Error in profile creation:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!roomCode) {
    return (
      <PageWrapper>
        <LoadingSpinner />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <ProfileCard>
        <Title>Join Classroom</Title>
        
        <Text>
          Please enter your name to join the classroom.
        </Text>
        
        <CodeBox>Room: {roomCode}</CodeBox>
        
        {error && <Alert variant="error">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <NameInput
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your Name"
            autoFocus
            required
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
      </ProfileCard>
    </PageWrapper>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<LoadingFallback><LoadingSpinner /></LoadingFallback>}>
      <ProfileContent />
    </Suspense>
  );
}