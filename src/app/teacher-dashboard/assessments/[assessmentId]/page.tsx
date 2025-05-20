// src/app/teacher-dashboard/assessments/[assessmentId]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
// createClient is not strictly needed here anymore if PATCH is via API route,
// but keeping it in case you want direct client-side Supabase calls for other things.
// import { createClient } from '@/lib/supabase/client'; 
import {
    Container, Card, Button, Alert, Badge,
    FormGroup, Label, Input, TextArea,
    Select as StyledSelect
} from '@/styles/StyledComponents';
import { ChatMessage as ChatMessageComponent } from '@/components/shared/ChatMessage';
import type {
    StudentAssessment,
    ChatMessage as DbChatMessage,
    AssessmentStatusEnum
} from '@/types/database.types';

interface DetailedAssessmentData extends StudentAssessment {
    student_name?: string | null;
    student_email?: string | null;
    chatbot_name?: string | null;
    assessed_conversation?: DbChatMessage[];
}

// ... (Styled Components: PageWrapper, Header, PageTitle, BackButton, MainGrid, etc. remain THE SAME as in content-reply-032)
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

const BackButton = styled(Button)``;

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
  font-size: 0.9rem;
  line-height: 1.5;
  strong { 
    display: block; font-weight: 600; color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: ${({ theme }) => theme.spacing.xs}; font-size: 0.8rem;
    text-transform: uppercase; letter-spacing: 0.03em;
  }
  span, p, div.content { color: ${({ theme }) => theme.colors.text}; word-wrap: break-word; }
  p { margin: 0; }
`;

const AnalysisBlock = styled.div`
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.875rem;
  margin-top: ${({ theme }) => theme.spacing.xs};
  ul { list-style-position: inside; padding-left: ${({ theme }) => theme.spacing.sm}; margin-top: ${({ theme }) => theme.spacing.xs}; }
  li { margin-bottom: ${({ theme }) => theme.spacing.xs}; }
`;

const TeacherReviewForm = styled.form`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

