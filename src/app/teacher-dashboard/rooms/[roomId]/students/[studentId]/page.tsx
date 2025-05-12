// src/app/teacher-dashboard/rooms/[roomId]/students/[studentId]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Card, Button, Alert, Badge } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import StudentChatHistory from '@/components/teacher/StudentChatHistory'; // To be used in a tab

import type { 
    Profile, 
    StudentAssessment, 
    FlaggedMessage, 
    Chatbot as RoomChatbotType // Type for chatbots in the room
} from '@/types/database.types';

// --- Data Structures for Page State ---
interface AssessmentSummaryForStudent extends Pick<StudentAssessment, 'assessment_id' | 'chatbot_id' | 'assessed_at' | 'ai_grade_raw' | 'teacher_override_grade' | 'status'> {
  chatbot_name?: string | null;
}

interface ConcernSummaryForStudent extends Pick<FlaggedMessage, 'flag_id' | 'concern_type' | 'concern_level' | 'created_at' | 'status'> {
  message_preview?: string | null;
}

interface StudentRoomAllDetails {
  student: Pick<Profile, 'user_id' | 'full_name' | 'email'> | null;
  assessments: AssessmentSummaryForStudent[];
  concerns: ConcernSummaryForStudent[];
  // We also need the list of chatbots available in this room for the StudentChatHistory component
  roomChatbots: Pick<RoomChatbotType, 'chatbot_id' | 'name'>[]; 
}

// --- Styled Components ---
const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.lg} 0;
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
`;

const StudentInfoBar = styled.div`
  h1 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    font-size: 1.8rem;
  }
  p {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 1rem;
    margin: 0;
  }
`;

const TabContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const TabButton = styled.button<{ $isActive: boolean }>`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  color: ${({ theme, $isActive }) => $isActive ? theme.colors.primary : theme.colors.textLight};
  border-bottom: 3px solid ${({ theme, $isActive }) => $isActive ? theme.colors.primary : 'transparent'};
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const TabContent = styled.div`
  padding-top: ${({ theme }) => theme.spacing.lg};
`;

