// src/app/student/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import { Container, Card, Button, Alert, Badge } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { 
    Room, 
    Chatbot, 
    StudentAssessment,
    Profile
} from '@/types/database.types';

// --- Interfaces matching API Response ---
interface JoinedRoomForDashboard extends Pick<Room, 'room_id' | 'room_name' | 'room_code'> {
  chatbots: Pick<Chatbot, 'chatbot_id' | 'name' | 'bot_type'>[];
  joined_at: string;
}

interface AssessmentSummaryForDashboard extends Pick<StudentAssessment, 'assessment_id' | 'ai_grade_raw' | 'ai_feedback_student' | 'assessed_at' | 'status'> {
  room_id: string; // Keep room_id for potential use, even if room_name is primary display
  room_name: string | null;
  chatbot_id: string; // Keep chatbot_id for potential use
  chatbot_name: string | null;
}

interface StudentDashboardData {
  joinedRooms: JoinedRoomForDashboard[];
  recentAssessments: AssessmentSummaryForDashboard[];
  studentProfile: Pick<Profile, 'user_id' | 'full_name' | 'email'> | null;
}

// --- Styled Components (Keep existing styles) ---
const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.xl} 0;
  min-height: 100vh;
`;

const WelcomeHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  h1 {
    font-size: 2rem;
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
  }
  p {
    font-size: 1.1rem;
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const Section = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const RoomCard = styled(Card)`
  display: flex;
  flex-direction: column;
  justify-content: space-between; 
  h3 {
    font-size: 1.25rem;
    color: ${({ theme }) => theme.colors.primaryDark};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
  }
  .room-code {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-family: ${({ theme }) => theme.fonts.mono};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }
  .chatbot-count {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
`;

const AssessmentList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const AssessmentListItem = styled.li`
  padding: ${({ theme }) => theme.spacing.md} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child {
    border-bottom: none;
  }

  .assessment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    flex-wrap: wrap; // Allow badge to wrap on small screens
    gap: ${({ theme }) => theme.spacing.sm};
  }
  .assessment-title {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
    font-size: 1.1rem;
  }
  .assessment-date {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .assessment-details {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    span { margin-right: ${({ theme }) => theme.spacing.md}; }
  }
  .feedback-snippet {
    background-color: ${({ theme }) => theme.colors.backgroundDark};
    padding: ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.borderRadius.medium};
    font-style: italic;
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.95rem;
    line-height: 1.5;
    margin-top: ${({ theme }) => theme.spacing.xs};
    margin-bottom: ${({ theme }) => theme.spacing.sm}; // Add margin before the button
  }
`;

const EmptyStateText = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => theme.spacing.lg} 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  gap: ${({ theme }) => theme.spacing.md};
`;

const getAssessmentStatusBadgeVariant = (status?: StudentAssessment['status']): 'success' | 'warning' | 'error' | 'default' => {
    if (!status) return 'default';
    if (status === 'teacher_reviewed') return 'success';
    if (status === 'ai_completed') return 'default'; 
    if (status === 'ai_processing') return 'warning'; 
    return 'default';
};
const getAssessmentStatusText = (status?: StudentAssessment['status']): string => {
    if (!status) return 'N/A';
    if (status === 'ai_processing') return 'Processing';
    if (status === 'ai_completed') return 'Feedback Ready'; // Changed for student view
    if (status === 'teacher_reviewed') return 'Teacher Reviewed';
    return (status as string).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};


export default function StudentDashboardPage() {
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/student/dashboard-data');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
            router.push('/auth'); 
            return;
        }
        throw new Error(errorData.error || `Failed to fetch dashboard data (status ${response.status})`);
      }
      const data: StudentDashboardData = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error("Error fetching student dashboard data:", err);
      setError(err instanceof Error ? err.message : "Could not load your dashboard.");
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'});
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <Container>
          <LoadingContainer>
            <LoadingSpinner size="large" />
            <p>Loading your dashboard...</p>
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
        </Container>
      </PageWrapper>
    );
  }

  if (!dashboardData || !dashboardData.studentProfile) {
    return (
      <PageWrapper>
        <Container>
          <Alert variant="info">Could not load dashboard information. Please try again later.</Alert>
           <Button onClick={() => router.push('/join')} style={{ marginTop: '16px' }}> 
            Join a Room
          </Button>
        </Container>
      </PageWrapper>
    );
  }

  const { studentProfile, joinedRooms, recentAssessments } = dashboardData;

  return (
    <PageWrapper>
      <Container>
        <WelcomeHeader>
          <h1>Welcome, {studentProfile.full_name || 'Student'}!</h1>
          <p>Here&apos;s an overview of your ClassBots activities.</p>
        </WelcomeHeader>

        <Section>
          <SectionTitle>My Active Rooms ({joinedRooms.length})</SectionTitle>
          {joinedRooms.length > 0 ? (
            <RoomGrid>
              {joinedRooms.map(room => (
                <RoomCard key={room.room_id}>
                  <div>
                    <h3>{room.room_name}</h3>
                    <p className="room-code">Code: {room.room_code}</p>
                    <p className="chatbot-count">
                      {room.chatbots.length} chatbot{room.chatbots.length !== 1 ? 's' : ''} available
                    </p>
                  </div>
                  <Button as={Link} href={`/room/${room.room_id}`} variant="primary" style={{width: '100%', marginTop: 'auto'}}>
                    Enter Room
                  </Button>
                </RoomCard>
              ))}
            </RoomGrid>
          ) : (
            <EmptyStateText>
              You haven&apos;t joined any active rooms yet. 
              <Link href="/join" style={{textDecoration: 'underline', marginLeft: '5px', color: 'inherit'}}>Join a room</Link> to get started!
            </EmptyStateText>
          )}
        </Section>

        <Section>
          <SectionTitle>Recent Assessment Feedback ({recentAssessments.length})</SectionTitle>
          {recentAssessments.length > 0 ? (
            <AssessmentList>
              {recentAssessments.map(asmnt => (
                <AssessmentListItem key={asmnt.assessment_id}>
                  <div className="assessment-header">
                    <span className="assessment-title">
                      Feedback from {asmnt.chatbot_name || 'Assessment Bot'}
                      {asmnt.room_name && ` (in ${asmnt.room_name})`}
                    </span>
                    <Badge variant={getAssessmentStatusBadgeVariant(asmnt.status)}>
                        {getAssessmentStatusText(asmnt.status)}
                    </Badge>
                  </div>
                  <div className="assessment-details">
                    <span>Grade: <strong>{asmnt.ai_grade_raw || 'Not Graded'}</strong></span>
                    <span className="assessment-date">Assessed: {formatDate(asmnt.assessed_at)}</span>
                  </div>
                  {asmnt.ai_feedback_student && (
                    <div className="feedback-snippet">
                      {/* Truncate long feedback for summary view */}
                      {asmnt.ai_feedback_student.length > 150 
                        ? `${asmnt.ai_feedback_student.substring(0, 150)}...`
                        : asmnt.ai_feedback_student
                      }
                    </div>
                  )}
                  {/* MODIFIED BUTTON LINK */}
                  <Button 
                      as={Link} 
                      href={`/student/assessments/${asmnt.assessment_id}`} 
                      size="small" 
                      variant="outline" // Changed to outline for better visual hierarchy
                      style={{marginTop: '10px'}}
                  >
                      View Full Feedback →
                  </Button>
                </AssessmentListItem>
              ))}
            </AssessmentList>
          ) : (
            <EmptyStateText>No recent assessment feedback found.</EmptyStateText>
          )}
        </Section>

      </Container>
    </PageWrapper>
  );
}