// src/components/teacher/EditRoomModal.tsx
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Alert } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import type { Room, Chatbot } from '@/types/database.types';

// ... (styled components remain the same)
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0;
    align-items: flex-start;
  }
`;

const FormCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 0;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 20px 60px rgba(152, 93, 215, 0.2);
  width: 100%;
  max-width: 650px;
  margin: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow-y: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    margin: 0;
    width: 100%;
    min-height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    box-shadow: none;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

const FormContent = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  overflow-y: auto;
  flex-grow: 1;
  max-height: calc(90vh - 140px);
  overscroll-behavior: contain;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.borderDark};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.colors.borderDark} transparent;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
    max-height: calc(100vh - 140px);
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 20px;
  }
`;

const CloseButton = styled.button`
  background: rgba(152, 93, 215, 0.1);
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  font-size: 1.5rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(152, 93, 215, 0.2);
    transform: scale(1.1);
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
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.sm};
  background: rgba(248, 248, 248, 0.5);

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    max-height: 200px;
  }
`;

const ChatbotItem = styled.label`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(152, 93, 215, 0.05);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
    min-height: 44px;
  }
`;

const Checkbox = styled.input`
  margin-right: ${({ theme }) => theme.spacing.md};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
  background-color: ${({ theme }) => theme.colors.background};
  position: sticky;
  bottom: 0;
  z-index: 5;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column-reverse;
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

const DirectAccessContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(76, 190, 243, 0.05);
  border-radius: 12px;
  border: 1px dashed rgba(76, 190, 243, 0.3);
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

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 0.75rem;
  }
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
        let errorMsg = 'Failed to update room skolrbots';
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
        } catch {
            // If response is not JSON, use status text or a generic message
            errorMsg = `Failed to update room skolrbots (status: ${response.status} ${response.statusText})`;
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
    <Overlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <FormCard>
        <Header>
          <Title>Edit Room: {room.room_name}</Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>

        <FormContent>
          {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}

        <Section>
          <SectionTitle>Select Skolrbots for this Room</SectionTitle>
          {isLoading ? (
            <div style={{textAlign: 'center', padding: '20px'}}>Loading skolrbots...</div>
          ) : chatbots.length === 0 ? (
            <p>No skolrbots available to assign. Please create a skolrbot first.</p>
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
            <ModernButton 
              variant="secondary" 
              size="small" 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/chat/${room.room_id}`);
                alert('Link copied to clipboard!');
              }}
            >
              Copy Link
            </ModernButton>
          </DirectAccessContainer>
        </Section>
        </FormContent>

        <Footer>
          <ModernButton type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </ModernButton>
          <ModernButton 
            type="button" 
            variant="primary"
            onClick={handleSubmit} 
            disabled={isSubmitting || isLoading || (chatbots.length > 0 && selectedChatbots.length === 0 && !isLoading) }
            // Disable save if loading, submitting, or if chatbots are available but none are selected (unless still loading initial selection)
            title={chatbots.length > 0 && selectedChatbots.length === 0 && !isLoading ? "Select at least one skolrbot" : undefined}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </ModernButton>
        </Footer>
      </FormCard>
    </Overlay>
  );
}