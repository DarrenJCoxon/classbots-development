'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Card, Button, Input, Alert } from '@/styles/StyledComponents';

const PageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 90vh;
  background: ${({ theme }) => theme.colors.backgroundDark};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const JoinCard = styled(Card)`
  width: 100%;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.primary};
`;

const RoomCode = styled.div`
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

const Text = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.textLight};
  line-height: 1.5;
`;

const Form = styled.form`
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const StyledInput = styled(Input)`
  font-size: 1.2rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

// For Next.js 15.3.1, we need to use any for the page props
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SimpleRoomJoinPage(props: any) {
  const { params } = props;
  const [roomCode, setRoomCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [status, setStatus] = useState<'ready' | 'checking' | 'joining' | 'success' | 'error'>('ready');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Set room code from URL parameter
    if (params.code) {
      setRoomCode(params.code.toUpperCase());
    }
  }, [params.code]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    try {
      setStatus('joining');
      setError('');
      
      // Simple direct join with minimal complexity
      const response = await fetch('/api/student/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          room_code: roomCode,
          student_name: studentName,
          skip_auth: true // Signal to the API to use a simplified flow
        }),
      });
      
      if (!response.ok) {
        // Try to get JSON error if available
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error: Failed to join room`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
          // If JSON parsing fails, use the response status
          // Variable is not used directly but needed for catch block
          throw new Error(`Error: Failed to join room (${response.status})`);
        }
      }
      
      const data = await response.json();
      
      // Show success message briefly
      setStatus('success');
      
      // Redirect to chat or student dashboard
      setTimeout(() => {
        if (data.roomId) {
          router.push(`/chat/${data.roomId}`);
        } else {
          router.push('/student/dashboard');
        }
      }, 1500);
    } catch (err) {
      console.error('Error joining room:', err);
      setError(err instanceof Error ? err.message : 'Failed to join room');
      setStatus('error');
    }
  };
  
  return (
    <PageContainer>
      <JoinCard>
        <Title>Join Classroom</Title>
        
        {roomCode && (
          <>
            <Text>You&apos;re joining a classroom with code:</Text>
            <RoomCode>{roomCode}</RoomCode>
          </>
        )}
        
        {status === 'ready' || status === 'error' ? (
          <>
            <Text>Please enter your name to continue:</Text>
            
            {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
            
            <Form onSubmit={handleJoin}>
              <StyledInput
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Your Name"
                autoFocus
                required
              />
              
              <Button 
                type="submit" 
                size="large" 
                style={{ width: '100%' }}
                disabled={['joining', 'checking'].includes(status)}
              >
                Join Classroom
              </Button>
            </Form>
          </>
        ) : status === 'joining' ? (
          <>
            <Text>Setting up your access...</Text>
            <LoadingSpinner />
          </>
        ) : status === 'success' ? (
          <>
            <Alert variant="success">Successfully joined!</Alert>
            <Text>Taking you to the classroom chat...</Text>
            <LoadingSpinner />
          </>
        ) : null}
      </JoinCard>
    </PageContainer>
  );
}