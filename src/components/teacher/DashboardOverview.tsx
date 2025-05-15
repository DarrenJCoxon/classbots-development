// src/components/teacher/DashboardOverview.tsx
'use client';

import { useState, useEffect, useCallback } from 'react'; // MODIFIED: Added useCallback
import styled from 'styled-components';
import StatsCard from './StatsCard'; 
import { Button, Alert, Card } from '@/styles/StyledComponents'; 
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // MODIFIED: Added Link for the "Create one now" message
import LoadingSpinner from '@/components/shared/LoadingSpinner'; 
import RoomForm from '@/components/teacher/RoomForm'; 
import ChatbotList from '@/components/teacher/ChatbotList'; // MODIFIED: Make sure this is imported
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
  // MODIFIED: State for recent chatbots to display in overview
  const [recentChatbots, setRecentChatbots] = useState<Chatbot[]>([]);
  const [loadingRecentChatbots, setLoadingRecentChatbots] = useState(true);


  const router = useRouter();

  // MODIFIED: Separated fetching logic slightly
  const fetchDashboardStats = useCallback(async () => {
    setLoadingStats(true);
    // Don't reset statsError here if chatbots are also loading, let chatbot fetch handle its part
    try {
      const statsResponse = await fetch('/api/teacher/dashboard-stats');
      if (!statsResponse.ok) {
        const errorData = await statsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch stats (status ${statsResponse.status})`);
      }
      const statsData: DashboardStats = await statsResponse.json();
      setStats(statsData);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      const errorMessage = err instanceof Error ? err.message : 'Could not load dashboard statistics.';
      setStatsError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage);
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchTeacherChatbots = useCallback(async (isForQuickActions = false) => {
    if (isForQuickActions) {
      setLoadingChatbots(true);
    } else {
      setLoadingRecentChatbots(true);
    }
    // Don't reset statsError here
    try {
      const chatbotsResponse = await fetch('/api/teacher/chatbots'); // Fetches all chatbots
      if (!chatbotsResponse.ok) {
        const errorData = await chatbotsResponse.json().catch(() => ({}));
        const errorMsg = errorData.error || `Failed to fetch chatbots (status ${chatbotsResponse.status})`;
        console.error(errorMsg);
        setStatsError(prev => prev ? `${prev}\n${errorMsg}` : errorMsg);
        if (isForQuickActions) setAvailableChatbots([]); else setRecentChatbots([]);
        return;
      }
      const chatbotsData: Chatbot[] = await chatbotsResponse.json();
      if (isForQuickActions) {
        setAvailableChatbots(chatbotsData);
      } else {
        // For overview, maybe show most recent 3-4 or filter them differently
        setRecentChatbots(chatbotsData.slice(0, 4)); // Example: show first 4
        if (availableChatbots.length === 0) { // Also populate availableChatbots if not already fetched
            setAvailableChatbots(chatbotsData);
        }
      }
    } catch (err) {
      console.error("Error fetching chatbots:", err);
      const errorMsg = err instanceof Error ? err.message : 'Could not load chatbots.';
      setStatsError(prev => prev ? `${prev}\n${errorMsg}` : errorMsg);
      if (isForQuickActions) setAvailableChatbots([]); else setRecentChatbots([]);
    } finally {
      if (isForQuickActions) setLoadingChatbots(false); else setLoadingRecentChatbots(false);
    }
  }, [availableChatbots.length]); // Rerun if availableChatbots length changes (e.g., from empty)

  useEffect(() => {
    fetchDashboardStats();
    fetchTeacherChatbots(false); // Fetch for recent chatbots list
    // If availableChatbots is needed for quick actions and not populated by recent fetch
    if(availableChatbots.length === 0) {
        fetchTeacherChatbots(true); // Fetch for quick actions if not already populated
    }
  }, [fetchDashboardStats, fetchTeacherChatbots, availableChatbots.length]); // Added availableChatbots.length

  const handleCreateNewChatbot = () => {
    router.push('/teacher-dashboard/chatbots/new/edit'); 
  };

  const handleRoomCreated = () => {
    setShowRoomForm(false);
    alert("Room created successfully!");
    fetchDashboardStats(); // Refresh stats which includes room counts
  };

  // MODIFIED: Placeholder handlers for ChatbotList in overview
  const handleEditChatbotOverview = (chatbotId: string) => {
    router.push(`/teacher-dashboard/chatbots/${chatbotId}/edit`);
  };

  const handleDeleteChatbotOverview = async (chatbotId: string, chatbotName: string) => {
    if (window.confirm(`Are you sure you want to delete "${chatbotName}"? This will navigate you to the main chatbots page to confirm further.`)) {
      // Or, directly call the delete API and refresh data here if preferred
      // For now, just navigate to the main chatbots page where full delete logic exists
      router.push('/teacher-dashboard/chatbots');
      // To make it fully functional here, you'd replicate the delete logic from ManageChatbotsPage
      // and call fetchTeacherChatbots(false) and fetchDashboardStats() on success.
      alert(`Deletion for "${chatbotName}" would be handled on the main chatbots page or via a shared hook/service.`);
    }
  };


  if (loadingStats || loadingRecentChatbots) { 
    return (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
            <LoadingSpinner size="large" />
            <p style={{marginTop: '16px'}}>Loading dashboard overview...</p>
        </Card>
    );
  }

  if (statsError && !stats && recentChatbots.length === 0) {
    return (
        <Alert variant="error" style={{ marginBottom: '16px' }}>
            {statsError}
            <Button onClick={() => window.location.reload()} size="small" style={{marginLeft: '10px'}}>Retry</Button>
        </Alert>
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
      )}

      <Section $accentSide="top" $accentColor="magenta">
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

      {/* MODIFIED: Section to display recent chatbots */}
      <Section $accentSide="top" $accentColor="blue">
        <SectionHeader>
          <SectionTitle>My Recent Chatbots</SectionTitle>
          {stats && stats.totalChatbots > recentChatbots.length && (
            <Button variant="outline" size="small" onClick={() => router.push('/teacher-dashboard/chatbots')}>
              View All ({stats.totalChatbots})
            </Button>
          )}
        </SectionHeader>
        {loadingRecentChatbots && recentChatbots.length === 0 ? (
            <div style={{textAlign: 'center', padding: '20px'}}><LoadingSpinner /> Loading chatbots...</div>
        ) : recentChatbots.length > 0 ? (
          <ChatbotList
            chatbots={recentChatbots} 
            onEdit={handleEditChatbotOverview}
            onDelete={handleDeleteChatbotOverview}
            viewMode="card" // MODIFIED: Provide the viewMode prop, defaulting to 'card' for overview
          />
        ) : (
          <p>No chatbots created yet. <Link href="/teacher-dashboard/chatbots/new/edit" style={{textDecoration: 'underline', fontWeight: '500'}}>Create one now!</Link></p>
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