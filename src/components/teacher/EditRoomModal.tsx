// src/components/teacher/EditRoomModal.tsx
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Alert } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import type { Room, Chatbot, Course } from '@/types/database.types';

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
  courses: Course[];
  onClose: () => void;
  onSuccess: () => void;
  onRefreshCourses?: () => void;
}

export default function EditRoomModal({ room, chatbots, courses, onClose, onSuccess, onRefreshCourses }: EditRoomModalProps) {
  const [selectedChatbots, setSelectedChatbots] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoomAssociations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch both chatbots and courses in parallel
        const [chatbotsResponse, coursesResponse] = await Promise.all([
          fetch(`/api/teacher/room-chatbots-associations?roomId=${room.room_id}`),
          fetch(`/api/teacher/room-courses-associations?roomId=${room.room_id}`)
        ]);

        if (!chatbotsResponse.ok) {
          const errorData = await chatbotsResponse.json().catch(() => ({ error: 'Failed to parse chatbots error' }));
          throw new Error(errorData.error || 'Failed to fetch room chatbots');
        }

        if (!coursesResponse.ok) {
          const errorData = await coursesResponse.json().catch(() => ({ error: 'Failed to parse courses error' }));
          throw new Error(errorData.error || 'Failed to fetch room courses');
        }
        
        const chatbotsData = await chatbotsResponse.json();
        const coursesData = await coursesResponse.json();
        
        setSelectedChatbots(chatbotsData.map((rc: { chatbot_id: string }) => rc.chatbot_id));
        setSelectedCourses(coursesData.map((rc: { course_id: string }) => rc.course_id));
      } catch (err) {
        console.error("EditRoomModal fetchRoomAssociations error:", err);
        setError(err instanceof Error ? err.message : 'Failed to load current assignments for this room.');
      } finally {
        setIsLoading(false);
      }
    };

    if (room?.room_id) {
        fetchRoomAssociations();
    } else {
        setError("Room information is missing.");
        setIsLoading(false);
    }
  }, [room.room_id]);

  const handleToggleChatbot = (chatbotId: string) => {
    setSelectedChatbots(prev => 
      prev.includes(chatbotId)
        ? prev.filter(id => id !== chatbotId)
        : [...prev, chatbotId]
    );
  };

  const handleToggleCourse = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Update both chatbots and courses in parallel
      const [chatbotsResponse, coursesResponse] = await Promise.all([
        fetch(`/api/teacher/room-chatbots-associations?roomId=${room.room_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatbot_ids: selectedChatbots }),
        }),
        fetch(`/api/teacher/room-courses-associations?roomId=${room.room_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ course_ids: selectedCourses }),
        })
      ]);

      // Check chatbots response
      if (!chatbotsResponse.ok) {
        let errorMsg = 'Failed to update room Skolrs';
        try {
          const errorData = await chatbotsResponse.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `Failed to update room Skolrs (status: ${chatbotsResponse.status})`;
        }
        throw new Error(errorMsg);
      }

      // Check courses response
      if (!coursesResponse.ok) {
        let errorMsg = 'Failed to update room courses';
        try {
          const errorData = await coursesResponse.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `Failed to update room courses (status: ${coursesResponse.status})`;
        }
        throw new Error(errorMsg);
      }

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
          <SectionTitle>Select Skolrs for this Room</SectionTitle>
          {isLoading ? (
            <div style={{textAlign: 'center', padding: '20px'}}>Loading Skolrs...</div>
          ) : chatbots.length === 0 ? (
            <p>No Skolrs available to assign. Please create a Skolr first.</p>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <SectionTitle style={{ margin: 0 }}>Select Courses for this Room (Optional)</SectionTitle>
            {onRefreshCourses && (
              <ModernButton
                variant="ghost"
                size="small"
                onClick={onRefreshCourses}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Refresh
              </ModernButton>
            )}
          </div>
          {isLoading ? (
            <div style={{textAlign: 'center', padding: '20px'}}>Loading courses...</div>
          ) : !courses || courses.length === 0 ? (
            <p style={{fontSize: '14px', color: '#666', margin: '12px 0'}}>
              No courses available. You can create courses in the Courses section and assign them later.
            </p>
          ) : (
            <ChatbotList>
              {(courses || []).map(course => (
                <ChatbotItem key={course.course_id}>
                  <Checkbox
                    type="checkbox"
                    id={`course-edit-${course.course_id}`}
                    checked={selectedCourses.includes(course.course_id)}
                    onChange={() => handleToggleCourse(course.course_id)}
                  />
                  <label htmlFor={`course-edit-${course.course_id}`} style={{cursor: 'pointer', flexGrow: 1}}>
                    {course.title}
                    {course.description && (
                      <span style={{ marginLeft: '8px', color: '#777', fontSize: '0.9em' }}>
                        - {course.description.length > 50 ? course.description.substring(0, 50) + '...' : course.description}
                      </span>
                    )}
                    {course.subject && (
                      <span style={{ marginLeft: '8px', color: '#999', fontSize: '0.8em' }}>
                        ({course.subject})
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
            title={chatbots.length > 0 && selectedChatbots.length === 0 && !isLoading ? "Select at least one Skolr" : undefined}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </ModernButton>
        </Footer>
      </FormCard>
    </Overlay>
  );
}