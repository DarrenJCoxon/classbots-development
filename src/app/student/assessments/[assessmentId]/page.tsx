// src/app/student/assessments/[assessmentId]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
import { 
    Container, 
    Card, 
    Button, 
    Alert, 
    Badge
} from '@/styles/StyledComponents';
import { ChatMessage as ChatMessageComponent } from '@/components/shared/ChatMessage';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { 
    StudentAssessment, 
    ChatMessage as DbChatMessage 
} from '@/types/database.types';

interface StudentDetailedAssessmentData extends StudentAssessment {
    chatbot_name?: string | null;
    room_name?: string | null; 
    assessed_conversation?: DbChatMessage[];
    student_reflection_text?: string | null;
}

// --- Styled Components (Keep as they were from the version where reflection was removed) ---
const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.xl} 0;
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
`;

const PageTitle = styled.h1`
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  font-size: 1.8rem;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr; 
  gap: ${({ theme }) => theme.spacing.xl};
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr; 
  }
`;

const ConversationContextCard = styled(Card)`
  max-height: 75vh; 
  display: flex;
  flex-direction: column;
  overflow: hidden; 
`;

const CardHeader = styled.h2`
  padding-bottom: ${({ theme }) => theme.spacing.md};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 1.3rem;
  color: ${({ theme }) => theme.colors.text};
`;

const MessagesList = styled.div`
  flex-grow: 1;
  overflow-y: auto;
  padding-right: ${({ theme }) => theme.spacing.sm}; 
`;

const AssessmentDetailsCard = styled(Card)`
  align-self: start; 
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    margin-top: ${({ theme }) => theme.spacing.xl};
  }
`;

const DetailItem = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  font-size: 0.95rem;
  line-height: 1.6;
  strong { 
    display: block; font-weight: 600; color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: ${({ theme }) => theme.spacing.xs}; font-size: 0.85rem;
    text-transform: uppercase; letter-spacing: 0.03em;
  }
  span, p, div.content { color: ${({ theme }) => theme.colors.text}; word-wrap: break-word; }
  p { margin: 0; }
`;

const FeedbackBlock = styled.div`
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin-top: ${({ theme }) => theme.spacing.xs};
  border-left: 4px solid ${({ theme }) => theme.colors.primary};
`;

const TeacherFeedbackBlock = styled(FeedbackBlock)`
  border-left-color: ${({ theme }) => theme.colors.green};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => theme.spacing.lg} 0;
`;

const getStatusBadgeVariant = (status?: StudentAssessment['status']): 'success' | 'warning' | 'error' | 'default' => {
    if (status === 'teacher_reviewed') return 'success';
    if (status === 'ai_completed') return 'default';
    if (status === 'ai_processing') return 'warning';
    return 'default';
};

const getStatusText = (status: StudentAssessment['status'] | undefined): string => {
    if (status === 'ai_processing') return 'AI Processing';
    if (status === 'ai_completed') return 'AI Feedback Ready';
    if (status === 'teacher_reviewed') return 'Teacher Reviewed';
    return status ? String(status).replace(/_/g, ' ') : 'N/A';
};

const LoadingContainer = styled.div` // Added for loading state
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  gap: ${({ theme }) => theme.spacing.md};
`;


