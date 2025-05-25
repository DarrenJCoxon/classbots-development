'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { Card, Button, FormGroup, Label, Input, Alert } from '@/styles/StyledComponents';
import type { Chatbot } from '@/types/database.types';

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
  padding: ${({ theme }) => theme.spacing.md};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0;
    align-items: flex-start;
    overflow-y: auto;
  }
`;

const FormCard = styled(Card)`
  width: 100%;
  max-width: 600px;
  margin: 20px;
  position: relative;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    margin: 0;
    max-height: 100%;
    min-height: 100vh;
    border-radius: 0;
    overflow-y: auto;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    position: sticky;
    top: 0;
    background: ${({ theme }) => theme.colors.backgroundCard};
    padding: ${({ theme }) => theme.spacing.sm} 0;
    z-index: 5;
  }
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

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xl};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column-reverse;
  }
`;

const ChatbotList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.sm};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    max-height: 200px;
  }
`;

const ChatbotItem = styled.label`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  
  &:hover {
    background: ${({ theme }) => theme.colors.backgroundDark};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
    min-height: 44px; // Better for touch inputs
  }
`;

const Checkbox = styled.input`
  margin-right: ${({ theme }) => theme.spacing.md};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 20px;
    height: 20px;
  }
`;

const ChatbotName = styled.span`
  flex: 1;
`;

const ChatbotDescription = styled.span`
  margin-left: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`;

const ActionButton = styled(Button)`
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    min-height: 48px; // Better for touch inputs
  }
`;

interface RoomFormProps {
  chatbots: Chatbot[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function RoomForm({ chatbots, onClose, onSuccess }: RoomFormProps) {
  const [formData, setFormData] = useState({
    room_name: '',
    chatbot_ids: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/teacher/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create room');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      room_name: e.target.value,
    }));
  };

  const handleToggleChatbot = (chatbotId: string) => {
    setFormData(prev => ({
      ...prev,
      chatbot_ids: prev.chatbot_ids.includes(chatbotId)
        ? prev.chatbot_ids.filter(id => id !== chatbotId)
        : [...prev.chatbot_ids, chatbotId]
    }));
  };

  return (
    <Overlay>
      <FormCard>
        <Header>
          <Title>Create Classroom Room</Title>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </Header>

        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="room_name">Room Name</Label>
            <Input
              id="room_name"
              name="room_name"
              value={formData.room_name}
              onChange={handleNameChange}
              placeholder="Enter room name"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>Select Skolrbots</Label>
            {chatbots.length === 0 ? (
              <Alert variant="warning">
                You need to create a skolrbot before you can create a room.
              </Alert>
            ) : (
              <ChatbotList>
                {chatbots.map(chatbot => (
                  <ChatbotItem key={chatbot.chatbot_id}>
                    <Checkbox
                      type="checkbox"
                      checked={formData.chatbot_ids.includes(chatbot.chatbot_id)}
                      onChange={() => handleToggleChatbot(chatbot.chatbot_id)}
                    />
                    <ChatbotName>{chatbot.name}</ChatbotName>
                    {chatbot.description && (
                      <ChatbotDescription>
                        - {chatbot.description}
                      </ChatbotDescription>
                    )}
                  </ChatbotItem>
                ))}
              </ChatbotList>
            )}
          </FormGroup>

          <Footer>
            <ActionButton type="button" variant="outline" onClick={onClose}>
              Cancel
            </ActionButton>
            <ActionButton 
              type="submit" 
              disabled={isSubmitting || chatbots.length === 0 || formData.chatbot_ids.length === 0}
            >
              {isSubmitting ? 'Creating...' : 'Create Room'}
            </ActionButton>
          </Footer>
        </form>
      </FormCard>
    </Overlay>
  );
}