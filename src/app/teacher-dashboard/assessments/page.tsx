// src/app/teacher-dashboard/assessments/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { ModernButton } from '@/components/shared/ModernButton';
import { useRouter } from 'next/navigation'; // For linking to detail page
import { Card, Alert, Badge } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
// Import types from your database.types.ts
import type { AssessmentListSummary, PaginatedAssessmentsResponse, AssessmentStatusEnum } from '@/types/database.types';

// Styled Components for this page
const PageWrapper = styled.div`
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

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 24px;
  position: relative;
  z-index: 1;
`;

const Header = styled.div`
  margin-bottom: 40px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 36px;
  font-weight: 800;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.secondary}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const FilterControls = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: center;
  flex-wrap: wrap;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: stretch;
    gap: ${({ theme }) => theme.spacing.sm};
  }
  
  label {
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text};
    flex-shrink: 0;
  }
`;

const StyledSelect = styled.select`
  padding: 10px 16px;
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 8px;
  background: white;
  font-size: 14px;
  font-family: ${({ theme }) => theme.fonts.body};
  transition: all 0.2s ease;
  flex: 1;
  min-width: 0;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
  
  &:hover {
    border-color: rgba(152, 93, 215, 0.4);
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(152, 93, 215, 0.1);
  }
`;

const ModernCard = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
  overflow: hidden;
`;

const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto; /* Enable horizontal scrolling on smaller viewports */
`;

const Table = styled.table`
  width: 100%;
  min-width: 800px; /* Ensure table has a minimum width */
  border-collapse: collapse;
  
  th, td {
    padding: ${({ theme }) => theme.spacing.md};
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    white-space: nowrap; /* Prevent text wrapping in cells initially */
  }

  th {
    color: ${({ theme }) => theme.colors.textLight};
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
  }

  td {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.text};
  }

  td.actions {
    white-space: nowrap;
    width: 1%; /* Allow this column to be just wide enough for content */
  }
  
  .truncate {
    max-width: 150px; /* Adjust as needed */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const EmptyStateCard = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  padding: 60px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
  text-align: center;
  
  h3 {
    font-size: 24px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: 12px;
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 16px;
  }
`;

// Helper to get display text for status
const getStatusText = (status?: AssessmentStatusEnum): string => {
    if (!status) return 'N/A';
    switch (status) {
        case 'ai_processing': return 'AI Processing';
        case 'ai_completed': return 'AI Completed (Ready for Review)';
        case 'teacher_reviewed': return 'Teacher Reviewed';
        default: return status;
    }
};
const getStatusBadgeVariant = (status?: AssessmentStatusEnum): 'success' | 'warning' | 'error' | 'default' => {
    if (!status) return 'default';
    switch (status) {
        case 'ai_processing': return 'default';
        case 'ai_completed': return 'warning'; // Yellow/Orange indicating action needed
        case 'teacher_reviewed': return 'success';
        default: return 'default';
    }
};


