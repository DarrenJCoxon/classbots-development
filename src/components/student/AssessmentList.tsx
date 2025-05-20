'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { Card, Badge, Button } from '@/styles/StyledComponents';
import type { AssessmentStatusEnum } from '@/types/database.types';

// Interface for assessment summary data displayed in the list
export interface AssessmentSummary {
  assessment_id: string;
  room_id: string;
  room_name: string | null;
  chatbot_id: string;
  chatbot_name: string | null;
  ai_grade_raw: string | null;
  ai_feedback_student: string | null;
  assessed_at: string;
  status: AssessmentStatusEnum | null | undefined;
  teacher_override_grade?: string | null;
  teacher_override_notes?: string | null;
}

interface AssessmentListProps {
  assessments: AssessmentSummary[];
}

// Styled Components
const AssessmentSection = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const EmptyStateText = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => theme.spacing.lg} 0;
`;

const AssessmentGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
`;

const AssessmentCard = styled(Card)`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border};
  position: relative;
  overflow: hidden;
`;

const AssessmentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const AssessmentTitle = styled.h3`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.primary};
  margin: 0;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const AssessmentInfo = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  
  & > div {
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.textLight};
    
    strong {
      color: ${({ theme }) => theme.colors.text};
      margin-right: ${({ theme }) => theme.spacing.xs};
    }
  }
`;

const FeedbackPreview = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
`;

const StatusBadge = styled(Badge)`
  position: absolute;
  top: ${({ theme }) => theme.spacing.sm};
  right: ${({ theme }) => theme.spacing.sm};
`;

// Helper functions
const getStatusBadgeVariant = (status?: AssessmentStatusEnum | null): 'success' | 'warning' | 'error' | 'default' => {
  if (status === 'teacher_reviewed') return 'success';
  if (status === 'ai_completed') return 'default';
  if (status === 'ai_processing') return 'warning';
  return 'default';
};

const getStatusText = (status?: AssessmentStatusEnum | null): string => {
  if (status === 'ai_processing') return 'AI Processing';
  if (status === 'ai_completed') return 'AI Feedback Ready';
  if (status === 'teacher_reviewed') return 'Teacher Reviewed';
  return status ? String(status).replace(/_/g, ' ') : 'N/A';
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (e) {
    return dateString;
  }
};

// Additional styled components for list view
const FilterContainer = styled.div`
  display: flex;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const FilterLabel = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  margin-right: ${({ theme }) => theme.spacing.xs};
`;

const FilterSelect = styled.select`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background-color: white;
  min-width: 150px;
`;

const AssessmentTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  
  th {
    text-align: left;
    font-size: 0.9rem;
    padding: ${({ theme }) => theme.spacing.sm};
    border-bottom: 2px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.textLight};
    font-weight: 600;
  }
  
  td {
    padding: ${({ theme }) => theme.spacing.sm};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    vertical-align: middle;
  }
  
  tr:hover {
    background-color: ${({ theme }) => theme.colors.backgroundDark};
  }
`;

const StatusIndicator = styled.span<{ variant: 'success' | 'warning' | 'error' | 'default' }>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${({ theme, variant }) => 
    variant === 'success' ? theme.colors.green : 
    variant === 'warning' ? theme.colors.secondary :
    variant === 'error' ? theme.colors.red :
    theme.colors.primary};
  color: white;
`;

const TruncatedText = styled.div`
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ActionButton = styled(Button)`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  font-size: 0.9rem;
`;

// Main component
const AssessmentList: React.FC<AssessmentListProps> = ({ assessments }) => {
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [filteredAssessments, setFilteredAssessments] = useState(assessments);
  
  // Set up unique rooms for filter dropdown
  const uniqueRooms = useMemo(() => {
    const roomSet = new Set<string>();
    assessments.forEach(assessment => {
      if (assessment.room_name) {
        roomSet.add(assessment.room_name);
      }
    });
    return Array.from(roomSet);
  }, [assessments]);
  
  // Filter assessments when filter changes
  useEffect(() => {
    if (roomFilter === 'all') {
      setFilteredAssessments(assessments);
    } else {
      setFilteredAssessments(
        assessments.filter(assessment => assessment.room_name === roomFilter)
      );
    }
  }, [roomFilter, assessments]);
  
  // Debug indicator for dev mode
  const isDevMode = process.env.NODE_ENV !== 'production';
  
  if (!assessments || assessments.length === 0) {
    return (
      <AssessmentSection style={isDevMode ? { border: '1px dashed purple' } : {}}>
        <SectionTitle>
          My Assessments
        </SectionTitle>
        <EmptyStateText>
          You don&apos;t have any assessments yet. Complete assessment activities in your classrooms to see them here.
        </EmptyStateText>
      </AssessmentSection>
    );
  }

  return (
    <AssessmentSection>
      <SectionTitle>My Assessments</SectionTitle>
      
      <FilterContainer>
        <FilterLabel htmlFor="room-filter">Filter by room:</FilterLabel>
        <FilterSelect 
          id="room-filter"
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
        >
          <option value="all">All rooms</option>
          {uniqueRooms.map(room => (
            <option key={room} value={room}>{room}</option>
          ))}
        </FilterSelect>
        
        <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#666' }}>
          Showing {filteredAssessments.length} of {assessments.length} assessments
        </span>
      </FilterContainer>
      
      <AssessmentTable>
        <thead>
          <tr>
            <th>Assessment</th>
            <th>Room</th>
            <th>Date</th>
            <th>Grade</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAssessments.map((assessment) => (
            <tr key={assessment.assessment_id}>
              <td>
                <TruncatedText>
                  <strong>{assessment.chatbot_name || 'Assessment'}</strong>
                </TruncatedText>
              </td>
              <td>{assessment.room_name || 'N/A'}</td>
              <td>{formatDate(assessment.assessed_at)}</td>
              <td>
                <strong>
                  {assessment.teacher_override_grade || assessment.ai_grade_raw || 'Not graded'}
                </strong>
              </td>
              <td>
                <StatusIndicator variant={getStatusBadgeVariant(assessment.status)}>
                  {getStatusText(assessment.status)}
                </StatusIndicator>
              </td>
              <td>
                <ActionButton 
                  as={Link}
                  href={{
                    pathname: `/student/assessments/${assessment.assessment_id}`,
                    query: { 
                      direct: '1',
                      uid: typeof window !== 'undefined' ? 
                        localStorage.getItem('student_direct_access_id') || 
                        localStorage.getItem('current_student_id') || '' : ''
                    }
                  }}
                  variant="primary"
                >
                  View
                </ActionButton>
              </td>
            </tr>
          ))}
        </tbody>
      </AssessmentTable>
    </AssessmentSection>
  );
};

export default AssessmentList;