const SummarySection = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SectionTitle = styled.h3`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.3rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const SummaryList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const SummaryListItem = styled.li`
  padding: ${({ theme }) => theme.spacing.sm} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};

  &:last-child {
    border-bottom: none;
  }

  .info {
    flex-grow: 1;
  }
  .title {
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text};
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }
  .date {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .preview {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.textLight};
    font-style: italic;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  gap: ${({ theme }) => theme.spacing.md};
`;

const getStatusBadgeVariant = (status?: StudentAssessment['status'] | FlaggedMessage['status']): 'success' | 'warning' | 'error' | 'default' => {
    if (!status) return 'default';
    // Assessment Statuses
    if (status === 'teacher_reviewed') return 'success';
    if (status === 'ai_completed') return 'warning';
    if (status === 'ai_processing') return 'default';
    // Concern Statuses
    if (status === 'resolved') return 'success';
    if (status === 'false_positive') return 'default';
    if (status === 'reviewing') return 'warning';
    if (status === 'pending') return 'error';
    return 'default';
};

const getStatusText = (status?: StudentAssessment['status'] | FlaggedMessage['status']): string => {
    if (!status) return 'N/A';
    // Assessment Statuses
    if (status === 'ai_processing') return 'AI Processing';
    if (status === 'ai_completed') return 'AI Completed';
    if (status === 'teacher_reviewed') return 'Teacher Reviewed';
    // Concern Statuses (assuming they are distinct from assessment statuses)
    if (status === 'pending') return 'Pending';
    if (status === 'reviewing') return 'Reviewing';
    if (status === 'resolved') return 'Resolved';
    if (status === 'false_positive') return 'False Positive';
    return String(status).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};


type TabName = 'overview' | 'chats' | 'assessments' | 'concerns';

export default function StudentRoomDetailPage() {
  const [details, setDetails] = useState<StudentRoomAllDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('overview');

  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const studentId = params?.studentId as string;

  const fetchStudentRoomDetails = useCallback(async () => {
    if (!roomId || !studentId) {
      setError("Room ID or Student ID not found in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // API for student's aggregated details (profile, assessment summaries, concern summaries)
      const studentDetailsResponse = await fetch(`/api/teacher/student-room-details?roomId=${roomId}&studentId=${studentId}`);
      if (!studentDetailsResponse.ok) {
        const errorData = await studentDetailsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch student details (status ${studentDetailsResponse.status})`);
      }
      const studentData: StudentRoomAllDetails = await studentDetailsResponse.json();

      // API for room's general details (to get chatbots for StudentChatHistory)
      // We could combine this into the above API, but for now, separate for clarity
      const roomGenDetailsResponse = await fetch(`/api/teacher/room-details?roomId=${roomId}`);
       if (!roomGenDetailsResponse.ok) {
        const errorData = await roomGenDetailsResponse.json().catch(() => ({}));
        console.warn(errorData.error || `Failed to fetch room general details (status ${roomGenDetailsResponse.status})`);
        // Don't fail entirely, StudentChatHistory might handle missing chatbots gracefully
        setDetails({ ...studentData, roomChatbots: [] });
      } else {
        const roomGenData = await roomGenDetailsResponse.json();
        setDetails({
          ...studentData,
          roomChatbots: roomGenData.chatbots || [],
        });
      }

    } catch (err) {
      console.error("Error fetching student room details:", err);
      setError(err instanceof Error ? err.message : "Could not load student details.");
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [roomId, studentId]);

  useEffect(() => {
    fetchStudentRoomDetails();
  }, [fetchStudentRoomDetails]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <PageWrapper>
        <Container>
          <LoadingContainer>
            <LoadingSpinner size="large" /> <p>Loading student details...</p>
          </LoadingContainer>
        </Container>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <Container>
          <Alert variant="error">{error}</Alert>
          <Button onClick={() => router.back()} style={{ marginTop: '16px' }}>
            ← Back
          </Button>
        </Container>
      </PageWrapper>
    );
  }

  if (!details || !details.student) {
    return (
      <PageWrapper>
        <Container>
          <Alert variant="info">Student details not found.</Alert>
          <Button onClick={() => router.back()} style={{ marginTop: '16px' }}>
            ← Back
          </Button>
        </Container>
      </PageWrapper>
    );
  }

  const { student, assessments, concerns, roomChatbots } = details;

  return (
    <PageWrapper>
      <Container>
        <Header>
          <StudentInfoBar>
            <h1>{student.full_name || 'Student'}</h1>
            <p>{student.email || 'No email provided'}</p>
          </StudentInfoBar>
          <Button variant="outline" onClick={() => router.push(`/teacher-dashboard/rooms/${roomId}`)}>
            ← Back to Room Overview
          </Button>
        </Header>

        <TabContainer>
          <TabButton $isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Overview</TabButton>
          <TabButton $isActive={activeTab === 'chats'} onClick={() => setActiveTab('chats')}>Chat History</TabButton>
          <TabButton $isActive={activeTab === 'assessments'} onClick={() => setActiveTab('assessments')}>Assessments</TabButton>
          <TabButton $isActive={activeTab === 'concerns'} onClick={() => setActiveTab('concerns')}>Concerns</TabButton>
        </TabContainer>

        <TabContent>
          {activeTab === 'overview' && (
            <div>
              <SummarySection>
                <SectionTitle>Recent Assessments ({assessments.length})</SectionTitle>
                {assessments.length > 0 ? (
                  <SummaryList>
                    {assessments.slice(0, 5).map(asmnt => ( // Show first 5
                      <SummaryListItem key={asmnt.assessment_id}>
                        <div className="info">
                           <Link href={`/teacher-dashboard/assessments/${asmnt.assessment_id}`} className="title">
                             Assessment with {asmnt.chatbot_name || 'Bot'}
                           </Link>
                          <p className="date">Date: {formatDate(asmnt.assessed_at)}</p>
                        </div>
                        <div>
                            Grade: {asmnt.teacher_override_grade || asmnt.ai_grade_raw || 'N/A'}
                            <Badge 
                                variant={getStatusBadgeVariant(asmnt.status)} 
                                style={{marginLeft: '10px'}}
                            >
                                {getStatusText(asmnt.status)}
                            </Badge>
                        </div>
                      </SummaryListItem>
                    ))}
                  </SummaryList>
                ) : <p>No assessments found for this student in this room.</p>}
                 {assessments.length > 5 && <Button variant="outline" onClick={() => setActiveTab('assessments')} style={{marginTop: '10px'}}>View All Assessments ({assessments.length})</Button>}
              </SummarySection>

              <SummarySection>
                <SectionTitle>Recent Concerns ({concerns.length})</SectionTitle>
                {concerns.length > 0 ? (
                  <SummaryList>
                    {concerns.slice(0, 5).map(cncrn => ( // Show first 5
                      <SummaryListItem key={cncrn.flag_id}>
                        <div className="info">
                          <Link href={`/teacher-dashboard/concerns/${cncrn.flag_id}`} className="title">
                            {cncrn.concern_type.replace(/_/g, ' ')} (Level {cncrn.concern_level})
                          </Link>
                          <p className="date">Date: {formatDate(cncrn.created_at)}</p>
                          {cncrn.message_preview && <p className="preview">&quot;{cncrn.message_preview}&quot;</p>}
                        </div>
                         <Badge 
                            variant={getStatusBadgeVariant(cncrn.status)}
                         >
                            {getStatusText(cncrn.status)}
                        </Badge>
                      </SummaryListItem>
                    ))}
                  </SummaryList>
                ) : <p>No concerns flagged for this student in this room.</p>}
                {concerns.length > 5 && <Button variant="outline" onClick={() => setActiveTab('concerns')} style={{marginTop: '10px'}}>View All Concerns ({concerns.length})</Button>}
              </SummarySection>
            </div>
          )}

          {activeTab === 'chats' && (
            <Card> {/* Wrap StudentChatHistory in a Card for consistent styling */}
              <StudentChatHistory
                roomId={roomId}
                studentId={studentId}
                studentName={student.full_name || 'Student'}
                chatbots={roomChatbots || []} // Pass the fetched chatbots for the room
              />
            </Card>
          )}

          {activeTab === 'assessments' && (
            <Card>
              <SectionTitle>All Assessments ({assessments.length})</SectionTitle>
              {assessments.length > 0 ? (
                <SummaryList>
                  {assessments.map(asmnt => (
                    <SummaryListItem key={asmnt.assessment_id}>
                      <div className="info">
                        <Link href={`/teacher-dashboard/assessments/${asmnt.assessment_id}`} className="title">
                            Assessment with {asmnt.chatbot_name || 'Bot'}
                        </Link>
                        <p className="date">Date: {formatDate(asmnt.assessed_at)}</p>
                      </div>
                      <div>
                        Grade: {asmnt.teacher_override_grade || asmnt.ai_grade_raw || 'N/A'}
                         <Badge 
                            variant={getStatusBadgeVariant(asmnt.status)} 
                            style={{marginLeft: '10px'}}
                         >
                            {getStatusText(asmnt.status)}
                        </Badge>
                      </div>
                    </SummaryListItem>
                  ))}
                </SummaryList>
              ) : <p>No assessments found for this student in this room.</p>}
            </Card>
          )}

          {activeTab === 'concerns' && (
            <Card>
              <SectionTitle>All Concerns ({concerns.length})</SectionTitle>
               {concerns.length > 0 ? (
                <SummaryList>
                  {concerns.map(cncrn => (
                    <SummaryListItem key={cncrn.flag_id}>
                      <div className="info">
                        <Link href={`/teacher-dashboard/concerns/${cncrn.flag_id}`} className="title">
                            {cncrn.concern_type.replace(/_/g, ' ')} (Level {cncrn.concern_level})
                        </Link>
                        <p className="date">Date: {formatDate(cncrn.created_at)}</p>
                        {cncrn.message_preview && <p className="preview">&quot;{cncrn.message_preview}&quot;</p>}
                      </div>
                      <Badge 
                        variant={getStatusBadgeVariant(cncrn.status)}
                      >
                        {getStatusText(cncrn.status)}
                      </Badge>
                    </SummaryListItem>
                  ))}
                </SummaryList>
              ) : <p>No concerns flagged for this student in this room.</p>}
            </Card>
          )}
        </TabContent>
      </Container>
    </PageWrapper>
  );
}