// src/components/student/RoomList.tsx
'use client';

import styled from 'styled-components';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/styles/StyledComponents';
import { GlassCard } from '@/components/shared/GlassCard';
import { ModernButton } from '@/components/shared/ModernButton';
import type { StudentRoom } from '@/types/student.types';

const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const RoomCard = styled(GlassCard)`
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${({ theme }) => `linear-gradient(90deg, 
      ${theme.colors.purple} 0%, 
      ${theme.colors.primary} 50%, 
      ${theme.colors.blue} 100%)`};
    opacity: 0.8;
  }
`;

const RoomHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const RoomName = styled.h3`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: 1.25rem;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
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
  background: ${({ theme }) => `linear-gradient(135deg, 
    ${theme.colors.backgroundDark}cc, 
    ${theme.colors.background}cc)`};
  backdrop-filter: blur(5px);
  border-radius: ${({ theme }) => theme.borderRadius.small};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: 0.875rem;
  border: 1px solid ${({ theme }) => theme.colors.border}20;
  
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
  const router = useRouter();
  
  return (
    <RoomGrid>
      {rooms.map((room) => (
        <RoomCard key={room.room_id} variant="light" hoverable>
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
                  {room.chatbots.length} skolrbot{room.chatbots.length > 1 ? 's' : ''}:
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
              <EmptyState>No skolrbots assigned</EmptyState>
            )}
          </ChatbotsList>
          
          <RoomFooter>
            <JoinedDate>
              Joined: {new Date(room.joined_at || room.created_at).toLocaleDateString()}
            </JoinedDate>
            <ModernButton 
              onClick={() => router.push(`/room/${room.room_id}`)}
              variant="primary"
              size="small"
              style={{ 
                minWidth: '120px',
                textAlign: 'center'
              }}
            >
              Enter Room
            </ModernButton>
          </RoomFooter>
        </RoomCard>
      ))}
    </RoomGrid>
  );
}