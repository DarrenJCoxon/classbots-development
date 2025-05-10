// src/components/teacher/ConcernsList.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { Card, Alert, Button, Badge, Select as StyledSelect } from '@/styles/StyledComponents'; // Import Select
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Import LoadingSpinner
import type { ConcernStatus, FlaggedMessage } from '@/types/database.types'; // Import base types

// --- Styled Components ---
const ListContainer = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h2` // Changed from h3 for better hierarchy potentially
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
  min-width: 800px; /* Ensure enough space for columns */
  border-collapse: collapse;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    /* Hide table on mobile/tablet if using mobile list */
    /* display: none; */
    /* OR, make it the primary view if MobileList isn't implemented fully */
  }
`;

const TableHeader = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md}; /* Slightly less padding */
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
  max-width: 200px; /* Limit width */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.textLight};
  font-style: italic;
`;

// Interface for props passed to ConcernBadge
interface ConcernBadgeProps {
  $level: number; // Use transient prop syntax ($)
}

const ConcernBadge = styled(Badge)<ConcernBadgeProps>`
  background: ${({ theme, $level }) => {
    if ($level >= 4) return theme.colors.red + '20'; // Use alpha hex
    if ($level >= 3) return theme.colors.secondary + '20';
    return theme.colors.blue + '20'; // Use blue for moderate/minor
  }};

  color: ${({ theme, $level }) => {
    if ($level >= 4) return theme.colors.red;
    if ($level >= 3) return theme.colors.secondaryDark; // Use darker secondary for contrast
    return theme.colors.blue;
  }};
  font-weight: 500;
`;

// Interface for props passed to StatusBadge
interface StatusBadgeProps {
  $status: ConcernStatus; // Use transient prop syntax ($)
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
  min-height: 100px; /* Give it some height */
`;

const PaginationControls = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: ${({ theme }) => theme.spacing.lg};
    gap: ${({ theme }) => theme.spacing.md};
`;

// --- Data Interface (Matching API Response) ---
interface ConcernDetails extends FlaggedMessage {
    student_name: string | null;
    room_name: string | null;
    message_content: string | null;
}

// --- Helper Functions ---
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
// -----------------------

interface ConcernsListProps {
  limit?: number; // Optional limit for dashboard preview
}

export default function ConcernsList({ limit }: ConcernsListProps) {
    const [concerns, setConcerns] = useState<ConcernDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('pending'); // Default to pending
    const [pagination, setPagination] = useState({ currentPage: 0, hasMore: false, totalCount: 0 });
    const router = useRouter();

    const fetchConcerns = useCallback(async (page = 0, filter = statusFilter, isNewFilter = false) => {
        setLoading(true); // Show loading indicator on fetch
        if (isNewFilter) {
             setConcerns([]); // Clear existing concerns when filter changes
             setPagination(prev => ({ ...prev, currentPage: 0, hasMore: false })); // Reset pagination
        }
        setError(null);

        try {
            const itemsPerPage = limit || 10; // Use prop limit or default to 10 for full view
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
            // Append if loading more, replace if it's a new filter or first page
            setConcerns(prev => (page > 0 && !isNewFilter) ? [...prev, ...(data.concerns || [])] : (data.concerns || []));
            setPagination({
                 currentPage: data.pagination?.currentPage ?? 0,
                 hasMore: data.pagination?.hasMore ?? false,
                 totalCount: data.pagination?.totalCount ?? 0,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading concerns');
            setConcerns([]); // Clear concerns on error
            setPagination({ currentPage: 0, hasMore: false, totalCount: 0 }); // Reset pagination on error
        } finally {
            setLoading(false);
        }
    }, [limit, statusFilter]); // statusFilter is now a dependency

    useEffect(() => {
        // Initial fetch when component mounts
        fetchConcerns(0, statusFilter, true); // isNewFilter = true on initial load
    }, [fetchConcerns, statusFilter]); // Fetch when filter changes


    const handleViewConversation = (concern: ConcernDetails) => {
        router.push(`/teacher-dashboard/concerns/${concern.flag_id}`);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newFilter = e.target.value;
        setStatusFilter(newFilter);
        // Fetch will be triggered by useEffect dependency change
    };

    const handleLoadMore = () => {
        if (!loading && pagination.hasMore) {
            fetchConcerns(pagination.currentPage + 1, statusFilter, false); // isNewFilter = false
        }
    };

    // Render Logic
    const renderContent = () => {
        if (loading && concerns.length === 0) { // Show loading only on initial load
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

                {/* Add Mobile List View Here if needed */}
                {/*
                <MobileList>
                   ... Mobile card rendering ...
                </MobileList>
                */}

                {!limit && pagination.hasMore && ( // Only show load more if not limited by prop
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
        <ListContainer>
            {/* Render Title and Filters only if not limited (i.e., it's the full list view) */}
            {!limit && (
                <>
                    <Title>Student Welfare Concerns</Title>
                    <FilterControls>
                        <label htmlFor="status-filter">Filter by status:</label>
                        <StyledSelect // Use the imported styled Select
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
            {/* Render the main content (table/loading/empty/error) */}
            {renderContent()}
        </ListContainer>
    );
}