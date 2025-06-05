// src/app/teacher-dashboard/students/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from '@/components/shared/PageStructure';
import { Alert } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import { FullPageLoader } from '@/components/shared/AnimatedLoader';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface StudentAssessment {
  assessment_id: string;
  assessed_at: string;
  ai_grade_raw: string | null;
  teacher_override_grade: string | null;
  status: string | null;
  chatbot_name: string;
}

interface StudentWithAssessments {
  user_id: string;
  full_name: string;
  year_group: string | null;
  room_id: string;
  room_name: string;
  assessments: StudentAssessment[];
  average_grade: number | null;
  safety_concerns: Array<{
    flag_id: string;
    created_at: string;
    concern_type: string;
    concern_level: number;
    status: string;
    room_id: string;
  }>;
  pending_concerns_count: number;
}

interface Room {
  room_id: string;
  room_name: string;
  student_count: number;
}

interface StudentsOverviewResponse {
  students: StudentWithAssessments[];
  rooms: Room[];
}

// Styled components
const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.magenta});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
`;

const FilterSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap;
`;

const FilterLabel = styled.label`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
`;

const Select = styled.select`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  min-width: 200px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(152, 93, 215, 0.2);
  }

  option {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const TableContainer = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: ${({ theme }) => theme.borderRadius.large};
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.spacing.lg};
  background: rgba(152, 93, 215, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
  z-index: 1;
`;

const TableCell = styled.td`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: ${({ theme }) => theme.colors.text};
  vertical-align: top;
`;

const StudentName = styled.button`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  padding: 0;
  text-decoration: underline;
  transition: color 0.2s ease;
  
  &:hover {
    color: ${({ theme }) => theme.colors.blue};
  }
`;

const RoomName = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textLight};
`;

const YearGroup = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 2px 8px;
  background: rgba(152, 93, 215, 0.1);
  border-radius: ${({ theme }) => theme.borderRadius.small};
  display: inline-block;
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const AssessmentGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 300px;
`;

interface AssessmentChipProps {
  $grade: string | null;
}

const AssessmentChip = styled(motion.button)<AssessmentChipProps>`
  background: ${({ $grade }) => 
    $grade ? 'linear-gradient(135deg, rgba(152, 93, 215, 0.2), rgba(255, 107, 107, 0.2))' : 'rgba(128, 128, 128, 0.2)'
  };
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: ${({ theme }) => theme.borderRadius.small};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(152, 93, 215, 0.3);
    background: ${({ $grade }) => 
      $grade ? 'linear-gradient(135deg, rgba(152, 93, 215, 0.3), rgba(255, 107, 107, 0.3))' : 'rgba(128, 128, 128, 0.3)'
    };
  }

  .grade {
    font-size: 0.875rem;
    margin-bottom: ${({ theme }) => theme.spacing.xs};
  }

  .date {
    font-size: 0.6rem;
    opacity: 0.8;
  }
`;

const AverageGrade = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  text-align: center;
  padding: ${({ theme }) => theme.spacing.sm};
  background: linear-gradient(135deg, rgba(152, 93, 215, 0.1), rgba(255, 107, 107, 0.1));
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border: 1px solid rgba(152, 93, 215, 0.3);
`;

const ConcernsSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

interface ConcernIndicatorProps {
  $level: 'low' | 'medium' | 'high';
  $isPending: boolean;
}

const ConcernIndicator = styled(motion.button)<ConcernIndicatorProps>`
  background: ${({ $level, $isPending }) => {
    if (!$isPending) return 'rgba(128, 128, 128, 0.2)';
    switch($level) {
      case 'high': return 'rgba(239, 68, 68, 0.2)';
      case 'medium': return 'rgba(251, 146, 60, 0.2)';
      default: return 'rgba(250, 204, 21, 0.2)';
    }
  }};
  border: 1px solid ${({ $level, $isPending }) => {
    if (!$isPending) return 'rgba(128, 128, 128, 0.3)';
    switch($level) {
      case 'high': return 'rgba(239, 68, 68, 0.4)';
      case 'medium': return 'rgba(251, 146, 60, 0.4)';
      default: return 'rgba(250, 204, 21, 0.4)';
    }
  }};
  color: ${({ $level, $isPending, theme }) => {
    if (!$isPending) return theme.colors.textMuted;
    switch($level) {
      case 'high': return '#DC2626';
      case 'medium': return '#EA580C';
      default: return '#CA8A04';
    }
  }};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${({ $level }) => {
      switch($level) {
        case 'high': return 'rgba(239, 68, 68, 0.3)';
        case 'medium': return 'rgba(251, 146, 60, 0.3)';
        default: return 'rgba(250, 204, 21, 0.3)';
      }
    }};
  }

  .icon {
    font-size: 0.875rem;
  }
