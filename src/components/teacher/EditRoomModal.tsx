// src/components/teacher/EditRoomModal.tsx
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Card, Button, Alert } from '@/styles/StyledComponents';
import type { Room, Chatbot } from '@/types/database.types';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const FormCard = styled(Card)`
  width: 100%;
  max-width: 600px;
  margin: 20px;
  position: relative;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textLight};
  cursor: pointer;
  font-size: 1.5rem;
  
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Section = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SectionTitle = styled.h3`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
`;

const ChatbotList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.sm};
`;

const ChatbotItem = styled.label`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  
  &:hover {
    background: ${({ theme }) => theme.colors.backgroundDark};
  }
`;

const Checkbox = styled.input`
  margin-right: ${({ theme }) => theme.spacing.md};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xl};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

interface EditRoomModalProps {
  room: Room;
  chatbots: Chatbot[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditRoomModal({ room, chatbots, onClose, onSuccess }: EditRoomModalProps) {
  const [selectedChatbots, setSelectedChatbots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch current chatbots for this room
    const fetchRoomChatbots = async () => {
      try {
        const response = await fetch(`/api/teacher/rooms/${room.room_id}/chatbots`);
        if (!response.ok) throw new Error('Failed to fetch room chatbots');
        
        const data = await response.json();
        setSelectedChatbots(data.map((rc: { chatbot_id: string }) => rc.chatbot_id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chatbots');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomChatbots();
  }, [room.room_id]);

  const handleToggleChatbot = (chatbotId: string) => {
    setSelectedChatbots(prev => 
      prev.includes(chatbotId)
        ? prev.filter(id => id !== chatbotId)
        : [...prev, chatbotId]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/teacher/rooms/${room.room_id}/chatbots`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatbot_ids: selectedChatbots }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update room chatbots');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update room chatbots');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Overlay>
      <FormCard>
        <Header>
          <Title>Edit Room: {room.room_name}</Title>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </Header>

        {error && <Alert variant="error">{error}</Alert>}

        <Section>
          <SectionTitle>Select Chatbots for this Room</SectionTitle>
          {isLoading ? (
            <div>Loading chatbots...</div>
          ) : (
            <ChatbotList>
              {chatbots.map(chatbot => (
                <ChatbotItem key={chatbot.chatbot_id}>
                  <Checkbox
                    type="checkbox"
                    checked={selectedChatbots.includes(chatbot.chatbot_id)}
                    onChange={() => handleToggleChatbot(chatbot.chatbot_id)}
                  />
                  {chatbot.name}
                  {chatbot.description && (
                    <span style={{ marginLeft: '8px', color: '#888' }}>
                      - {chatbot.description}
                    </span>
                  )}
                </ChatbotItem>
              ))}
            </ChatbotList>
          )}
        </Section>

        <Footer>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isSubmitting || selectedChatbots.length === 0}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </Footer>
      </FormCard>
    </Overlay>
  );
}