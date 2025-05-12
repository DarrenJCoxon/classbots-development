// src/components/teacher/DashboardOverview.tsx
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import StatsCard from './StatsCard'; 
import { Button, Alert, Card } from '@/styles/StyledComponents'; 
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/shared/LoadingSpinner'; 
import RoomForm from '@/components/teacher/RoomForm'; 
import type { Chatbot } from '@/types/database.types'; 

const OverviewWrapper = styled.div`
  /* Add any specific wrapper styles if needed */
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Section = styled(Card)` 
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
  const [showRoomForm, setShowRoomForm] = useState(false); 
  const [availableChatbots, setAvailableChatbots] = useState<Chatbot[]>([]); 
  const [loadingChatbots, setLoadingChatbots] = useState(false); 

  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingStats(true);
      setStatsError(null);
      setLoadingChatbots(true); 

      try {
        const [statsResponse, chatbotsResponse] = await Promise.all([
          fetch('/api/teacher/dashboard-stats'),
          fetch('/api/teacher/chatbots') 
        ]);

        if (!statsResponse.ok) {
          const errorData = await statsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch stats (status ${statsResponse.status})`);
        }
        const statsData: DashboardStats = await statsResponse.json();
        setStats(statsData);

        if (!chatbotsResponse.ok) {
          const errorData = await chatbotsResponse.json().catch(() => ({}));
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
        // Set error for the main stats, which might also include the chatbot fetch error contextually
        setStatsError(errorMessage); 
        // Ensure stats is null if the primary fetch (dashboard-stats) failed
        if (!(err instanceof Error && err.message.includes("Failed to load chatbots"))) { // Avoid double error message if only chatbot fetch failed
            setStats(null);
        }
      } finally {
        setLoadingStats(false);
        setLoadingChatbots(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleCreateNewChatbot = () => {
    router.push('/teacher-dashboard/chatbots/new/edit'); 
  };

  const handleRoomCreated = () => {
    setShowRoomForm(false);
    alert("Room created successfully!");
     const fetchStatsOnly = async () => {
        // No need to setLoadingStats(true) here if we want a less jarring update,
        // or set it true if you prefer a loading indicator during this quick refresh.
        try {
            const response = await fetch('/api/teacher/dashboard-stats');
            if (!response.ok) throw new Error('Failed to refresh stats');
            const data: DashboardStats = await response.json();
            setStats(data); // Just update stats
        } catch (e) { 
            console.error("Failed to refresh stats after room creation", e); 
            // Optionally set a non-blocking error message here if needed
        }
    };
    fetchStatsOnly();
  };

  if (loadingStats) { 
    return (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
            <LoadingSpinner size="large" />
            <p style={{marginTop: '16px'}}>Loading dashboard overview...</p>
        </Card>
    );
  }

  // If there's a general stats error, show it prominently
  if (statsError && !stats) { // Show if stats failed to load entirely
    return (
        <Alert variant="error" style={{ marginBottom: '16px' }}>
            {statsError}
            <Button onClick={() => window.location.reload()} size="small" style={{marginLeft: '10px'}}>Retry</Button>
        </Alert>
    );
  }
  
  // If stats loaded but there was a secondary error (like chatbot loading for RoomForm)
  // that error will be displayed above the stats grid if statsError is set.

  return (
    <OverviewWrapper>
      {/* Display statsError if it exists, even if stats are partially loaded */}
      {statsError && <Alert variant="error" style={{ marginBottom: '16px' }}>{statsError}</Alert>}

      {stats ? ( // Check if stats object exists before trying to access its properties
        <StatsGrid>
          <StatsCard
            title="Pending Concerns"
            value={stats.pendingConcerns}
            onClick={() => router.push('/teacher-dashboard/concerns')}
            variant={stats.pendingConcerns > 0 ? 'danger' : 'green'}
          />
          <StatsCard
            title="Active Rooms"
            value={stats.activeRooms}
            onClick={() => router.push('/teacher-dashboard/rooms')}
            variant="cyan" 
          />
          <StatsCard
            title="My Chatbots"
            value={stats.totalChatbots}
            onClick={() => router.push('/teacher-dashboard/chatbots')}
            variant="magenta" 
          />
          <StatsCard
            title="Total Rooms"
            value={stats.totalRooms}
            onClick={() => router.push('/teacher-dashboard/rooms')} 
            variant="orange_secondary" 
          />
        </StatsGrid>
      ) : (
        !loadingStats && !statsError && <Alert variant="info">Dashboard statistics are currently unavailable.</Alert>
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
        {availableChatbots.length === 0 && !loadingChatbots && !statsError?.includes("Failed to load chatbots for Room Creation.") && (
            <Alert variant='info' style={{marginTop: '16px'}}>
                You need to create at least one chatbot before you can create a classroom room using the quick action.
            </Alert>
        )}
      </Section>

      {showRoomForm && (
        <RoomForm
          chatbots={availableChatbots} 
          onClose={() => setShowRoomForm(false)}
          onSuccess={handleRoomCreated}
        />
      )}
    </OverviewWrapper>
  );
}