export default function AssessmentsListPage() {
  const [assessments, setAssessments] = useState<AssessmentListSummary[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 0,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AssessmentStatusEnum | ''>(''); // Empty string for 'all'

  const router = useRouter();

  const fetchAssessments = useCallback(async (pageToFetch: number, currentStatusFilter: AssessmentStatusEnum | '') => {
    setLoading(true);
    setError(null);
    console.log(`[AssessmentsPage] Fetching assessments. Page: ${pageToFetch}, Status: ${currentStatusFilter || 'all'}`);

    try {
      const queryParams = new URLSearchParams({
        page: pageToFetch.toString(),
        limit: pagination.pageSize.toString(),
      });
      if (currentStatusFilter) {
        queryParams.append('status', currentStatusFilter);
      }

      const response = await fetch(`/api/teacher/assessments?${queryParams.toString()}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch assessments (status ${response.status})`);
      }
      const data: PaginatedAssessmentsResponse = await response.json();
      setAssessments(data.assessments || []);
      setPagination(data.pagination || { currentPage: 0, pageSize: 10, totalCount: 0, totalPages: 0 });
    } catch (err) {
      console.error("Error fetching assessments:", err);
      setError(err instanceof Error ? err.message : 'Could not load assessments.');
      setAssessments([]); // Clear on error
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize]); // pageSize can be a dependency if you allow changing it

  useEffect(() => {
    fetchAssessments(0, statusFilter); // Fetch initial page on mount or when filter changes
  }, [statusFilter, fetchAssessments]); // fetchAssessments is stable due to useCallback

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < pagination.totalPages) {
      fetchAssessments(newPage, statusFilter);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as AssessmentStatusEnum | '');
    // useEffect will trigger refetch due to statusFilter change
  };

  const handleViewDetails = (assessmentId: string) => {
    router.push(`/teacher-dashboard/assessments/${assessmentId}`);
  };

  if (loading && assessments.length === 0) { // Show full page loader only on initial load
    return (
      <PageWrapper>
        <Container>
          <EmptyStateCard>
            <LoadingSpinner size="large" />
            <p style={{ marginTop: '16px' }}>Loading assessments...</p>
          </EmptyStateCard>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Container>
        <Header>
          <Title>Student Assessments</Title>
        </Header>

      <FilterControls>
        <label htmlFor="statusFilter">Filter by Status:</label>
        <StyledSelect id="statusFilter" value={statusFilter} onChange={handleFilterChange} disabled={loading}>
          <option value="">All Statuses</option>
          <option value="ai_processing">AI Processing</option>
          <option value="ai_completed">AI Completed (Ready for Review)</option>
          <option value="teacher_reviewed">Teacher Reviewed</option>
        </StyledSelect>
      </FilterControls>

      {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
      
      {loading && assessments.length > 0 && <Alert variant='info' style={{textAlign:'center'}}>Loading more...</Alert>} {/* Subtle loading more indicator */}


      {!loading && assessments.length === 0 && !error ? (
        <EmptyStateCard>
          <h3>No Assessments Found</h3>
          <p>There are no assessments matching your current filters, or no assessments have been processed yet.</p>
        </EmptyStateCard>
      ) : assessments.length > 0 ? (
        <ModernCard>
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Room</th>
                  <th>Assessment Skolr</th>
                  <th>AI Grade</th>
                  <th>Teacher Grade</th>
                  <th>Status</th>
                  <th>Date Assessed</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((asmnt) => (
                  <tr key={asmnt.assessment_id}>
                    <td className="truncate" title={asmnt.student_name || undefined}>{asmnt.student_name || 'N/A'}</td>
                    <td className="truncate" title={asmnt.room_name || undefined}>{asmnt.room_name || 'N/A'}</td>
                    <td className="truncate" title={asmnt.chatbot_name || undefined}>{asmnt.chatbot_name || 'N/A'}</td>
                    <td>{asmnt.ai_grade_raw || '-'}</td>
                    <td>{asmnt.teacher_override_grade || '-'}</td>
                    <td>
                      <Badge variant={getStatusBadgeVariant(asmnt.status)}>
                        {getStatusText(asmnt.status)}
                      </Badge>
                    </td>
                    <td>{new Date(asmnt.assessed_at).toLocaleDateString()}</td>
                    <td className="actions">
                      <ModernButton 
                        size="small" 
                        onClick={() => handleViewDetails(asmnt.assessment_id)}
                      >
                        Review Details
                      </ModernButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        </ModernCard>
      ) : null}

      {pagination.totalPages > 1 && (
        <PaginationControls>
          <ModernButton             onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 0 || loading}
            variant="ghost"
          >
            Previous
          </ModernButton>
          <span>
            Page {pagination.currentPage + 1} of {pagination.totalPages}
          </span>
          <ModernButton             onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage >= pagination.totalPages - 1 || loading}
            variant="ghost"
          >
            Next
          </ModernButton>
        </PaginationControls>
      )}
      </Container>
    </PageWrapper>
  );
}