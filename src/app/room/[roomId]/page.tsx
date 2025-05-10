// src/app/room/[roomId]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Container, Card, Alert, Button } from '@/styles/StyledComponents';
import StudentList from '@/components/teacher/StudentList';
import type { Chatbot } from '@/types/database.types';

const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.lg} 0;
  min-height: 100vh;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md} 0;
  }
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column-reverse;
    gap: ${({ theme }) => theme.spacing.md};
    margin-bottom: ${({ theme }) => theme.spacing.lg};
  }
`;

const RoomInfo = styled.div`
  h1 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: 2rem;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 1.5rem;
      text-align: center;
    }
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 1.125rem;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 1rem;
      text-align: center;
    }
  }
  
  .room-code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
    margin-top: ${({ theme }) => theme.spacing.xs};
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      text-align: center;
    }
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
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    justify-content: center;
  }
`;

const ChatbotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};
  margin-top: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing.md};
  }
`;

const ChatbotCard = styled(Card)`
  position: relative;
  transition: transform ${({ theme }) => theme.transitions.fast}, box-shadow ${({ theme }) => theme.transitions.fast};
  cursor: pointer;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
  
  h3 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: 1.5rem;
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: ${({ theme }) => theme.spacing.lg};
    min-height: 3rem;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      min-height: auto;
    }
  }
  
  .model-info {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textMuted};
    background: ${({ theme }) => theme.colors.backgroundDark};
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.borderRadius.small};
    margin-bottom: ${({ theme }) => theme.spacing.lg};
    display: inline-block;
  }
  
  .chat-button {
    width: 100%;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      min-height: 44px;
    }
  }
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
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.xl};
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

export default function RoomPage() {
  const [room, setRoom] = useState<RoomQueryResult | null>(null);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const params = useParams();
  const roomId = params?.roomId as string;
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
      setUserRole(profile.role);

      // First, ensure we have access to this room
      let hasAccess = false;
      if (profile.role === 'teacher') {
        // For teachers, check if they own the room
        const { data: teacherRoom } = await supabase
          .from('rooms')
          .select('room_id')
          .eq('room_id', roomId)
          .eq('teacher_id', user.id)
          .single();
        
        hasAccess = !!teacherRoom;
      } else if (profile.role === 'student') {
        // For students, check if they're a member of the room
        const { data: membership } = await supabase
          .from('room_memberships')
          .select('room_id')
          .eq('room_id', roomId)
          .eq('student_id', user.id)
          .single();
        
        hasAccess = !!membership;
      }

      if (!hasAccess) {
        throw new Error('You do not have access to this room');
      }

      // Get basic room info
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (roomError || !roomData) {
        throw new Error('Room not found');
      }

      // Retrieve chatbots using a two-step process to bypass potential RLS issues
      // Step 1: Get chatbot IDs for this room
      const { data: roomChatbots, error: rcError } = await supabase
        .from('room_chatbots')
        .select('chatbot_id')
        .eq('room_id', roomId);

      if (rcError) {
        console.error('Error fetching room-chatbot relations:', rcError);
        throw new Error('Failed to retrieve chatbot information');
      }

      // Step 2: Get the chatbot details
      const extractedChatbots: Chatbot[] = [];
      
      if (roomChatbots && roomChatbots.length > 0) {
        const chatbotIds = roomChatbots.map(rc => rc.chatbot_id);
        
        const { data: chatbots, error: chatbotsError } = await supabase
          .from('chatbots')
          .select('*')
          .in('chatbot_id', chatbotIds);

        if (chatbotsError) {
          console.error('Error fetching chatbots:', chatbotsError);
          throw new Error('Failed to retrieve chatbot information');
        }
        
        extractedChatbots.push(...(chatbots || []));
      }
      
      // Set the state variables
      setRoom({
        ...roomData,
        room_chatbots: []
      } as RoomQueryResult);
      setChatbots(extractedChatbots);
    } catch (err) {
      console.error('Error in fetchRoomData:', err);
      setError(err instanceof Error ? err.message : 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [roomId, supabase]);

  useEffect(() => {
    if (roomId) {
      fetchRoomData();
    }
  }, [roomId, fetchRoomData]);

  const handleBack = () => {
    if (userRole === 'teacher') {
      router.push('/teacher-dashboard');
    } else {
      router.push('/student');
    }
  };

  const getModelDisplayName = (model: string | undefined) => {
    if (!model) return 'Default Model';
    const modelNames: Record<string, string> = {
      'x-ai/grok-3-mini-beta': 'Grok 3 Mini',
      'google/gemma-3-27b-it:free': 'Gemma 3 27B',
      'microsoft/phi-4-reasoning-plus:free': 'Phi 4 Reasoning',
      'qwen/qwen3-32b:free': 'Qwen3 32B',
      'qwen/qwen3-235b-a22b:free': 'Qwen3 235B'
    };
    return modelNames[model] || model;
  };

  if (loading) {
    return (
      <PageWrapper>
        <Container>
          <LoadingContainer>
            <Card>Loading room...</Card>
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
            ← Back to Dashboard
          </BackButton>
        </Container>
      </PageWrapper>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <PageWrapper>
      <Container>
        <Header>
          <RoomInfo>
            <h1>{room.room_name}</h1>
            <p>
              {chatbots.length === 0 ? 'No chatbots available' : 
               chatbots.length === 1 ? '1 chatbot available' :
               `${chatbots.length} chatbots available`}
            </p>
            <div className="room-code">Room Code: {room.room_code}</div>
          </RoomInfo>
          <BackButton onClick={handleBack}>
            ← Back
          </BackButton>
        </Header>

        {chatbots.length === 0 ? (
          <EmptyState>
            <h3>No Chatbots Available</h3>
            <p>This room doesn&apos;t have any chatbots assigned yet.</p>
            {userRole === 'teacher' && (
              <p>Go back to the dashboard to assign chatbots to this room.</p>
            )}
          </EmptyState>
        ) : (
          <ChatbotGrid>
            {chatbots.map((chatbot) => (
              <Link 
                key={chatbot.chatbot_id} 
                href={`/chat/${roomId}?chatbot=${chatbot.chatbot_id}`}
                style={{ textDecoration: 'none' }}
              >
                <ChatbotCard>
                  <h3>{chatbot.name}</h3>
                  <p>{chatbot.description || 'No description'}</p>
                  
                  <div className="model-info">
                    {getModelDisplayName(chatbot.model)}
                  </div>
                  
                  <Button 
                    className="chat-button"
                    as="div"  // Prevent double link
                  >
                    Start Chat
                  </Button>
                </ChatbotCard>
              </Link>
            ))}
          </ChatbotGrid>
        )}
        
        {/* Student list section - only visible to teachers */}
        {userRole === 'teacher' && (
          <StudentList roomId={roomId} />
        )}
      </Container>
    </PageWrapper>
  );
}