// src/app/chat/[roomId]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Container, Alert } from '@/styles/StyledComponents';
import Chat from '@/components/shared/Chat';
import type { Chatbot } from '@/types/database.types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

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
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  gap: ${({ theme }) => theme.spacing.md};
`;

interface RoomQueryResult {
  room_id: string;
  room_name: string;
  room_code: string;
  teacher_id: string;
  school_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  room_chatbots: {
    chatbots: Chatbot; // This Chatbot type already includes welcome_message
  }[] | null;
}

export default function ChatPage() {
  const [room, setRoom] = useState<RoomQueryResult | null>(null);
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const roomId = params?.roomId ? String(params.roomId) : null;
  const chatbotIdFromUrl = searchParams.get('chatbot');
  const initialFetchDoneRef = useRef(false);

  useEffect(() => {
    console.log('[ChatPage] Initializing/Params Update. Room ID:', roomId, 'Chatbot ID:', chatbotIdFromUrl);
    if (initialFetchDoneRef.current && (params?.roomId !== roomId || searchParams.get('chatbot') !== chatbotIdFromUrl)) {
        initialFetchDoneRef.current = false;
    }
  }, [roomId, chatbotIdFromUrl, params?.roomId, searchParams]);

  const fetchRoomData = useCallback(async () => {
    if (!roomId || !chatbotIdFromUrl) {
      console.warn("[ChatPage] fetchRoomData: Aborting fetch - RoomID or ChatbotID is missing.", { roomId, chatbotIdFromUrl });
      if (roomId && chatbotIdFromUrl === null) {
          setError("Chatbot ID is required in the URL (e.g., ?chatbot=...).");
      } else if (!roomId && chatbotIdFromUrl){
          setError("Room ID is missing from the URL path.");
      } else if (!roomId && !chatbotIdFromUrl) {
          setError("Both Room ID and Chatbot ID are missing from the URL.");
      }
      setLoading(false);
      return;
    }
    console.log(`[ChatPage] fetchRoomData: Attempting fetch. RoomID: ${roomId}, ChatbotID: ${chatbotIdFromUrl}`);
    setLoading(true);
    setError(null);
    // initialFetchDoneRef.current = true; // Moved to after successful fetch

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        initialFetchDoneRef.current = false;
        throw new Error('Not authenticated');
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
      if (!profile) {
        initialFetchDoneRef.current = false;
        throw new Error('User profile not found');
      }

      const { data: roomData, error: roomError } = await supabase.from('rooms')
        .select(`
          *, 
          room_chatbots!inner(
            chatbots!inner(
              chatbot_id, 
              name, 
              description, 
              system_prompt, 
              model, 
              max_tokens, 
              temperature, 
              enable_rag, 
              bot_type, 
              assessment_criteria_text,
              welcome_message
            )
          )
        `)
        .eq('room_id', roomId)
        .eq('room_chatbots.chatbot_id', chatbotIdFromUrl)
        .single();

      if (roomError) {
        initialFetchDoneRef.current = false;
        throw new Error(roomError.message || 'Data not found. Check room/chatbot association or permissions.');
      }
      if (!roomData) {
        initialFetchDoneRef.current = false;
        throw new Error('No data returned for room/chatbot. Check IDs and permissions.');
      }

      if (profile.role === 'student') {
        const { data: membership } = await supabase.from('room_memberships').select('room_id').eq('room_id', roomId).eq('student_id', user.id).single();
        if (!membership) {
            initialFetchDoneRef.current = false;
            throw new Error('You do not have access to this room');
        }
      } else if (profile.role === 'teacher') {
        const typedRoomData = roomData as RoomQueryResult;
        if (typedRoomData.teacher_id !== user.id) {
            initialFetchDoneRef.current = false;
            throw new Error('You do not own this room');
        }
      }

      const typedRoomData = roomData as RoomQueryResult;
      setRoom(typedRoomData);
      if (typedRoomData.room_chatbots && typedRoomData.room_chatbots.length > 0 && typedRoomData.room_chatbots[0].chatbots) {
        setChatbot(typedRoomData.room_chatbots[0].chatbots);
      } else {
        initialFetchDoneRef.current = false;
        throw new Error('Chatbot details missing in fetched room data.');
      }
      initialFetchDoneRef.current = true; // Mark as done only on full success
    } catch (err) {
      initialFetchDoneRef.current = false; // Allow retry on error
      setError(err instanceof Error ? err.message : 'Failed to load chat page data');
      setChatbot(null); setRoom(null);
    } finally {
      setLoading(false);
    }
  }, [roomId, chatbotIdFromUrl, supabase]); // router removed from deps

  useEffect(() => {
    if (roomId && chatbotIdFromUrl && !initialFetchDoneRef.current) {
      fetchRoomData();
    }
  }, [roomId, chatbotIdFromUrl, fetchRoomData]);

  const handleBack = () => { if (roomId) router.push(`/room/${roomId}`); else router.push('/'); };

  if (loading && !initialFetchDoneRef.current) {
    return <PageWrapper><Container><LoadingContainer><LoadingSpinner size="large" /><p>Loading chat environment...</p></LoadingContainer></Container></PageWrapper>;
  }
  if (error) {
    return <PageWrapper><Container><Alert variant="error">{error}</Alert><BackButton onClick={handleBack} style={{ marginTop: '16px' }}>{'< Back to Room'}</BackButton></Container></PageWrapper>;
  }
  if (!room || !chatbot) {
    return <PageWrapper><Container><Alert variant="info">Chatbot or room information is unavailable. Ensure Chatbot ID is in URL.</Alert><BackButton onClick={handleBack} style={{ marginTop: '16px' }}>{'< Back to Room'}</BackButton></Container></PageWrapper>;
  }

  return (
    <PageWrapper>
      <Container>
        <Header>
          <RoomInfo>
            <h1>{room.room_name}</h1>
            <p>Chatting with: <strong>{chatbot.name}</strong></p>
            {chatbot.bot_type === 'assessment' && <p style={{fontSize: '0.9em', fontStyle: 'italic', color: '#555'}}>This is an Assessment Bot.</p>}
          </RoomInfo>
          <BackButton onClick={handleBack}>
            {'< Back to Room'}
          </BackButton>
        </Header>
        {roomId && <Chat roomId={roomId} chatbot={chatbot} />}
      </Container>
    </PageWrapper>
  );
}