export default function StudentAssessmentDetailPage() {
  const [assessment, setAssessment] = useState<StudentDetailedAssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const params = useParams();
  const router = useRouter();
  const assessmentIdFromParams = params?.assessmentId as string; // Renamed for clarity

  // Helper function to get student ID from various places
  const getStudentId = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    // Check various sources for student ID
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('user_id');
    const urlUid = urlParams.get('uid');
    
    // Handle access signature if present
    let decodedUserId = null;
    const accessSignature = urlParams.get('access_signature');
    const timestamp = urlParams.get('ts');
    
    if (accessSignature && timestamp) {
      try {
        const decoded = atob(accessSignature);
        const [userId, signatureTimestamp] = decoded.split(':');
        
        if (signatureTimestamp === timestamp) {
          decodedUserId = userId;
        }
      } catch (e) {
        console.error('Failed to decode access signature:', e);
      }
    }
    
    const storedDirectId = localStorage.getItem('student_direct_access_id');
    const storedCurrentId = localStorage.getItem('current_student_id');
    const storedPinLoginId = localStorage.getItem('direct_pin_login_user');
    
    // Return the first valid ID found
    const id = decodedUserId || urlUserId || urlUid || storedDirectId || storedCurrentId || storedPinLoginId;
    
    // Store the ID in localStorage for reliability
    if (id) {
      localStorage.setItem('student_direct_access_id', id);
      localStorage.setItem('current_student_id', id);
      console.log('Using student ID:', id);
    } else {
      console.warn('No student ID found in any source');
    }
    
    return id;
  }, []);

  const fetchAssessmentDetails = useCallback(async () => {
    if (!assessmentIdFromParams) { // Use renamed variable
      setError("Assessment ID is missing from URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Get the student ID
      const studentId = getStudentId();
      
      // Building the API URL with userId parameter for direct access
      const apiUrl = studentId 
        ? `/api/student/assessment-detail?assessmentId=${assessmentIdFromParams}&userId=${studentId}`
        : `/api/student/assessment-detail?assessmentId=${assessmentIdFromParams}`;
        
      console.log("Fetching assessment with URL:", apiUrl);
      
      const response = await fetch(apiUrl); 
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch assessment details (status ${response.status})`);
      }
      const data: StudentDetailedAssessmentData = await response.json();
      setAssessment(data);
    } catch (err) {
      console.error("Error fetching assessment details:", err);
      setError(err instanceof Error ? err.message : "Could not load assessment details.");
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  }, [assessmentIdFromParams, getStudentId]); // Depend on assessmentIdFromParams and getStudentId

  useEffect(() => {
    fetchAssessmentDetails();
  }, [fetchAssessmentDetails]);


  if (loading) {
    return (
      <PageWrapper><Container><LoadingContainer><LoadingSpinner size="large" /><p>Loading assessment details...</p></LoadingContainer></Container></PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper><Container><Alert variant="error">{error}</Alert><Button onClick={() => router.push('/student/dashboard')} style={{ marginTop: '16px' }}>Back to Dashboard</Button></Container></PageWrapper>
    );
  }

  if (!assessment) {
    return (
      <PageWrapper><Container><Alert variant="info">Assessment details not found.</Alert><Button onClick={() => router.push('/student/dashboard')} style={{ marginTop: '16px' }}>Back to Dashboard</Button></Container></PageWrapper>
    );
  }

  const { 
    chatbot_name, 
    room_name, 
    assessed_at, 
    ai_grade_raw, 
    ai_feedback_student, 
    teacher_override_grade, 
    teacher_override_notes,
    status,
    assessed_conversation,
    student_reflection_text 
  } = assessment;

  return (
    <PageWrapper>
      <Container>
        <Header>
          <PageTitle>Assessment Feedback</PageTitle>
          <Button variant="outline" onClick={() => router.push('/student/dashboard')}>
            ← Back to Dashboard
          </Button>
        </Header>

        <MainGrid>
          <ConversationContextCard>
            <CardHeader>Your Conversation</CardHeader>
            <MessagesList>
              {assessed_conversation && assessed_conversation.length > 0 ? (
                assessed_conversation.map(msg => (
                  <ChatMessageComponent
                    key={msg.message_id}
                    message={msg}
                    chatbotName={chatbot_name || 'Assessment Bot'}
                  />
                ))
              ) : (
                <p style={{textAlign: 'center', padding: '20px'}}>Conversation context is not available for this assessment.</p>
              )}
            </MessagesList>
          </ConversationContextCard>

          <AssessmentDetailsCard>
            <CardHeader>Feedback Details</CardHeader>
            <DetailItem><strong>Assessed By:</strong> <span>{chatbot_name || 'N/A'}</span></DetailItem>
            {room_name && <DetailItem><strong>Classroom:</strong> <span>{room_name}</span></DetailItem>}
            <DetailItem>
              <strong>Assessed On:</strong>
              <span>{assessed_at ? new Date(assessed_at).toLocaleString() : 'N/A'}</span>
            </DetailItem>
             <DetailItem><strong>Status:</strong> <Badge variant={getStatusBadgeVariant(status)}>{getStatusText(status)}</Badge></DetailItem>

            <Divider />
            
            <CardHeader style={{fontSize: '1.1rem', marginTop:'0', borderBottom: 'none', marginBottom: '8px'}}>AI Feedback</CardHeader>
            <DetailItem>
                <strong>AI Suggested Grade:</strong> 
                <Badge variant={ai_grade_raw?.toLowerCase().includes('error') ? 'error' : 'default'} style={{marginLeft: '8px'}}>
                    {ai_grade_raw || 'Not graded by AI'}
                </Badge>
            </DetailItem>
            <DetailItem>
                <strong>AI Feedback for You:</strong> 
                <FeedbackBlock><p>{ai_feedback_student || 'No AI feedback was provided.'}</p></FeedbackBlock>
            </DetailItem>

            {(status === 'teacher_reviewed' && (teacher_override_grade || teacher_override_notes)) && (
              <>
                <Divider />
                <CardHeader style={{fontSize: '1.1rem', marginTop:'0', borderBottom: 'none', marginBottom: '8px'}}>Teacher&apos;s Review</CardHeader>
                {teacher_override_grade && (
                    <DetailItem>
                        <strong>Teacher&apos;s Grade:</strong> 
                        <Badge variant="success" style={{marginLeft: '8px'}}>
                            {teacher_override_grade}
                        </Badge>
                    </DetailItem>
                )}
                {teacher_override_notes && (
                    <DetailItem>
                        <strong>Teacher&apos;s Notes:</strong> 
                        <TeacherFeedbackBlock><p>{teacher_override_notes}</p></TeacherFeedbackBlock>
                    </DetailItem>
                )}
              </>
            )}

            {student_reflection_text && (
                 <>
                    <Divider />
                    <CardHeader style={{fontSize: '1.1rem', borderBottom: 'none', marginBottom: '8px'}}>Your Saved Reflection</CardHeader>
                    <FeedbackBlock> 
                        <p>{student_reflection_text}</p>
                    </FeedbackBlock>
                 </>
            )}
          </AssessmentDetailsCard>
        </MainGrid>
      </Container>
    </PageWrapper>
  );
}