`;

const PendingBadge = styled.span`
  background: rgba(239, 68, 68, 0.2);
  color: #DC2626;
  border-radius: 9999px;
  padding: 2px 6px;
  font-size: 0.625rem;
  font-weight: 700;
  margin-left: ${({ theme }) => theme.spacing.xs};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.textMuted};
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.borderRadius.large};
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const LoadingState = styled(EmptyState)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

// Mobile components
const MobileList = styled.div`
  display: none;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: block;
  }
`;

const MobileCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: ${({ theme }) => theme.borderRadius.large};
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
`;

const MobileHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const MobileStudentInfo = styled.div`
  .name {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    padding: 0;
    text-decoration: underline;
    transition: color 0.2s ease;
    
    &:hover {
      color: ${({ theme }) => theme.colors.blue};
    }
  }
  
  .room {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
  }
  
  .year-group {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
    padding: 2px 8px;
    background: rgba(152, 93, 215, 0.1);
    border-radius: ${({ theme }) => theme.borderRadius.small};
    display: inline-block;
  }
`;

const MobileAssessments = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  
  .label {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-weight: 600;
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: ${({ theme }) => theme.borderRadius.large};
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);

  .value {
    font-size: 2rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
  }

  .label {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textLight};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

export default function StudentsPage() {
  const [data, setData] = useState<StudentsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = new URL('/api/teacher/students-overview', window.location.origin);
      if (selectedRoomId !== 'all') {
        url.searchParams.set('roomId', selectedRoomId);
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `Failed to fetch data (${response.status})`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching students overview:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatGrade = (assessment: StudentAssessment) => {
    const grade = assessment.teacher_override_grade || assessment.ai_grade_raw;
    if (!grade) return 'N/A';
    
    // Extract numeric value and format
    const match = grade.match(/(\d+(?:\.\d+)?)/);
    return match ? `${Math.round(parseFloat(match[1]))}%` : grade;
  };

  const handleAssessmentClick = (assessmentId: string) => {
    router.push(`/teacher-dashboard/assessments/${assessmentId}`);
  };

  const handleStudentClick = (studentId: string, roomId: string) => {
    router.push(`/teacher-dashboard/rooms/${roomId}/students/${studentId}`);
  };

  const handleConcernClick = (flagId: string) => {
    router.push(`/teacher-dashboard/concerns/${flagId}`);
  };

  const getHighestConcernLevel = (concerns: StudentWithAssessments['safety_concerns']): 'low' | 'medium' | 'high' => {
    if (concerns.length === 0) return 'low';
    const maxLevel = Math.max(...concerns.map(c => c.concern_level));
    if (maxLevel >= 4) return 'high';
    if (maxLevel >= 3) return 'medium';
    return 'low';
  };

  const formatConcernType = (type: string): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredStudents = data?.students || [];
  const totalStudents = data?.students.length || 0;
  const totalAssessments = data?.students.reduce((sum, student) => sum + student.assessments.length, 0) || 0;
  const averageGrade = data?.students
    .filter(s => s.average_grade !== null)
    .reduce((sum, s, _, arr) => sum + (s.average_grade || 0) / arr.length, 0) || 0;
  const totalPendingConcerns = data?.students.reduce((sum, student) => sum + student.pending_concerns_count, 0) || 0;

  const downloadCSV = async () => {
    if (!data || downloadingCSV) return;
    
    setDownloadingCSV(true);
    setError(null);
    
    try {
      // Prepare CSV data
      const csvHeader = 'Student Name,Username,PIN Code,Email,Room,Year Group,Average Grade,Assessments Count,Pending Concerns\n';
      const csvRows = await Promise.all(
        data.students.map(async (student) => {
          // Fetch student PIN and username
          let username = 'N/A';
          let pin = 'N/A';
          let email = 'N/A';
          
          try {
            const response = await fetch(`/api/teacher/students/pin-code?studentId=${student.user_id}`);
            if (response.ok) {
              const pinData = await response.json();
              username = pinData.username || 'N/A';
              pin = pinData.pin_code || 'N/A';
            }
          } catch (err) {
            console.error(`Error fetching PIN for student ${student.user_id}:`, err);
          }
          
          // Try to fetch email from student profile
          try {
            const response = await fetch(`/api/teacher/students?roomId=${student.room_id}`);
            if (response.ok) {
              const students = await response.json();
              const studentData = students.find((s: any) => s.user_id === student.user_id);
              if (studentData) {
                email = studentData.email || 'N/A';
              }
            }
          } catch (err) {
            console.error(`Error fetching email for student ${student.user_id}:`, err);
          }
          
          const name = student.full_name || 'N/A';
          const room = student.room_name || 'N/A';
          const yearGroup = student.year_group || 'N/A';
          const averageGrade = student.average_grade !== null ? `${Math.round(student.average_grade)}%` : 'N/A';
          const assessmentsCount = student.assessments.length;
          const pendingConcerns = student.pending_concerns_count;
          
          // Escape values that might contain commas
          const escapeCsvValue = (value: string) => {
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          };
          
          return `${escapeCsvValue(name)},${escapeCsvValue(username)},${pin},${escapeCsvValue(email)},${escapeCsvValue(room)},${escapeCsvValue(yearGroup)},${averageGrade},${assessmentsCount},${pendingConcerns}`;
        })
      );
      
      const csvContent = csvHeader + csvRows.join('\n');
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const roomSuffix = selectedRoomId === 'all' ? 'all_rooms' : `room_${selectedRoomId}`;
      const filename = `students_overview_${roomSuffix}_${date}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Error downloading CSV:', err);
      setError('Failed to download student data as CSV');
    } finally {
      setDownloadingCSV(false);
    }
  };

  if (loading) {
    return <FullPageLoader message="Loading students overview..." variant="dots" />;
  }

  return (
    <PageWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Container>
        <Header>
          <Title>Students Overview</Title>
          {data && data.students.length > 0 && (
            <ModernButton
              onClick={downloadCSV}
              variant="primary"
              size="small"
              disabled={downloadingCSV}
            >
              {downloadingCSV ? (
                <>
                  <LoadingSpinner size="small" /> Downloading...
                </>
              ) : (
                'Download CSV'
              )}
            </ModernButton>
          )}
        </Header>

        {error && (
          <Alert variant="error" style={{ marginBottom: '24px' }}>
            {error}
            <ModernButton size="small" onClick={fetchData} style={{ marginLeft: '10px' }}>
              Retry
            </ModernButton>
          </Alert>
        )}

        {data && (
          <>
            <StatsRow>
              <StatCard>
                <div className="value">{totalStudents}</div>
                <div className="label">Total Students</div>
              </StatCard>
              <StatCard>
                <div className="value">{totalAssessments}</div>
                <div className="label">Total Assessments</div>
              </StatCard>
              <StatCard>
                <div className="value">{averageGrade > 0 ? `${Math.round(averageGrade)}%` : 'N/A'}</div>
                <div className="label">Average Grade</div>
              </StatCard>
              <StatCard>
                <div className="value">{data.rooms.length}</div>
                <div className="label">Active Rooms</div>
              </StatCard>
              {totalPendingConcerns > 0 && (
                <StatCard style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <div className="value" style={{ color: '#DC2626' }}>{totalPendingConcerns}</div>
                  <div className="label">Pending Concerns</div>
                </StatCard>
              )}
            </StatsRow>

            <FilterSection>
              <FilterLabel htmlFor="room-filter">Filter by Room:</FilterLabel>
              <Select
                id="room-filter"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                <option value="all">All Rooms</option>
                {data.rooms.map(room => (
                  <option key={room.room_id} value={room.room_id}>
                    {room.room_name} ({room.student_count} students)
                  </option>
                ))}
              </Select>
            </FilterSection>

            {filteredStudents.length === 0 ? (
              <EmptyState>
                <h3>No Students Found</h3>
                <p>
                  {selectedRoomId === 'all' 
                    ? 'No students have joined your rooms yet.' 
                    : 'No students found in the selected room.'
                  }
                </p>
              </EmptyState>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <thead>
                      <tr>
                        <TableHeader>Student</TableHeader>
                        <TableHeader>Year Group</TableHeader>
                        <TableHeader>Safety Concerns</TableHeader>
                        <TableHeader>Assessments</TableHeader>
                        <TableHeader>Average Grade</TableHeader>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={`${student.user_id}-${student.room_id}`}>
                          <TableCell>
                            <StudentName onClick={() => handleStudentClick(student.user_id, student.room_id)}>
                              {student.full_name}
                            </StudentName>
                            <RoomName>{student.room_name}</RoomName>
                          </TableCell>
                          <TableCell>
                            {student.year_group ? (
                              <YearGroup>{student.year_group}</YearGroup>
                            ) : (
                              <span style={{ color: '#999', fontSize: '0.875rem' }}>Not set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.safety_concerns.length > 0 ? (
                              <ConcernsSection>
                                {student.pending_concerns_count > 0 && (
                                  <ConcernIndicator
                                    $level={getHighestConcernLevel(student.safety_concerns.filter(c => c.status === 'pending'))}
                                    $isPending={true}
                                    onClick={() => handleConcernClick(student.safety_concerns.find(c => c.status === 'pending')?.flag_id || '')}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    title="View pending safety concerns"
                                  >
                                    <span className="icon">⚠️</span>
                                    {student.pending_concerns_count} Pending
                                  </ConcernIndicator>
                                )}
                                {student.safety_concerns.filter(c => c.status !== 'pending').length > 0 && (
                                  <span style={{ color: '#999', fontSize: '0.75rem' }}>
                                    {student.safety_concerns.filter(c => c.status !== 'pending').length} Resolved
                                  </span>
                                )}
                              </ConcernsSection>
                            ) : (
                              <span style={{ color: '#999' }}>No concerns</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.assessments.length > 0 ? (
                              <AssessmentGrid>
                                {student.assessments.map((assessment) => (
                                  <AssessmentChip
                                    key={assessment.assessment_id}
                                    $grade={assessment.teacher_override_grade || assessment.ai_grade_raw}
                                    onClick={() => handleAssessmentClick(assessment.assessment_id)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    title={`${assessment.chatbot_name} - ${formatDate(assessment.assessed_at)}`}
                                  >
                                    <div className="grade">{formatGrade(assessment)}</div>
                                    <div className="date">{formatDate(assessment.assessed_at)}</div>
                                  </AssessmentChip>
                                ))}
                              </AssessmentGrid>
                            ) : (
                              <span style={{ color: '#999' }}>No assessments</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.average_grade !== null ? (
                              <AverageGrade>{Math.round(student.average_grade)}%</AverageGrade>
                            ) : (
                              <span style={{ color: '#999' }}>N/A</span>
                            )}
                          </TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableContainer>

                <MobileList>
                  {filteredStudents.map((student) => (
                    <MobileCard key={`${student.user_id}-${student.room_id}`}>
                      <MobileHeader>
                        <MobileStudentInfo>
                          <button 
                            className="name"
                            onClick={() => handleStudentClick(student.user_id, student.room_id)}
                          >
                            {student.full_name}
                          </button>
                          <div className="room">{student.room_name}</div>
                          {student.year_group && (
                            <div className="year-group">{student.year_group}</div>
                          )}
                        </MobileStudentInfo>
                        {student.average_grade !== null && (
                          <AverageGrade>{Math.round(student.average_grade)}%</AverageGrade>
                        )}
                      </MobileHeader>

                      {student.safety_concerns.length > 0 && (
                        <ConcernsSection style={{ marginTop: '12px', marginBottom: '12px' }}>
                          {student.pending_concerns_count > 0 && (
                            <ConcernIndicator
                              $level={getHighestConcernLevel(student.safety_concerns.filter(c => c.status === 'pending'))}
                              $isPending={true}
                              onClick={() => handleConcernClick(student.safety_concerns.find(c => c.status === 'pending')?.flag_id || '')}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              title="View pending safety concerns"
                            >
                              <span className="icon">⚠️</span>
                              {student.pending_concerns_count} Pending
                            </ConcernIndicator>
                          )}
                          {student.safety_concerns.filter(c => c.status !== 'pending').length > 0 && (
                            <span style={{ color: '#999', fontSize: '0.75rem' }}>
                              {student.safety_concerns.filter(c => c.status !== 'pending').length} Resolved
                            </span>
                          )}
                        </ConcernsSection>
                      )}

                      <MobileAssessments>
                        <div className="label">Assessments ({student.assessments.length})</div>
                        {student.assessments.length > 0 ? (
                          <AssessmentGrid>
                            {student.assessments.map((assessment) => (
                              <AssessmentChip
                                key={assessment.assessment_id}
                                $grade={assessment.teacher_override_grade || assessment.ai_grade_raw}
                                onClick={() => handleAssessmentClick(assessment.assessment_id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title={`${assessment.chatbot_name} - ${formatDate(assessment.assessed_at)}`}
                              >
                                <div className="grade">{formatGrade(assessment)}</div>
                                <div className="date">{formatDate(assessment.assessed_at)}</div>
                              </AssessmentChip>
                            ))}
                          </AssessmentGrid>
                        ) : (
                          <span style={{ color: '#999' }}>No assessments yet</span>
                        )}
                      </MobileAssessments>
                    </MobileCard>
                  ))}
                </MobileList>
              </>
            )}
          </>
        )}
      </Container>
    </PageWrapper>
  );
}