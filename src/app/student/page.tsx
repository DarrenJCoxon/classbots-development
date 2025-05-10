// src/app/student/page.tsx - Modified version
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { Container, Card, Button, Alert } from '@/styles/StyledComponents';
import { createClient } from '@/lib/supabase/client';
import RoomList from '@/components/student/RoomList';
import JoinRoom from '@/components/student/JoinRoom';
import type { StudentRoom } from '@/types/student.types';
import type { User } from '@supabase/supabase-js';

const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.xxl};
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;

const Hero = styled.section`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl} 0;
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 3rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 1.5rem;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const CTAButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg};
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
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
`;

export default function StudentPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<StudentRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fetchRooms = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user is a teacher, if so redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      // If user is a teacher, redirect to teacher dashboard
      if (profile?.role === 'teacher') {
        setIsRedirecting(true);
        router.push('/teacher-dashboard');
        return;
      }

      const response = await fetch('/api/student/rooms');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch rooms');
      }

      setRooms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          setIsRedirecting(true);
          
          // Get user profile to check role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();
          
          if (profile?.role === 'teacher') {
            router.push('/teacher-dashboard');
          } else {
            fetchRooms();
          }
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
        setIsRedirecting(false);
      }
    };

    checkUserAndRedirect();
  }, [router, supabase, fetchRooms]);

  if (loading || isRedirecting) {
    return (
      <PageWrapper>
        <Container>
          <Hero>
            <Title>Loading...</Title>
          </Hero>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Container>
        <Hero>
          <Title>ClassBots AI</Title>
          <Subtitle>AI-powered chatbots for modern classrooms</Subtitle>
          
          {!user && (
            <CTAButtons>
              <Button size="large" onClick={() => router.push('/auth')}>
                Teacher Sign In
              </Button>
              <Button size="large" variant="secondary" onClick={() => router.push('/join')}>
                Student: Join Class
              </Button>
            </CTAButtons>
          )}
        </Hero>

        {error && <Alert variant="error">{error}</Alert>}

        {user && (
          <Actions>
            <Button onClick={() => setShowJoinRoom(true)}>
              Join New Room
            </Button>
          </Actions>
        )}

        {showJoinRoom && (
          <JoinRoom 
            onClose={() => setShowJoinRoom(false)}
            onSuccess={fetchRooms}
          />
        )}

        {user && rooms.length > 0 ? (
          <RoomList rooms={rooms} />
        ) : user ? (
          <EmptyState>
            <h3>No Rooms Yet</h3>
            <p>You haven&apos;t joined any classrooms yet.</p>
            <Button onClick={() => setShowJoinRoom(true)}>
              Join Your First Room
            </Button>
          </EmptyState>
        ) : null}
      </Container>
    </PageWrapper>
  );
}