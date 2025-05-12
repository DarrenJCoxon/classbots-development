// src/components/teacher/ConcernsList.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { Card, Alert, Button, Badge, Select as StyledSelect } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ConcernStatus, FlaggedMessage } from '@/types/database.types';

// --- Styled Components ---
const ListContainer = styled(Card)` // This is the Card we want to pass the accent to
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  /* The $accentColor prop will be handled by the base Card component */
`;

const Title = styled.h2`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
`;

const FilterControls = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: center;
  flex-wrap: wrap;
`;

const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  min-width: 800px; 
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md}; 
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  vertical-align: bottom;
`;

const TableCell = styled.td`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem;
  vertical-align: top;
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

interface StatusBadgeProps {
  $status: ConcernStatus; 
}

const StatusBadge = styled(Badge)<StatusBadgeProps>`
   background: ${({ theme, $status }) => {
       switch ($status) {
           case 'resolved': return theme.colors.green + '20';
           case 'false_positive': return theme.colors.textMuted + '20';
           case 'reviewing': return theme.colors.secondary + '20';
           case 'pending': return theme.colors.red + '20';
           default: return theme.colors.backgroundDark;
       }
   }};
   color: ${({ theme, $status }) => {
        switch ($status) {
           case 'resolved': return theme.colors.green;
           case 'false_positive': return theme.colors.textMuted;
           case 'reviewing': return theme.colors.secondaryDark;
           case 'pending': return theme.colors.red;
           default: return theme.colors.textLight;
       }
   }};
   font-weight: 500;
`;


const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.textLight};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
  min-height: 100px; 
`;

const PaginationControls = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: ${({ theme }) => theme.spacing.lg};
    gap: ${({ theme }) => theme.spacing.md};
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

// --- MODIFIED Props Interface ---
interface ConcernsListProps {
  limit?: number; 
  accentColor?: string; // Added optional accentColor prop
}

// --- MODIFIED Component Signature to accept accentColor ---
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
            return <LoadingState><LoadingSpinner /> Loading concerns...</LoadingState>;
        }

        if (error) {
            return <Alert variant="error">{error}</Alert>;
        }

        if (concerns.length === 0) {
            return (
            <EmptyState>
                <p>No concerns {statusFilter ? `with status "${getStatusText(statusFilter as ConcernStatus)}"` : ''} found.</p>
            </EmptyState>
            );
        }

        return (
            <>
                <TableContainer>
                    <Table>
                        <thead>
                            <tr>
                                <TableHeader>Student</TableHeader>
                                <TableHeader>Room</TableHeader>
                                <TableHeader>Concern Type</TableHeader>
                                <TableHeader>Level</TableHeader>
                                <TableHeader>Message Preview</TableHeader>
                                <TableHeader>Date Flagged</TableHeader>
                                <TableHeader>Status</TableHeader>
                                <TableHeader>Actions</TableHeader>
                            </tr>
                        </thead>
                        <tbody>
                            {concerns.map((concern) => (
                                <tr key={concern.flag_id}>
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
                                        <StatusBadge $status={concern.status}>
                                            {getStatusText(concern.status)}
                                        </StatusBadge>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="small"
                                            onClick={() => handleViewConversation(concern)}
                                        >
                                            Review
                                        </Button>
                                    </TableCell>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </TableContainer>

                {!limit && pagination.hasMore && ( 
                 <PaginationControls>
                     <Button onClick={handleLoadMore} variant="outline" disabled={loading}>
                         {loading ? 'Loading...' : 'Load More Concerns'}
                     </Button>
                 </PaginationControls>
                )}
            </>
        );
    };

    return (
        <ListContainer $accentColor={accentColor} $accentSide="top"> {/* MODIFIED: Passed props to Card */}
            {!limit && (
                <>
                    <Title>Student Welfare Concerns</Title>
                    <FilterControls>
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
                        {!loading && <span>Total Found: {pagination.totalCount}</span>}
                    </FilterControls>
                 </>
            )}
            {renderContent()}
        </ListContainer>
    );
}