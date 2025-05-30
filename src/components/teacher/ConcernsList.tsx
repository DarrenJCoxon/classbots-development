// src/components/teacher/ConcernsList.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { ModernButton } from '@/components/shared/ModernButton';
import { Card, CardBody, Section, Stack, Flex, Text, Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell, Badge } from '@/components/ui';;
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ConcernStatus, FlaggedMessage } from '@/types/database.types';

// Custom styled components for specific needs
const FilterSection = styled(Section)`
  padding: 20px;
  margin-bottom: 24px;
`;

const StyledSelect = styled.select`
  padding: 10px 16px;
  border: 1px solid rgba(254, 67, 114, 0.2);
  border-radius: 8px;
  background: white;
  font-size: 14px;
  font-family: ${({ theme }) => theme.fonts.body};
  transition: all 0.2s ease;
  
  &:hover {
    border-color: rgba(254, 67, 114, 0.4);
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.pink};
    box-shadow: 0 0 0 3px rgba(254, 67, 114, 0.1);
  }
`;

const MessagePreview = styled.div`
  max-width: 200px; 
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.textLight};
  font-style: italic;
`;

interface ConcernBadgeProps {
  $level: number; 
}

const ConcernBadge = styled(Badge)<ConcernBadgeProps>`
  background: ${({ theme, $level }) => {
    if ($level >= 4) return theme.colors.red + '20'; 
    if ($level >= 3) return theme.colors.secondary + '20';
    return theme.colors.blue + '20'; 
  }};

  color: ${({ theme, $level }) => {
    if ($level >= 4) return theme.colors.red;
    if ($level >= 3) return theme.colors.secondaryDark; 
    return theme.colors.blue;
  }};
  font-weight: 500;
`;

const LoadingContainer = styled(Card)`
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmptyStateContainer = styled(Card)`
  text-align: center;
  padding: 60px;
`;

const PaginationContainer = styled(Flex)`
  margin-top: 32px;
