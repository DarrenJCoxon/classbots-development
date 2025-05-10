// src/app/room/[roomId]/student/[studentId]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Container, Card, Button, Alert } from '@/styles/StyledComponents';
import StudentChatHistory from '@/components/teacher/StudentChatHistory';

const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.lg} 0;
  min-height: 100vh;
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
    align-items: flex-start;
  }
`;

const StudentInfo = styled.div`
  h1 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: 2rem;
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 1.125rem;
  }
`;

const BackButton = styled(Button)`
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
`;

// Define explicit types
interface ChatbotOption {
  chatbot_id: string;
  name: string;
}

// Define a more specific type for the chatbots nested object
interface RoomChatbotResponse {
  chatbot_id: string;
  chatbots: {
    chatbot_id: string;
    name: string;
  } | Array<{
    chatbot_id: string;
    name: string;
  }>;
}

export default function StudentChatPage() {
  const params = useParams();
  const roomId = params?.roomId as string;
  const studentId = params?.studentId as string;
  const [studentName, setStudentName] = useState<string>('Student');
  const [chatbots, setChatbots] = useState<ChatbotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchPageData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      
      // Get student info - handle missing columns gracefully
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', studentId)
        .single();
        
      if (profile) {
        // Try different fields that might contain the name
        // The error suggests profiles.name doesn't exist, so check other fields
        if (profile.full_name) {
          setStudentName(profile.full_name);
        } else if (profile.email) {
          setStudentName(profile.email.split('@')[0]);
        } else if (profile.user_id) {
          // Last resort - use a generic label
          setStudentName('Student');
        }
      }
      
      // Get chatbots in this room
      const { data: roomChatbots } = await supabase
        .from('room_chatbots')
        .select(`
          chatbot_id,
          chatbots:chatbots!inner(
            chatbot_id,
            name
          )
        `)
        .eq('room_id', roomId);
        
      if (roomChatbots && roomChatbots.length > 0) {
        // Extract chatbot data with proper typing
        const chatbotList: ChatbotOption[] = [];
        
        // Type assertion to help TypeScript understand the structure
        const typedRoomChatbots = roomChatbots as unknown as RoomChatbotResponse[];
        
        typedRoomChatbots.forEach(item => {
          // Safely check and extract chatbot data
          if (item.chatbots) {
            if (Array.isArray(item.chatbots)) {
              item.chatbots.forEach(cb => {
                chatbotList.push({
                  chatbot_id: cb.chatbot_id,
                  name: cb.name
                });
              });
            } else {
              // It's a single object, not an array
              const cb = item.chatbots;
              chatbotList.push({
                chatbot_id: cb.chatbot_id,
                name: cb.name
              });
            }
          }
        });
        
        setChatbots(chatbotList);
      }
    } catch (err) {
      console.error('Error loading page data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load page data');
    } finally {
      setLoading(false);
    }
  }, [roomId, studentId, router, supabase]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const handleBack = () => {
    router.push(`/room/${roomId}`);
  };

  if (loading) {
    return (
      <PageWrapper>
        <Container>
          <Card>
            <p>Loading...</p>
          </Card>
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

  return (
    <PageWrapper>
      <Container>
        <Header>
          <StudentInfo>
            <h1>{studentName}</h1>
            <p>Chat History</p>
          </StudentInfo>
          <BackButton 
            variant="outline" 
            onClick={handleBack}
          >
            ← Back to Room
          </BackButton>
        </Header>
        
        <StudentChatHistory
          roomId={roomId}
          studentId={studentId}
          studentName={studentName}
          chatbots={chatbots}
        />
      </Container>
    </PageWrapper>
  );
}