// src/app/teacher-dashboard/students/[studentId]/memory/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PageWrapper } from '@/components/shared/PageStructure';
import { Container } from '@/styles/StyledComponents';
import StudentMemoryView from '@/components/teacher/StudentMemoryView';
import { ModernButton } from '@/components/shared/ModernButton';
import { createClient } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import styled from 'styled-components';

const ChatbotSelector = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
`;

const ChatbotButton = styled(ModernButton)<{ $active?: boolean }>`
  ${({ $active, theme }) => $active && `
    background: ${theme.colors.primary};
    color: white;
    
    &:hover {
      background: ${theme.colors.primaryDark};
    }
  `}
`;

export default function StudentMemoryPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const [studentName, setStudentName] = useState<string>('');
  const [chatbots, setChatbots] = useState<Array<{ chatbot_id: string; name: string }>>([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStudentAndChatbots();
  }, [studentId]);

  const fetchStudentAndChatbots = async () => {
    try {
      // Get student info
      const { data: studentData } = await supabase
        .from('student_profiles')
        .select('full_name, username')
        .eq('user_id', studentId)
        .single();

      if (studentData) {
        setStudentName(studentData.full_name || studentData.username || 'Student');
      }

      // Get teacher's chatbots
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: chatbotsData } = await supabase
          .from('chatbots')
          .select('chatbot_id, name')
          .eq('teacher_id', user.id)
          .order('name');

        if (chatbotsData && chatbotsData.length > 0) {
          setChatbots(chatbotsData);
          setSelectedChatbotId(chatbotsData[0].chatbot_id);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <Container>
          <LoadingSpinner />
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Container>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{studentName}'s Learning Memory</h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>View conversation history and learning progress</p>
          <ModernButton 
            variant="ghost" 
            onClick={() => window.history.back()}
            style={{ marginBottom: '1rem' }}
          >
            ← Back to Students
          </ModernButton>
        </div>
      {chatbots.length > 0 ? (
        <>
          <ChatbotSelector>
            <strong>Select Chatbot:</strong>
            {chatbots.map((chatbot) => (
              <ChatbotButton
                key={chatbot.chatbot_id}
                variant="ghost"
                size="small"
                $active={selectedChatbotId === chatbot.chatbot_id}
                onClick={() => setSelectedChatbotId(chatbot.chatbot_id)}
              >
                {chatbot.name}
              </ChatbotButton>
            ))}
          </ChatbotSelector>

          {selectedChatbotId && (
            <StudentMemoryView
              studentId={studentId}
              chatbotId={selectedChatbotId}
              studentName={studentName}
            />
          )}
        </>
      ) : (
        <p>No chatbots found. Please create a chatbot first.</p>
      )}
      </Container>
    </PageWrapper>
  );
}