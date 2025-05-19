// src/components/teacher/EditRoomModal.tsx
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Card, Button, Alert } from '@/styles/StyledComponents';
import type { Room, Chatbot } from '@/types/database.types';

// ... (styled components remain the same)
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

const DirectAccessContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border: 1px dashed ${({ theme }) => theme.colors.border};
`;

const DirectAccessUrl = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  margin-top: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.8rem;
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
    const fetchRoomChatbots = async () => {
      setIsLoading(true); // Ensure loading state is true at the start
      setError(null);
      try {
        // MODIFIED API CALL
        const response = await fetch(`/api/teacher/room-chatbots-associations?roomId=${room.room_id}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error from fetchRoomChatbots' }));
            throw new Error(errorData.error || 'Failed to fetch room chatbots');
        }
        
        const data = await response.json();
        setSelectedChatbots(data.map((rc: { chatbot_id: string }) => rc.chatbot_id));
      } catch (err) {
        console.error("EditRoomModal fetchRoomChatbots error:", err);
        setError(err instanceof Error ? err.message : 'Failed to load current chatbots for this room.');
      } finally {
        setIsLoading(false);
      }
    };

    if (room?.room_id) { // Ensure room_id is present
        fetchRoomChatbots();
    } else {
        setError("Room information is missing.");
        setIsLoading(false);
    }
  }, [room.room_id]); // Depend only on room.room_id

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
      // MODIFIED API CALL
      const response = await fetch(`/api/teacher/room-chatbots-associations?roomId=${room.room_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatbot_ids: selectedChatbots }),
      });

      if (!response.ok) {
        // Attempt to parse error JSON, but handle cases where it might not be JSON
        let errorMsg = 'Failed to update room chatbots';
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
        } catch {
            // If response is not JSON, use status text or a generic message
            errorMsg = `Failed to update room chatbots (status: ${response.status} ${response.statusText})`;
            console.error("PUT request failed with non-JSON response:", await response.text());
        }
        throw new Error(errorMsg);
      }
      // If you expect JSON on successful PUT, parse it here. Otherwise, just call onSuccess.
      // const successData = await response.json(); 
      // console.log("Room chatbots updated:", successData);
      onSuccess();
    } catch (err) {
      console.error("EditRoomModal handleSubmit error:", err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while saving changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Overlay>
      <FormCard>
        <Header>
          <Title>Edit Room: {room.room_name}</Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>

        {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}

        <Section>
          <SectionTitle>Select Chatbots for this Room</SectionTitle>
          {isLoading ? (
            <div style={{textAlign: 'center', padding: '20px'}}>Loading chatbots...</div>
          ) : chatbots.length === 0 ? (
            <p>No chatbots available to assign. Please create a chatbot first.</p>
          ) : (
            <ChatbotList>
              {chatbots.map(chatbot => (
                <ChatbotItem key={chatbot.chatbot_id}>
                  <Checkbox
                    type="checkbox"
                    id={`cb-edit-${chatbot.chatbot_id}`}
                    checked={selectedChatbots.includes(chatbot.chatbot_id)}
                    onChange={() => handleToggleChatbot(chatbot.chatbot_id)}
                  />
                  <label htmlFor={`cb-edit-${chatbot.chatbot_id}`} style={{cursor: 'pointer', flexGrow: 1}}>
                    {chatbot.name}
                    {chatbot.description && (
                      <span style={{ marginLeft: '8px', color: '#777', fontSize: '0.9em' }}>
                        - {chatbot.description.length > 50 ? chatbot.description.substring(0, 50) + '...' : chatbot.description}
                      </span>
                    )}
                  </label>
                </ChatbotItem>
              ))}
            </ChatbotList>
          )}
        </Section>

        <Section>
          <SectionTitle>Direct Student Access</SectionTitle>
          <DirectAccessContainer>
            <p>Students can directly access this room using the following URL:</p>
            <DirectAccessUrl 
              type="text" 
              value={`${window.location.origin}/chat/${room.room_id}`} 
              readOnly
              onClick={(e) => e.currentTarget.select()}
            />
            <Button 
              variant="outline" 
              size="small" 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/chat/${room.room_id}`);
                alert('Link copied to clipboard!');
              }}
            >
              Copy Link
            </Button>
          </DirectAccessContainer>
        </Section>

        <Footer>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isSubmitting || isLoading || (chatbots.length > 0 && selectedChatbots.length === 0 && !isLoading) }
            // Disable save if loading, submitting, or if chatbots are available but none are selected (unless still loading initial selection)
            title={chatbots.length > 0 && selectedChatbots.length === 0 && !isLoading ? "Select at least one chatbot" : undefined}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </Footer>
      </FormCard>
    </Overlay>
  );
}