// Simple Divider styled-component
const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => theme.spacing.lg} 0;
`;


export default function AssessmentDetailPage() {
  const [assessment, setAssessment] = useState<DetailedAssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [teacherGrade, setTeacherGrade] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [currentStatus, setCurrentStatus] = useState<AssessmentStatusEnum>('ai_processing'); // Default
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const params = useParams();
  const router = useRouter();
  // const supabase = createClient(); // Not needed if PATCH is through API route
  const assessmentId = params?.assessmentId as string;

  const fetchAssessmentDetails = useCallback(async () => {
    if (!assessmentId) { /* ... */ setError("Assessment ID is missing."); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/teacher/assessments?assessmentId=${assessmentId}`);
      if (!response.ok) { /* ... error handling ... */ throw new Error('Failed to fetch assessment details'); }
      const data: DetailedAssessmentData = await response.json();
      setAssessment(data);
      setTeacherGrade(data.teacher_override_grade || data.ai_grade_raw || '');
      setTeacherNotes(data.teacher_override_notes || '');
      setCurrentStatus(data.status || 'ai_completed'); // Default to ai_completed if status is null
    } catch (err) { /* ... error handling ... */ setError(err instanceof Error ? err.message : 'Could not load details.'); }
    finally { setLoading(false); }
  }, [assessmentId]);

  useEffect(() => {
    if (assessmentId) { // Ensure assessmentId is present before fetching
        fetchAssessmentDetails();
    } else {
        setError("Assessment ID not found in URL.");
        setLoading(false);
    }
  }, [assessmentId, fetchAssessmentDetails]); // fetchAssessmentDetails is stable due to useCallback

  // ***** UPDATED handleReviewSubmit *****
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessment) return;

    setIsSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(null);

    const payload = {
        teacher_override_grade: teacherGrade.trim() === '' ? null : teacherGrade.trim(),
        teacher_override_notes: teacherNotes.trim() === '' ? null : teacherNotes.trim(),
        status: currentStatus,
    };

    try {
        const response = await fetch(`/api/teacher/assessments?assessmentId=${assessment.assessment_id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || 'Failed to save teacher review.');
        }

        setReviewSuccess("Teacher review saved successfully!");
        // Update local assessment state with the successfully saved data from the API response
        setAssessment(prev => prev ? ({ ...prev, ...responseData }) : null); 
        // Or, if you prefer to update fields directly from form state:
        // setAssessment(prev => prev ? ({
        //     ...prev,
        //     teacher_override_grade: payload.teacher_override_grade,
        //     teacher_override_notes: payload.teacher_override_notes,
        //     status: payload.status,
        //     updated_at: new Date().toISOString() // Or use updated_at from responseData
        // }) : null);

    } catch (err) {
        setReviewError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsSubmittingReview(false);
    }
  };
  // ***** END OF UPDATED handleReviewSubmit *****


  if (loading) { /* ... loading UI ... */ }
  if (error) { /* ... error UI ... */ }
  if (!assessment) { /* ... no assessment UI ... */ }

  // (Make sure to destructure all fields you need from assessment)
  const student_name = assessment?.student_name;
  const student_email = assessment?.student_email;
  const chatbot_name = assessment?.chatbot_name;
  const assessed_at = assessment?.assessed_at;
  const teacher_assessment_criteria_snapshot = assessment?.teacher_assessment_criteria_snapshot;
  const ai_feedback_student = assessment?.ai_feedback_student;
  const ai_grade_raw = assessment?.ai_grade_raw;
  const ai_assessment_details_teacher = assessment?.ai_assessment_details_teacher;
  const assessed_conversation = assessment?.assessed_conversation;


  return (
    <PageWrapper>
      <Container>
        <Header>
          <PageTitle>Review Assessment: {student_name || 'Student'}</PageTitle>
          <BackButton variant="outline" onClick={() => router.push('/teacher-dashboard/assessments')}>
            {'<'} All Assessments
          </BackButton>
        </Header>

        <MainGrid>
          <ConversationContextCard>
            {/* ... Conversation display ... */}
            <CardHeader>Assessed Conversation Snippet</CardHeader>
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
                <p>No conversation snippet available for this assessment.</p>
              )}
            </MessagesList>
          </ConversationContextCard>

          <AssessmentDetailsCard>
            <CardHeader>AI Assessment & Teacher Review</CardHeader>
            {/* ... Display of assessment details (student, bot, criteria, AI grade, AI feedback, AI analysis) ... */}
            {/* This part remains largely the same as in content-reply-032 */}
            <DetailItem><strong>Student:</strong> <span>{student_name || 'N/A'} ({student_email || 'No email'})</span></DetailItem>
            <DetailItem><strong>Assessment Bot:</strong> <span>{chatbot_name || 'N/A'}</span></DetailItem>
            <DetailItem>
              <strong>Assessed On:</strong>
              <span>
                {assessed_at ? new Date(assessed_at).toLocaleString() : 'N/A'}
              </span>
            </DetailItem>
            <DetailItem>
              <strong>Teacher&apos;s Criteria Used:</strong> 
              {ai_assessment_details_teacher?.criteria_summary ? (
                <p style={{marginBottom: '10px'}}>{ai_assessment_details_teacher.criteria_summary}</p>
              ) : null}
              <details>
                <summary style={{cursor: 'pointer', color: '#666', fontSize: '0.8rem', marginBottom: '5px'}}>
                  View full criteria
                </summary>
                <p style={{whiteSpace: 'pre-wrap', fontStyle: 'italic', color: '#555'}}>{teacher_assessment_criteria_snapshot || 'N/A'}</p>
              </details>
            </DetailItem>
            
            <Divider />
            <CardHeader style={{fontSize: '1.1rem', marginTop:'1rem', borderBottom: 'none'}}>AI Generated Assessment</CardHeader>
            <DetailItem><strong>AI Suggested Grade:</strong> <Badge variant={ai_grade_raw?.toLowerCase().includes('error') ? 'error' : 'default'}>{ai_grade_raw || 'Not graded by AI'}</Badge></DetailItem>
            <DetailItem><strong>AI Feedback to Student:</strong> <p>{ai_feedback_student || 'No AI feedback provided.'}</p></DetailItem>
            
            {ai_assessment_details_teacher && (
              <DetailItem>
                <strong>AI Analysis for Teacher:</strong>
                <AnalysisBlock>
                  {ai_assessment_details_teacher.summary && <p><strong>Summary:</strong> {ai_assessment_details_teacher.summary}</p>}
                  {ai_assessment_details_teacher.strengths && ai_assessment_details_teacher.strengths.length > 0 && ( <> <p style={{marginTop: '8px'}}><strong>Strengths:</strong></p> <ul>{ai_assessment_details_teacher.strengths.map((s, i) => <li key={`s-${i}`}>{s}</li>)}</ul> </> )}
                  {ai_assessment_details_teacher.areas_for_improvement && ai_assessment_details_teacher.areas_for_improvement.length > 0 && ( <> <p style={{marginTop: '8px'}}><strong>Areas for Improvement:</strong></p> <ul>{ai_assessment_details_teacher.areas_for_improvement.map((a, i) => <li key={`a-${i}`}>{a}</li>)}</ul> </> )}
                  {ai_assessment_details_teacher.grading_rationale && <p style={{marginTop: '8px'}}><strong>Rationale:</strong> {ai_assessment_details_teacher.grading_rationale}</p>}
                </AnalysisBlock>
              </DetailItem>
            )}

            <TeacherReviewForm onSubmit={handleReviewSubmit}>
              <CardHeader style={{fontSize: '1.1rem', borderBottom: 'none'}}>Teacher&apos;s Review & Override</CardHeader>
              {reviewError && <Alert variant="error">{reviewError}</Alert>}
              {reviewSuccess && <Alert variant="success">{reviewSuccess}</Alert>}
              <FormGroup>
                <Label htmlFor="teacherGrade">Override Grade (optional)</Label>
                <Input type="text" id="teacherGrade" value={teacherGrade} onChange={(e) => setTeacherGrade(e.target.value)} placeholder="e.g., B+, 9/10, Meets Standard" />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="teacherNotes">Teacher Notes/Feedback (optional)</Label>
                <TextArea id="teacherNotes" value={teacherNotes} onChange={(e) => setTeacherNotes(e.target.value)} rows={4} placeholder="Your observations, final feedback, or notes for records..." />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="assessmentStatus">Update Status</Label>
                <StyledSelect id="assessmentStatus" value={currentStatus} onChange={(e) => setCurrentStatus(e.target.value as AssessmentStatusEnum)}>
                    {/* Keep ai_processing if you want teachers to manually move it out of this state */}
                    {/* <option value="ai_processing">AI Processing</option>  */}
                    <option value="ai_completed">AI Completed (Ready for Review)</option>
                    <option value="teacher_reviewed">Teacher Reviewed</option>
                </StyledSelect>
              </FormGroup>
              <Button type="submit" disabled={isSubmittingReview} style={{width: '100%'}}>
                {isSubmittingReview ? 'Saving Review...' : 'Save Teacher Review'}
              </Button>
            </TeacherReviewForm>
          </AssessmentDetailsCard>
        </MainGrid>
      </Container>
    </PageWrapper>
  );
}