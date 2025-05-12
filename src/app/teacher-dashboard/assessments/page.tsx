// src/app/teacher-dashboard/assessments/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation'; // For linking to detail page
import {
    Container, Card, Button, Alert, Badge,
    Select as StyledSelect
} from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
// Import types from your database.types.ts
import type { AssessmentListSummary, PaginatedAssessmentsResponse, AssessmentStatusEnum } from '@/types/database.types';

// Styled Components for this page
const PageWrapper = styled(Container)` // Use Container as base
  padding-top: ${({ theme }) => theme.spacing.xl};
  padding-bottom: ${({ theme }) => theme.spacing.xl};
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
`;



const PageTitle = styled.h1`
  font-size: 1.8rem;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const FilterControls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
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

const EmptyStateCard = styled(Card)`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
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
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <LoadingSpinner size="large" />
          <p>Loading assessments...</p>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Student Assessments</PageTitle>
        {/* Add a button to create new assessment type or similar if needed in future */}
      </PageHeader>

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
        <Card> {/* Wrap table in a card for consistent styling */}
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Room</th>
                  <th>Assessment Bot</th>
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
                      <Button size="small" onClick={() => handleViewDetails(asmnt.assessment_id)}>
                        Review Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        </Card>
      ) : null}

      {pagination.totalPages > 1 && (
        <PaginationControls>
          <Button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 0 || loading}
            variant="outline"
          >
            Previous
          </Button>
          <span>
            Page {pagination.currentPage + 1} of {pagination.totalPages}
          </span>
          <Button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage >= pagination.totalPages - 1 || loading}
            variant="outline"
          >
            Next
          </Button>
        </PaginationControls>
      )}
    </PageWrapper>
  );
}