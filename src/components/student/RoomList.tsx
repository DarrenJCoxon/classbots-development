// src/components/student/RoomList.tsx
'use client';

import styled from 'styled-components';
import Link from 'next/link';
import { Card, Button } from '@/styles/StyledComponents';
import type { StudentRoom } from '@/types/student.types';

const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const RoomCard = styled(Card)`
  display: flex;
  flex-direction: column;
  transition: transform ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const RoomHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const RoomName = styled.h3`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: 1.25rem;
`;

const RoomDetails = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.875rem;
`;

const ChatbotsList = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ChatbotInfo = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const ChatbotItem = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: 0.875rem;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  strong {
    color: ${({ theme }) => theme.colors.text};
  }
  
  p {
    color: ${({ theme }) => theme.colors.textMuted};
    margin-top: ${({ theme }) => theme.spacing.xs};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.small};
`;

const RoomFooter = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const JoinedDate = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
`;

interface RoomListProps {
  rooms: StudentRoom[];
}

export default function RoomList({ rooms }: RoomListProps) {
  return (
    <RoomGrid>
      {rooms.map((room) => (
        <RoomCard key={room.room_id}>
          <RoomHeader>
            <RoomName>{room.room_name}</RoomName>
            <RoomDetails>
              Room Code: <strong>{room.room_code}</strong>
            </RoomDetails>
          </RoomHeader>
          
          <ChatbotsList>
            {room.chatbots.length > 0 ? (
              <>
                <ChatbotInfo>
                  {room.chatbots.length} chatbot{room.chatbots.length > 1 ? 's' : ''}:
                </ChatbotInfo>
                {room.chatbots.map((chatbot) => (
                  <ChatbotItem key={chatbot.chatbot_id}>
                    <strong>{chatbot.name}</strong>
                    {chatbot.description && (
                      <p>{chatbot.description}</p>
                    )}
                  </ChatbotItem>
                ))}
              </>
            ) : (
              <EmptyState>No chatbots assigned</EmptyState>
            )}
          </ChatbotsList>
          
          <RoomFooter>
            <JoinedDate>
              Joined: {new Date(room.joined_at || room.created_at).toLocaleDateString()}
            </JoinedDate>
            <Button 
              as={Link} 
              href={`/room/${room.room_id}`}
              size="medium"
              style={{ 
                minWidth: '120px',
                textAlign: 'center'
              }}
            >
              Enter Room
            </Button>
          </RoomFooter>
        </RoomCard>
      ))}
    </RoomGrid>
  );
}