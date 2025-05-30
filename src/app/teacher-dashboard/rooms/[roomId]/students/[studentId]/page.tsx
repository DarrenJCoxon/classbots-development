// src/app/teacher-dashboard/rooms/[roomId]/students/[studentId]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Alert, Badge } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
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
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  position: relative;
  
  /* Subtle animated background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(76, 190, 243, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(152, 93, 215, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 40% 20%, rgba(200, 72, 175, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const ContentContainer = styled(Container)`
  position: relative;
  z-index: 1;
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
    font-size: 36px;
    font-weight: 800;
    font-family: ${({ theme }) => theme.fonts.heading};
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.primary}, 
      ${({ theme }) => theme.colors.magenta}
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 28px;
    }
  }
  p {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 1rem;
    margin: 0;
  }
`;

const TabContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 8px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  display: flex;
  gap: 8px;
`;

const TabButton = styled.button<{ $isActive: boolean }>`
  padding: 12px 24px;
  border: none;
  background: ${({ $isActive }) => $isActive ? 'rgba(152, 93, 215, 0.1)' : 'transparent'};
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme, $isActive }) => $isActive ? theme.colors.primary : theme.colors.textLight};
  border-radius: 12px;
  transition: all 0.2s ease;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: ${({ $isActive }) => $isActive ? '40px' : '0'};
    height: 3px;
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.primary}, 
      ${({ theme }) => theme.colors.magenta}
    );
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  &:hover {
    background: rgba(152, 93, 215, 0.05);
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const TabContent = styled.div`
  padding-top: ${({ theme }) => theme.spacing.lg};
`;

const SummarySection = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
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

const CredentialsGrid = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 16px;
  margin-top: 8px;
  font-size: 0.9rem;
`;

const CredentialLabel = styled.span`
  color: ${({ theme }) => theme.colors.textLight};
  font-weight: 500;
`;

const CredentialValue = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-family: monospace;
  font-weight: 600;
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
  const [pinCode, setPinCode] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [yearGroup, setYearGroup] = useState<string>('');
  const [isLoadingPin, setIsLoadingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [regeneratingPin, setRegeneratingPin] = useState(false);

  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const studentId = params?.studentId as string;

  // Function to copy credentials to clipboard
  const copyPinToClipboard = () => {
    if (username && pinCode) {
      const copyText = yearGroup 
        ? `Username: ${username}\nPIN: ${pinCode}\nYear Group: ${yearGroup}`
        : `Username: ${username}\nPIN: ${pinCode}`;
      
      navigator.clipboard.writeText(copyText).then(() => {
        setShowCopiedMessage(true);
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => {
          setShowCopiedMessage(false);
        }, 3000);
      });
    }
  };

  // Function to regenerate pin
  const handleRegeneratePin = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentId) return;
    
    setRegeneratingPin(true);
    setPinError(null);
    
    try {
      const response = await fetch('/api/teacher/students/pin-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to regenerate PIN (status ${response.status})`);
      }
      
      const data = await response.json();
      setPinCode(data.pin_code || '');
      setUsername(data.username || '');
      setYearGroup(data.year_group || '');
      
    } catch (err) {
      console.error('Error regenerating PIN:', err);
      setPinError(err instanceof Error ? err.message : 'Failed to regenerate PIN code');
    } finally {
      setRegeneratingPin(false);
    }
  };
  
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
  
  // Fetch PIN info
  useEffect(() => {
    const fetchPinCode = async () => {
      if (!studentId) return;
      
      setIsLoadingPin(true);
      setPinError(null);
      
      try {
        const response = await fetch(`/api/teacher/students/pin-code?studentId=${studentId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch PIN (status ${response.status})`);
        }
        
        const data = await response.json();
        setPinCode(data.pin_code || '');
        setUsername(data.username || '');
        setYearGroup(data.year_group || '');
        
      } catch (err) {
        console.error('Error fetching PIN:', err);
        setPinError(err instanceof Error ? err.message : 'Failed to fetch PIN code');
      } finally {
        setIsLoadingPin(false);
      }
    };
    
    fetchPinCode();
  }, [studentId]);
  

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <PageWrapper>
        <ContentContainer>
          <LoadingContainer>
            <LoadingSpinner size="large" /> <p>Loading student details...</p>
          </LoadingContainer>
        </ContentContainer>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <ContentContainer>
          <Alert variant="error">{error}</Alert>
          <div style={{ marginTop: '16px' }}>
            <ModernButton onClick={() => router.back()}>← Back</ModernButton>
          </div>
        </ContentContainer>
      </PageWrapper>
    );
  }

  if (!details || !details.student) {
    return (
      <PageWrapper>
        <ContentContainer>
          <Alert variant="info">Student details not found.</Alert>
          <div style={{ marginTop: '16px' }}>
            <ModernButton onClick={() => router.back()}>← Back</ModernButton>
          </div>
        </ContentContainer>
      </PageWrapper>
    );
  }

  const { student, assessments, concerns, roomChatbots } = details;

  return (
    <PageWrapper>
      <ContentContainer>
        <Header>
          <StudentInfoBar>
            <h1>{student.full_name || 'Student'}</h1>
            {student.email && <p>{student.email}</p>}
            
            {/* Student Access Section */}
            <div style={{ marginTop: '15px' }}>
              <SummarySection>
                <SectionTitle>Student Login Credentials</SectionTitle>
                {isLoadingPin ? (
                  <p>Loading access details...</p>
                ) : pinError ? (
                  <Alert variant="error">{pinError}</Alert>
                ) : (
                  <div>
                    <CredentialsGrid>
                      <CredentialLabel>Username:</CredentialLabel>
                      <CredentialValue>{username || 'Not set'}</CredentialValue>
                      
                      <CredentialLabel>PIN:</CredentialLabel>
                      <CredentialValue>{pinCode || 'Not set'}</CredentialValue>
                      
                      {yearGroup && (
                        <>
                          <CredentialLabel>Year Group:</CredentialLabel>
                          <CredentialValue>{yearGroup}</CredentialValue>
                        </>
                      )}
                    </CredentialsGrid>
                    
                    <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <ModernButton 
                        onClick={copyPinToClipboard} 
                        variant="secondary"
                        size="small"
                        disabled={!pinCode || !username}
                      >
                        {showCopiedMessage ? 'Copied!' : 'Copy Credentials'}
                      </ModernButton>
                      
                      <ModernButton 
                        onClick={handleRegeneratePin}
                        variant="ghost"
                        size="small"
                        disabled={regeneratingPin}
                      >
                        {regeneratingPin ? 'Regenerating...' : 'Regenerate PIN'}
                      </ModernButton>
                    </div>
                    
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '12px', marginBottom: '0' }}>
                      Students can log in at <strong>/student-login</strong> using these credentials.
                    </p>
                  </div>
                )}
              </SummarySection>
            </div>
          </StudentInfoBar>
          <ModernButton variant="ghost" onClick={() => router.push(`/teacher-dashboard/rooms/${roomId}`)}>
            ← Back to Room Overview
          </ModernButton>
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
                 {assessments.length > 5 && <div style={{marginTop: '10px'}}><ModernButton variant="ghost" onClick={() => setActiveTab('assessments')}>View All Assessments ({assessments.length})</ModernButton></div>}
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
                {concerns.length > 5 && <div style={{marginTop: '10px'}}><ModernButton variant="ghost" onClick={() => setActiveTab('concerns')}>View All Concerns ({concerns.length})</ModernButton></div>}
              </SummarySection>
            </div>
          )}

          {activeTab === 'chats' && (
            <SummarySection>
              <StudentChatHistory
                roomId={roomId}
                studentId={studentId}
                studentName={student.full_name || 'Student'}
                chatbots={roomChatbots || []} // Pass the fetched chatbots for the room
              />
            </SummarySection>
          )}

          {activeTab === 'assessments' && (
            <SummarySection>
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
            </SummarySection>
          )}

          {activeTab === 'concerns' && (
            <SummarySection>
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
            </SummarySection>
          )}
        </TabContent>
      </ContentContainer>
    </PageWrapper>
  );
}