'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Container, Card, Button, Alert } from '@/styles/StyledComponents';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Chat from '@/components/shared/Chat';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { Chatbot, BotTypeEnum } from '@/types/database.types';

const PageWrapper = styled.div`
  min-height: 100vh;
  padding: 1rem 0;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 1.5rem;
`;

const ChatContainer = styled(Card)`
  height: 80vh;
  margin-bottom: 1.5rem;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const HeaderBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const UserInfo = styled.div`
  background: ${({ theme }) => theme.colors.backgroundDark};
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  display: inline-block;
  
  span {
    font-weight: bold;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 70vh;
  gap: 2rem;
`;

export default function DirectRoomAccess() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  interface Room {
    room_id: string;
    room_name: string;
    room_code: string;
  }
  
  interface Student {
    user_id: string;
    full_name: string;
    email: string;
    role: string;
  }
  
  // Use the imported types
  
  const [room, setRoom] = useState<Room | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedChatbot, setSelectedChatbot] = useState<string | null>(null);
  
  const roomId = params.roomId as string;
  // Ensure studentId is a string or undefined, not null
  const studentId = searchParams.get('student_id') || localStorage.getItem('student_direct_access_id') || undefined;
  
  // Check access on load
  useEffect(() => {
    const verifyAccess = async () => {
      if (!studentId) {
        setError('Student ID not provided. Please login again.');
        setLoading(false);
        return;
      }
      
      try {
        // First, check if the student exists
        const { data: studentData, error: studentError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, role')
          .eq('user_id', studentId)
          .single();
          
        if (studentError || !studentData) {
          throw new Error('Student not found');
        }
        
        if (studentData.role !== 'student') {
          throw new Error('User is not a student');
        }
        
        setStudent(studentData);
        
        // Verify room membership
        const { data: membershipData, error: membershipError } = await supabase
          .from('room_memberships')
          .select('room_id')
          .eq('student_id', studentId)
          .eq('room_id', roomId)
          .single();
          
        if (membershipError || !membershipData) {
          throw new Error('You are not a member of this room');
        }
        
        // Get room details
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('room_id, room_name, room_code')
          .eq('room_id', roomId)
          .single();
          
        if (roomError || !roomData) {
          throw new Error('Room not found');
        }
        
        setRoom(roomData);
        
        // Get available chatbots in room
        const { data: chatbotData } = await supabase
          .from('room_chatbots')
          .select(`
            chatbots (
              chatbot_id,
              name,
              description,
              bot_type
            )
          `)
          .eq('room_id', roomId);
        // chatbotError removed as it was unused
          
        if (chatbotData) {
          // Process chatbots with proper typing
          const availableChatbots: Chatbot[] = [];
          
          // Process each item safely
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          chatbotData.forEach((item: any) => {
            if (item && item.chatbots) {
              availableChatbots.push({
                chatbot_id: item.chatbots.chatbot_id || '',
                name: item.chatbots.name || 'Unnamed Bot',
                description: item.chatbots.description || '',
                system_prompt: item.chatbots.system_prompt || 'You are a helpful assistant.',
                teacher_id: item.chatbots.teacher_id || 'system',
                created_at: item.chatbots.created_at || new Date().toISOString(),
                bot_type: (item.chatbots.bot_type || 'learning') as BotTypeEnum
              });
            }
          });
            
          // Set chatbots with properly typed array
          setChatbots(availableChatbots as Chatbot[]);
          
          // Select the first chatbot by default
          if (availableChatbots.length > 0) {
            setSelectedChatbot(availableChatbots[0].chatbot_id);
          }
        }
        
      } catch (err) {
        console.error('Error verifying access:', err);
        setError(err instanceof Error ? err.message : 'Failed to verify access');
      } finally {
        setLoading(false);
      }
    };
    
    verifyAccess();
  }, [roomId, studentId, supabase]);
  
  const handleBackToRooms = () => {
    router.push('/student-access');
  };
  
  if (loading) {
    return (
      <PageWrapper>
        <Container>
          <LoadingContainer>
            <LoadingSpinner size="large" />
            <p>Loading room...</p>
          </LoadingContainer>
        </Container>
      </PageWrapper>
    );
  }
  
  if (error || !room || !student) {
    return (
      <PageWrapper>
        <Container>
          <Card>
            <Title>Error</Title>
            <Alert variant="error">{error || 'Could not access this room'}</Alert>
            <Button onClick={handleBackToRooms} style={{ marginTop: '1rem' }}>
              Back to Room List
            </Button>
          </Card>
        </Container>
      </PageWrapper>
    );
  }
  
  return (
    <PageWrapper>
      <Container>
        <HeaderBar>
          <div>
            <Title>{room.room_name}</Title>
            <UserInfo>
              Logged in as: <span>{student.full_name}</span>
            </UserInfo>
          </div>
          
          <div>
            <Button variant="outline" onClick={handleBackToRooms}>
              Back to Room List
            </Button>
          </div>
        </HeaderBar>
        
        {chatbots.length === 0 ? (
          <Alert variant="info">No chatbots available in this room</Alert>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <select 
                value={selectedChatbot || ''} 
                onChange={(e) => setSelectedChatbot(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', width: '100%', maxWidth: '300px' }}
              >
                {chatbots.map(chatbot => (
                  <option key={chatbot.chatbot_id} value={chatbot.chatbot_id}>
                    {chatbot.name}
                  </option>
                ))}
              </select>
            </div>
            
            <ChatContainer>
              {selectedChatbot && (
                <Chat 
                  roomId={roomId}
                  chatbot={chatbots.find(chatbot => chatbot.chatbot_id === selectedChatbot) || {
                    chatbot_id: selectedChatbot || '',
                    name: 'Selected Chatbot',
                    description: '',
                    system_prompt: 'You are a helpful assistant.',
                    teacher_id: 'system',
                    created_at: new Date().toISOString(),
                    bot_type: 'learning' as BotTypeEnum
                  }}
                  directMode={true}
                />
              )}
            </ChatContainer>
          </>
        )}
      </Container>
    </PageWrapper>
  );
}