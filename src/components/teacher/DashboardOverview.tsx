// src/components/teacher/DashboardOverview.tsx
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import StatsCard from './StatsCard'; // Assuming this is correctly imported
import { Button, Alert, Card } from '@/styles/StyledComponents'; // Added Card for structure
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // For loading state
import RoomForm from '@/components/teacher/RoomForm'; // For the "Create New Room" modal
import type { Chatbot } from '@/types/database.types'; // For fetching chatbots to pass to RoomForm

const OverviewWrapper = styled.div`
  /* Add any specific wrapper styles if needed */
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Section = styled(Card)` // Use Card as base for sections for consistent styling
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const QuickActionsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    button {
      width: 100%;
    }
  }
`;

interface DashboardStats {
  totalChatbots: number;
  totalRooms: number;
  activeRooms: number;
  pendingConcerns: number;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [showRoomForm, setShowRoomForm] = useState(false); // For "Create New Room" modal
  const [availableChatbots, setAvailableChatbots] = useState<Chatbot[]>([]); // For RoomForm
  const [loadingChatbots, setLoadingChatbots] = useState(false); // For fetching chatbots

  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingStats(true);
      setStatsError(null);
      setLoadingChatbots(true); // Also set loading for chatbots

      try {
        // Fetch stats and chatbots concurrently
        const [statsResponse, chatbotsResponse] = await Promise.all([
          fetch('/api/teacher/dashboard-stats'),
          fetch('/api/teacher/chatbots') // Fetch all chatbots for the RoomForm
        ]);

        if (!statsResponse.ok) {
          const errorData = await statsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch stats (status ${statsResponse.status})`);
        }
        const statsData: DashboardStats = await statsResponse.json();
        setStats(statsData);

        if (!chatbotsResponse.ok) {
          const errorData = await chatbotsResponse.json().catch(() => ({}));
          // Don't throw an error that stops stats from loading, just log and set empty array
          console.error(errorData.error || `Failed to fetch chatbots (status ${chatbotsResponse.status})`);
          setStatsError(prev => prev ? `${prev}\nFailed to load chatbots for Room Creation.` : 'Failed to load chatbots for Room Creation.');
          setAvailableChatbots([]);
        } else {
          const chatbotsData: Chatbot[] = await chatbotsResponse.json();
          setAvailableChatbots(chatbotsData);
        }

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        const errorMessage = err instanceof Error ? err.message : 'Could not load dashboard overview.';
        setStatsError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage);
      } finally {
        setLoadingStats(false);
        setLoadingChatbots(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleCreateNewChatbot = () => {
    router.push('/teacher-dashboard/chatbots/new/edit'); // Navigate to unified page
  };

  const handleRoomCreated = () => {
    setShowRoomForm(false);
    // Optionally, re-fetch stats or navigate, but for now, just close modal
    // Consider a toast message for success
    alert("Room created successfully!");
    // Re-fetch stats to update room counts
     const fetchStatsOnly = async () => {
        setLoadingStats(true);
        try {
            const response = await fetch('/api/teacher/dashboard-stats');
            if (!response.ok) throw new Error('Failed to refresh stats');
            const data: DashboardStats = await response.json();
            setStats(data);
        } catch (e) { console.error("Failed to refresh stats after room creation", e); }
        finally { setLoadingStats(false); }
    };
    fetchStatsOnly();
  };


  if (loadingStats) { // Main loading indicator for stats
    return (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
            <LoadingSpinner size="large" />
            <p style={{marginTop: '16px'}}>Loading dashboard overview...</p>
        </Card>
    );
  }


  return (
    <OverviewWrapper>
      {statsError && <Alert variant="error" style={{ marginBottom: '16px' }}>{statsError}</Alert>}

      {stats && (
        <StatsGrid>
          <StatsCard
            title="Pending Concerns"
            value={stats.pendingConcerns}
            onClick={() => router.push('/teacher-dashboard/concerns')}
            variant={stats.pendingConcerns > 0 ? 'danger' : 'default'}
          />
          <StatsCard
            title="Active Rooms"
            value={stats.activeRooms}
            onClick={() => router.push('/teacher-dashboard/rooms')}
          />
          <StatsCard
            title="My Chatbots"
            value={stats.totalChatbots}
            onClick={() => router.push('/teacher-dashboard/chatbots')}
          />
          <StatsCard
            title="Total Rooms"
            value={stats.totalRooms}
            onClick={() => router.push('/teacher-dashboard/rooms')} // Also link to rooms page
          />
        </StatsGrid>
      )}

      <Section>
        <SectionHeader>
          <SectionTitle>Quick Actions</SectionTitle>
        </SectionHeader>
        <QuickActionsContainer>
          <Button onClick={handleCreateNewChatbot}>
            + Create New Chatbot
          </Button>
          <Button
            onClick={() => setShowRoomForm(true)}
            disabled={loadingChatbots || availableChatbots.length === 0}
            title={availableChatbots.length === 0 && !loadingChatbots ? "Create a chatbot before creating a room" : "Create New Room"}
          >
            {loadingChatbots ? "Loading Chatbots..." : "+ Create New Room"}
          </Button>
        </QuickActionsContainer>
        {availableChatbots.length === 0 && !loadingChatbots && !statsError?.includes("Failed to load chatbots") && (
            <Alert variant='info' style={{marginTop: '16px'}}>
                You need to create at least one chatbot before you can create a classroom room using the quick action.
            </Alert>
        )}
      </Section>

      {/* You can add other sections here like a preview of recent concerns, etc. */}
      {/* For example, to show the ConcernsList directly on the dashboard (as a preview):
      <Section id="concerns-section">
            <SectionHeader>
                 <SectionTitle>Recent Pending Concerns</SectionTitle>
                 <Button variant="outline" size="small" onClick={() => router.push('/teacher-dashboard/concerns')}>View All Concerns</Button>
            </SectionHeader>
            <ConcernsList limit={3} /> // Pass a limit to show only a few
       </Section>
       */}


      {/* RoomForm Modal for "Create New Room" quick action */}
      {showRoomForm && (
        <RoomForm
          chatbots={availableChatbots} // Pass the fetched chatbots
          onClose={() => setShowRoomForm(false)}
          onSuccess={handleRoomCreated}
        />
      )}
    </OverviewWrapper>
  );
}