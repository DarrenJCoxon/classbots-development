// src/app/chat/[roomId]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Container, Card, Alert } from '@/styles/StyledComponents';
import Chat from '@/components/shared/Chat';
import type { Chatbot } from '@/types/database.types';

const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.lg} 0;
  min-height: 100vh;
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RoomInfo = styled.div`
  h1 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: 1.75rem;
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.backgroundCard};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    background: ${({ theme }) => theme.colors.backgroundDark};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
`;

interface RoomQueryResult {
  room_id: string;
  room_name: string;
  room_code: string;
  teacher_id: string;
  school_id: string;
  is_active: boolean;
  created_at: string;
  room_chatbots: {
    chatbots: Chatbot;
  }[] | null;
}

export default function ChatPage() {
  const [room, setRoom] = useState<RoomQueryResult | null>(null);
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params?.roomId as string;
  const chatbotId = searchParams.get('chatbot');
  const router = useRouter();
  const supabase = createClient();

  const fetchRoomData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Fetch room data with chatbots
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select(`
          *,
          room_chatbots!left(
            chatbots!inner(
              chatbot_id,
              name,
              description,
              system_prompt,
              model,
              max_tokens,
              temperature
            )
          )
        `)
        .eq('room_id', roomId)
        .single();

      if (roomError) {
        console.error('Room error:', roomError);
        throw new Error('Room not found');
      }

      if (!roomData) {
        throw new Error('Room not found');
      }

      // Check access permissions
      if (profile.role === 'student') {
        const { data: membership } = await supabase
          .from('room_memberships')
          .select('room_id')
          .eq('room_id', roomId)
          .eq('student_id', user.id)
          .single();

        if (!membership) {
          throw new Error('You do not have access to this room');
        }
      } else if (profile.role === 'teacher') {
        if (roomData.teacher_id !== user.id) {
          throw new Error('You do not own this room');
        }
      }

      const typedRoomData = roomData as RoomQueryResult;
      setRoom(typedRoomData);

      // Extract chatbot data
      const fetchedChatbots = (typedRoomData.room_chatbots
        ?.map(rc => rc.chatbots)
        .filter(Boolean)) as Chatbot[];
      
      // Find the specific chatbot if chatbotId is provided
      if (chatbotId && fetchedChatbots) {
        const selectedChatbot = fetchedChatbots.find(cb => cb.chatbot_id === chatbotId);
        if (selectedChatbot) {
          setChatbot(selectedChatbot);
        } else {
          throw new Error('Chatbot not found in this room');
        }
      } else if (fetchedChatbots?.length > 0 && !chatbotId) {
        // No chatbot specified, redirect to room page
        router.replace(`/room/${roomId}`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [roomId, chatbotId, router, supabase]);

  useEffect(() => {
    if (roomId) {
      fetchRoomData();
    }
  }, [roomId, fetchRoomData]);

  const handleBack = () => {
    // Always go back to the room page, regardless of user role
    router.push(`/room/${roomId}`);
  };

  if (loading) {
    return (
      <PageWrapper>
        <Container>
          <LoadingContainer>
            <Card>Loading...</Card>
          </LoadingContainer>
        </Container>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <Container>
          <Alert variant="error">{error}</Alert>
          <BackButton onClick={handleBack}>
            ← Back to Room
          </BackButton>
        </Container>
      </PageWrapper>
    );
  }

  if (!room || !chatbot) {
    return null;
  }

  return (
    <PageWrapper>
      <Container>
        <Header>
          <RoomInfo>
            <h1>{room.room_name}</h1>
            <p>Chatting with {chatbot.name}</p>
          </RoomInfo>
          <BackButton onClick={handleBack}>
            ← Back to Room
          </BackButton>
        </Header>
        
        <Chat 
          roomId={roomId}
          chatbot={chatbot}
        />
      </Container>
    </PageWrapper>
  );
}