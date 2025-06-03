// src/app/teacher-dashboard/rooms/[roomId]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Card, Alert, Badge } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import StudentCsvUpload from '@/components/teacher/StudentCsvUpload';
import ArchivePanel from '@/components/teacher/ArchivePanel';
import type { Room, Chatbot, Course, Profile } from '@/types/database.types'; // Base types

// --- Data Structure for the Page State ---
interface StudentInRoom extends Pick<Profile, 'user_id' | 'full_name'> {
  joined_at: string;
  email?: string; // Make email optional for backward compatibility
  username?: string;
}

interface RoomDetailsData {
  room: Room;
  chatbots: Pick<Chatbot, 'chatbot_id' | 'name' | 'description' | 'bot_type'>[];
  courses: Pick<Course, 'course_id' | 'title' | 'description' | 'subject'>[];
  students: StudentInRoom[];
}

// MagicLinkResponse interface removed

// --- Styled Components ---

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  width: 100%;
  max-width: 450px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 24px;
    margin: 16px;
  }
  
  h3 {
    margin-bottom: 16px;
    font-size: 24px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 20px;
    }
  }
  
  p {
    margin-bottom: 24px;
    color: ${({ theme }) => theme.colors.textLight};
    line-height: 1.5;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 14px;
      margin-bottom: 16px;
    }
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 24px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column-reverse;
    gap: 12px;
    
    button {
      width: 100%;
    }
  }
`;
const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.lg} 0;
  min-height: 100vh;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md} 0;
  }
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
`;

const RoomInfo = styled.div`
  h1 {
    font-size: 36px;
    font-weight: 800;
    font-family: ${({ theme }) => theme.fonts.heading};
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: ${({ theme }) => theme.spacing.sm};
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
  
  .room-code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
    margin-top: ${({ theme }) => theme.spacing.xs};
    font-size: 1.1rem;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 1rem;
    }
  }
`;

const BackButtonWrapper = styled.div`
  // Wrapper for back button
`;

const Section = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 20px;
    border-radius: 16px;
    margin-bottom: ${({ theme }) => theme.spacing.lg};
  }
`;

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.5rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 1.25rem;
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
`;

// Chatbots Section
const ChatbotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing.md};
  }
`;

const ChatbotCard = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(152, 93, 215, 0.1);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 16px;
  }

  h3 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: 1.3rem;
    font-weight: 600;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 1.1rem;
    }
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.95rem;
    margin-bottom: ${({ theme }) => theme.spacing.md};
    min-height: 45px;
    line-height: 1.5;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 0.875rem;
      min-height: auto;
    }
  }
`;

// Students Section
const StudentListTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: ${({ theme }) => theme.spacing.md};
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  th {
    color: ${({ theme }) => theme.colors.textLight};
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  // Styled Link for student names in table
  td a { // Target <a> rendered by <Link>
    color: ${({ theme }) => theme.colors.text};
    text-decoration: none;
    font-weight: 500;
    &:hover {
      color: ${({ theme }) => theme.colors.primary};
      text-decoration: underline;
    }
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none; // Hide table on smaller screens
  }
`;

const StudentListMobile = styled.div`
  display: none;
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: block; // Show cards on smaller screens
  }
`;

const StudentCard = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 4px 16px rgba(152, 93, 215, 0.05);
  transition: all 0.3s ease;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(152, 93, 215, 0.1);
  }

  .student-name-link { // Use a class for the Link component itself
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    display: block;
    text-decoration: none;
     &:hover {
        text-decoration: underline;
     }
  }
  .student-email, .joined-at {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.textMuted};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
  }
`;


