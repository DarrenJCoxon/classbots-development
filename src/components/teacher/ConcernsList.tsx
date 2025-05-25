// src/components/teacher/ConcernsList.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { Alert, Badge } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ConcernStatus, FlaggedMessage } from '@/types/database.types';

// --- Styled Components ---
const ListContainer = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(254, 67, 114, 0.1);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
`;

// Title removed as it's now at the page level

const FilterControls = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(254, 67, 114, 0.08);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
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
  padding: 60px;
  color: ${({ theme }) => theme.colors.textLight};
  
  h3 {
    font-size: 24px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: 12px;
  }
  
  p {
    font-size: 16px;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px;
  color: ${({ theme }) => theme.colors.textLight};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 200px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(254, 67, 114, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
`;

const PaginationControls = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 32px;
    gap: 16px;
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
                                        <ModernButton
                                            size="small"
                                            onClick={() => handleViewConversation(concern)}
                                        >
                                            Review
                                        </ModernButton>
                                    </TableCell>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </TableContainer>

                {!limit && pagination.hasMore && ( 
                 <PaginationControls>
                     <ModernButton onClick={handleLoadMore} variant="ghost" disabled={loading}>
                         {loading ? 'Loading...' : 'Load More Concerns'}
                     </ModernButton>
                 </PaginationControls>
                )}
            </>
        );
    };

    return (
        <ListContainer>
            {!limit && (
                <>
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