`;

interface ConcernDetails extends FlaggedMessage {
  student_name: string | null;
  room_name: string | null;
  message_content: string | null;
}

function getConcernTypeText(type: string): string {
  if (!type) return 'Unknown';
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getConcernLevelText(level: number): string {
  if (level >= 5) return 'Critical';
  if (level >= 4) return 'High';
  if (level >= 3) return 'Significant';
  if (level >= 2) return 'Moderate';
  if (level >= 1) return 'Minor';
  return 'Low';
}

function getStatusText(status: ConcernStatus): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'reviewing': return 'Reviewing';
    case 'resolved': return 'Resolved';
    case 'false_positive': return 'False Positive';
    default: return status || 'Unknown';
  }
}

const getStatusVariant = (status: ConcernStatus): 'danger' | 'warning' | 'success' | 'default' => {
  switch (status) {
    case 'pending': return 'danger';
    case 'reviewing': return 'warning';
    case 'resolved': return 'success';
    case 'false_positive': return 'default';
    default: return 'default';
  }
};

interface ConcernsListProps {
  limit?: number; 
  accentColor?: string;
}

export default function ConcernsList({ limit, accentColor }: ConcernsListProps) {
  const [concerns, setConcerns] = useState<ConcernDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending'); 
  const [pagination, setPagination] = useState({ currentPage: 0, hasMore: false, totalCount: 0 });
  const router = useRouter();

  const fetchConcerns = useCallback(async (page = 0, filter = statusFilter, isNewFilter = false) => {
    setLoading(true); 
    if (isNewFilter) {
      setConcerns([]); 
      setPagination(prev => ({ ...prev, currentPage: 0, hasMore: false })); 
    }
    setError(null);

    try {
      const itemsPerPage = limit || 10; 
      const url = new URL('/api/teacher/concerns', window.location.origin);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', itemsPerPage.toString());
      if (filter) {
        url.searchParams.append('status', filter);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch concerns (status: ${response.status})`);
      }

      const data = await response.json();
      setConcerns(prev => (page > 0 && !isNewFilter) ? [...prev, ...(data.concerns || [])] : (data.concerns || []));
      setPagination({
        currentPage: data.pagination?.currentPage ?? 0,
        hasMore: data.pagination?.hasMore ?? false,
        totalCount: data.pagination?.totalCount ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading concerns');
      setConcerns([]); 
      setPagination({ currentPage: 0, hasMore: false, totalCount: 0 }); 
    } finally {
      setLoading(false);
    }
  }, [limit, statusFilter]); 

  useEffect(() => {
    fetchConcerns(0, statusFilter, true); 
  }, [fetchConcerns, statusFilter]); 

  const handleViewConversation = (concern: ConcernDetails) => {
    router.push(`/teacher-dashboard/concerns/${concern.flag_id}`);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFilter = e.target.value;
    setStatusFilter(newFilter);
  };

  const handleLoadMore = () => {
    if (!loading && pagination.hasMore) {
      fetchConcerns(pagination.currentPage + 1, statusFilter, false); 
    }
  };

  const renderContent = () => {
    if (loading && concerns.length === 0) { 
      return (
        <LoadingContainer variant="minimal">
          <CardBody>
            <Flex align="center" justify="center" gap="md">
              <LoadingSpinner />
              <Text color="light">Loading concerns...</Text>
            </Flex>
          </CardBody>
        </LoadingContainer>
      );
    }

    if (error) {
      return (
        <Card variant="minimal">
          <CardBody>
            <Text color="danger" align="center">{error}</Text>
          </CardBody>
        </Card>
      );
    }

    if (concerns.length === 0) {
      return (
        <EmptyStateContainer variant="minimal">
          <CardBody>
            <Text color="light" align="center">
              No concerns {statusFilter ? `with status "${getStatusText(statusFilter as ConcernStatus)}"` : ''} found.
            </Text>
          </CardBody>
        </EmptyStateContainer>
      );
    }

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Student</TableHeaderCell>
              <TableHeaderCell>Room</TableHeaderCell>
              <TableHeaderCell>Concern Type</TableHeaderCell>
              <TableHeaderCell>Level</TableHeaderCell>
              <TableHeaderCell>Message Preview</TableHeaderCell>
              <TableHeaderCell>Date Flagged</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {concerns.map((concern) => (
              <TableRow key={concern.flag_id}>
                <TableCell>{concern.student_name || 'N/A'}</TableCell>
                <TableCell>{concern.room_name || 'N/A'}</TableCell>
                <TableCell>{getConcernTypeText(concern.concern_type)}</TableCell>
                <TableCell>
                  <ConcernBadge $level={concern.concern_level}>
                    {getConcernLevelText(concern.concern_level)} ({concern.concern_level})
                  </ConcernBadge>
                </TableCell>
                <TableCell>
                  <MessagePreview title={concern.message_content || ''}>
                    {concern.message_content || '[N/A]'}
                  </MessagePreview>
                </TableCell>
                <TableCell>
                  {new Date(concern.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge $variant={getStatusVariant(concern.status)}>
                    {getStatusText(concern.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ModernButton                     size="small"
                    variant="primary"
                    onClick={() => handleViewConversation(concern)}
                  >
                    Review
                  </ModernButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!limit && pagination.hasMore && ( 
          <PaginationContainer justify="center" align="center">
            <ModernButton onClick={handleLoadMore} variant="ghost" disabled={loading}>
              {loading ? 'Loading...' : 'Load More Concerns'}
            </ModernButton>
          </PaginationContainer>
        )}
      </>
    );
  };

  return (
    <Stack spacing="lg">
      {!limit && (
        <FilterSection>
          <Flex gap="md" align="center" wrap>
            <label htmlFor="status-filter">Filter by status:</label>
            <StyledSelect 
              id="status-filter"
              value={statusFilter}
              onChange={handleFilterChange}
              disabled={loading}
            >
              <option value="pending">Pending</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
              <option value="">All</option>
            </StyledSelect>
            {!loading && <Text color="light">Total Found: {pagination.totalCount}</Text>}
          </Flex>
        </FilterSection>
      )}
      {renderContent()}
    </Stack>
  );
}