const EmptyStateText = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => theme.spacing.lg} 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  gap: ${({ theme }) => theme.spacing.md};
`;

// Magic link styled components removed



export default function TeacherRoomDetailPage() {
  const [roomDetails, setRoomDetails] = useState<RoomDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [studentToArchive, setStudentToArchive] = useState<StudentInRoom | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showArchivedStudents, setShowArchivedStudents] = useState(false);
  const [archivingStudents, setArchivingStudents] = useState<Record<string, boolean>>({});
  const [deletingStudents, setDeletingStudents] = useState<Record<string, boolean>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentInRoom | null>(null);
  
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;

  const fetchRoomDetails = useCallback(async () => {
    if (!roomId) {
      setError("Room ID not found in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/teacher/room-details?roomId=${roomId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch room details (status ${response.status})`);
      }
      const data: RoomDetailsData = await response.json();
      setRoomDetails(data);
    } catch (err) {
      console.error("Error fetching room details:", err);
      setError(err instanceof Error ? err.message : "Could not load room details.");
      setRoomDetails(null);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoomDetails();
  }, [fetchRoomDetails]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };
  
  const openArchiveModal = (student: StudentInRoom) => {
    setStudentToArchive(student);
    setShowArchiveModal(true);
  };
  
  const closeArchiveModal = () => {
    setShowArchiveModal(false);
    setStudentToArchive(null);
  };
  
  const openDeleteModal = (student: StudentInRoom) => {
    setStudentToDelete(student);
    setShowDeleteModal(true);
  };
  
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setStudentToDelete(null);
  };
  
  const archiveStudent = async (studentId: string) => {
    // Mark student as archiving
    setArchivingStudents(prev => ({ ...prev, [studentId]: true }));
    
    try {
      const response = await fetch(`/api/teacher/students/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId,
          roomId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to archive student (${response.status})`);
      }
      
      // Remove the student from the list
      if (roomDetails) {
        setRoomDetails({
          ...roomDetails,
          students: roomDetails.students.filter(s => s.user_id !== studentId)
        });
      }
      
      closeArchiveModal();
    } catch (err) {
      console.error('Error archiving student:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive student');
      
      // Reset archiving state
      setArchivingStudents(prev => {
        const newState = { ...prev };
        delete newState[studentId];
        return newState;
      });
      
      closeArchiveModal();
    }
  };
  
  const deleteStudent = async (studentId: string) => {
    // Mark student as deleting
    setDeletingStudents(prev => ({ ...prev, [studentId]: true }));
    
    try {
      const response = await fetch(`/api/teacher/students`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId,
          roomId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete student (${response.status})`);
      }
      
      // Remove the student from the list
      if (roomDetails) {
        setRoomDetails({
          ...roomDetails,
          students: roomDetails.students.filter(s => s.user_id !== studentId)
        });
      }
      
      closeDeleteModal();
    } catch (err) {
      console.error('Error deleting student:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete student');
      
      // Reset deleting state
      setDeletingStudents(prev => {
        const newState = { ...prev };
        delete newState[studentId];
        return newState;
      });
      
      closeDeleteModal();
    }
  };
  
  // Magic link related functions removed

  if (loading) {
    return (
      <PageWrapper>
        <Container>
          <LoadingContainer>
            <LoadingSpinner size="large" />
            <p>Loading room details...</p>
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
          <ModernButton onClick={() => router.push('/teacher-dashboard/rooms')} variant="ghost" style={{ marginTop: '16px' }}>
            Back to Rooms
          </ModernButton>
        </Container>
      </PageWrapper>
    );
  }

  if (!roomDetails) {
    return (
      <PageWrapper>
        <Container>
          <Alert variant="info">Room details not found.</Alert>
           <ModernButton onClick={() => router.push('/teacher-dashboard/rooms')} variant="ghost" style={{ marginTop: '16px' }}>
            Back to Rooms
          </ModernButton>
        </Container>
      </PageWrapper>
    );
  }

  const { room, chatbots, courses, students } = roomDetails;

  return (
    <PageWrapper>
      <Container>
        <Header>
          <RoomInfo>
            <h1>{room.room_name}</h1>
            <p className="room-code">Room Code: {room.room_code}</p>
          </RoomInfo>
          <BackButtonWrapper>
            <ModernButton 
              variant="ghost"
              onClick={() => router.push('/teacher-dashboard/rooms')}
            >
              ← All Rooms
            </ModernButton>
          </BackButtonWrapper>
        </Header>

        <Section>
          <SectionTitle>Assigned Skolrs ({chatbots.length})</SectionTitle>
          {chatbots.length > 0 ? (
            <ChatbotGrid>
              {chatbots.map(bot => (
                <ChatbotCard key={bot.chatbot_id}>
                  <h3>
                    {bot.bot_type === 'assessment' && '📝 '}
                    {bot.bot_type === 'reading_room' && '📖 '}
                    {bot.bot_type === 'viewing_room' && '📹 '}
                    {bot.bot_type === 'learning' && '🤖 '}
                    {bot.name}
                  </h3>
                  <p>{bot.description || 'No description provided.'}</p>
                  <Badge variant={
                    bot.bot_type === 'assessment' ? 'warning' :
                    bot.bot_type === 'reading_room' ? 'cyan' :
                    bot.bot_type === 'viewing_room' ? 'magenta' :
                    'default'
                  }>
                    {bot.bot_type === 'assessment' ? 'Assessment' :
                     bot.bot_type === 'reading_room' ? 'Reading Room' :
                     bot.bot_type === 'viewing_room' ? 'Viewing Room' :
                     'Learning'}
                  </Badge>
                </ChatbotCard>
              ))}
            </ChatbotGrid>
          ) : (
            <EmptyStateText>No Skolrs are currently assigned to this room.</EmptyStateText>
          )}
        </Section>

        <Section>
          <SectionTitle>Assigned Courses ({courses?.length || 0})</SectionTitle>
          {courses && courses.length > 0 ? (
            <ChatbotGrid>
              {courses.map(course => (
                <ChatbotCard key={course.course_id}>
                  <h3>📚 {course.title}</h3>
                  <p>{course.description || 'No description provided.'}</p>
                  <Badge variant="cyan">
                    {course.subject || 'Course'}
                  </Badge>
                </ChatbotCard>
              ))}
            </ChatbotGrid>
          ) : (
            <EmptyStateText>No courses are currently assigned to this room.</EmptyStateText>
          )}
        </Section>

        <Section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <SectionTitle style={{ marginBottom: 0 }}>Enrolled Students ({students.length})</SectionTitle>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <ModernButton                 variant="ghost"
                size="small"
                onClick={() => setShowArchivedStudents(!showArchivedStudents)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {showArchivedStudents ? 'Hide Archived' : 'View Archived'}
              </ModernButton>
              <ModernButton 
                variant="primary" 
                size="small"
                onClick={() => setShowCsvUpload(true)}
              >
                Import CSV
              </ModernButton>
            </div>
          </div>
          
          {students.length > 0 ? (
            <>
              <StudentListTable>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Joined On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.user_id}>
                      <td>
                        {/* Corrected Link usage: No <a> child */}
                        <Link href={`/teacher-dashboard/rooms/${roomId}/students/${student.user_id}`}>
                           {student.full_name}
                        </Link>
                      </td>
                      <td>{student.username || 'N/A'}</td>
                      <td>{formatDate(student.joined_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <ModernButton 
                            size="small"
                            onClick={() => router.push(`/teacher-dashboard/rooms/${roomId}/students/${student.user_id}`)}
                            variant="ghost"
                          >
                            View Details
                          </ModernButton>
                          {archivingStudents[student.user_id] ? (
                            <ModernButton size="small" disabled>
                              <LoadingSpinner size="small" /> Archiving...
                            </ModernButton>
                          ) : (
                            <ModernButton                               size="small"
                              variant="secondary"
                              onClick={() => openArchiveModal(student)}
                            >
                              Archive
                            </ModernButton>
                          )}
                          {deletingStudents[student.user_id] ? (
                            <ModernButton size="small" disabled>
                              <LoadingSpinner size="small" /> Deleting...
                            </ModernButton>
                          ) : (
                            <ModernButton                               size="small"
                              variant="danger"
                              onClick={() => openDeleteModal(student)}
                              style={{ backgroundColor: '#dc3545', color: 'white' }}
                            >
                              Delete
                            </ModernButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </StudentListTable>

              <StudentListMobile>
                {students.map(student => (
                  <StudentCard key={`mobile-${student.user_id}`}>
                    {/* Corrected Link usage: No <a> child */}
                    <Link href={`/teacher-dashboard/rooms/${roomId}/students/${student.user_id}`} className="student-name-link">
                        {student.full_name}
                    </Link>
                    <p className="student-email">Username: {student.username || 'N/A'}</p>
                    <p className="joined-at">Joined: {formatDate(student.joined_at)}</p>
                     <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        <ModernButton 
                          size="small"
                          onClick={() => router.push(`/teacher-dashboard/rooms/${roomId}/students/${student.user_id}`)}
                          variant="ghost"
                          style={{flex: '1 1 100%'}}
                        >
                          View Details
                        </ModernButton>
                        <div style={{ display: 'flex', gap: '8px', flex: '1 1 100%' }}>
                          {archivingStudents[student.user_id] ? (
                            <ModernButton size="small" disabled style={{flex: 1}}>
                              Archiving...
                            </ModernButton>
                          ) : (
                            <ModernButton                               size="small"
                              variant="secondary"
                              onClick={() => openArchiveModal(student)}
                              style={{flex: 1}}
                            >
                              Archive
                            </ModernButton>
                          )}
                          {deletingStudents[student.user_id] ? (
                            <ModernButton size="small" disabled style={{flex: 1}}>
                              Deleting...
                            </ModernButton>
                          ) : (
                            <ModernButton                               size="small"
                              variant="danger"
                              onClick={() => openDeleteModal(student)}
                              style={{flex: 1, backgroundColor: '#dc3545', color: 'white'}}
                            >
                              Delete
                            </ModernButton>
                          )}
                        </div>
                      </div>
                      
                      {/* Magic link functionality removed */}
                  </StudentCard>
                ))}
              </StudentListMobile>
            </>
          ) : (
            <EmptyStateText>No students have joined this room yet.</EmptyStateText>
          )}
        </Section>

        {showArchivedStudents && (
          <ArchivePanel 
            type="students"
            roomId={roomId}
            onItemRestored={fetchRoomDetails}
          />
        )}

      </Container>
      
      {/* CSV Upload Modal */}
      {showCsvUpload && (
        <StudentCsvUpload
          roomId={roomId}
          roomName={room.room_name}
          onClose={() => {
            setShowCsvUpload(false);
            // Refresh the room details to show newly added students
            fetchRoomDetails();
          }}
        />
      )}
      
      {/* Archive Confirmation Modal */}
      {showArchiveModal && studentToArchive && (
        <ModalOverlay onClick={closeArchiveModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <h3>Archive Student</h3>
            <p>Are you sure you want to remove <strong>{studentToArchive.full_name}</strong> from this room?</p>
            <p>The student will no longer have access to this room, but their account and data will be preserved.</p>
            <ModalActions>
              <ModernButton variant="ghost" onClick={closeArchiveModal}>
                Cancel
              </ModernButton>
              <ModernButton 
                variant="secondary" 
                onClick={() => archiveStudent(studentToArchive.user_id)}
              >
                Archive Student
              </ModernButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && studentToDelete && (
        <ModalOverlay onClick={closeDeleteModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <h3>Delete Student</h3>
            <p>Are you sure you want to permanently delete <strong>{studentToDelete.full_name}</strong>?</p>
            <p style={{ color: '#dc3545', fontWeight: 'bold' }}>⚠️ This action cannot be undone. The student's account and all associated data will be permanently deleted.</p>
            <ModalActions>
              <ModernButton variant="ghost" onClick={closeDeleteModal}>
                Cancel
              </ModernButton>
              <ModernButton 
                variant="danger" 
                onClick={() => deleteStudent(studentToDelete.user_id)}
                style={{ backgroundColor: '#dc3545', color: 'white' }}
              >
                Delete Permanently
              </ModernButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageWrapper>
  );
}