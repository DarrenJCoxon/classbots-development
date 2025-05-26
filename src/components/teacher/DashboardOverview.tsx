// src/components/teacher/DashboardOverview.tsx
'use client';

import { useState, useEffect, useCallback } from 'react'; // MODIFIED: Added useCallback
import styled from 'styled-components';
import { StatsCard } from '@/components/ui';
import { Button, Alert, Card } from '@/styles/StyledComponents'; 
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // MODIFIED: Added Link for the "Create one now" message
import LoadingSpinner from '@/components/shared/LoadingSpinner'; 
import RoomForm from '@/components/teacher/RoomForm'; 
import ChatbotList from '@/components/teacher/ChatbotList'; // MODIFIED: Make sure this is imported
import type { Chatbot } from '@/types/database.types';
import { FiMessageSquare, FiUsers, FiActivity, FiAlertTriangle } from 'react-icons/fi'; 

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
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
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

interface RoomEngagement {
  room_id: string;
  room_name: string;
  totalStudents: number;
  activeStudents: number;
  engagementRate: number;
}

interface DashboardStats {
  totalChatbots: number;
  totalRooms: number;
  activeRooms: number;
  pendingConcerns: number;
  roomEngagement?: RoomEngagement[];
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
  const [success, setSuccess] = useState<string | null>(null);


  const router = useRouter();

  // MODIFIED: Separated fetching logic slightly
  const fetchDashboardStats = useCallback(async () => {
    setLoadingStats(true);
    // Don't reset statsError here if chatbots are also loading, let chatbot fetch handle its part
    try {
      // Add a cache-busting parameter to avoid browser caching
      const statsResponse = await fetch(`/api/teacher/dashboard-stats?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('[DashboardOverview] Stats response status:', statsResponse.status);
      
      if (!statsResponse.ok) {
        const errorData = await statsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch stats (status ${statsResponse.status})`);
      }
      
      const statsData: DashboardStats = await statsResponse.json();
      console.log('[DashboardOverview] Stats data received:', statsData);
      
      // Validate that we have all the stats we need
      if (statsData) {
        // Create default stats object if any properties are missing
        const validatedStats: DashboardStats = {
          totalChatbots: typeof statsData.totalChatbots === 'number' ? statsData.totalChatbots : 0,
          totalRooms: typeof statsData.totalRooms === 'number' ? statsData.totalRooms : 0,
          activeRooms: typeof statsData.activeRooms === 'number' ? statsData.activeRooms : 0,
          pendingConcerns: typeof statsData.pendingConcerns === 'number' ? statsData.pendingConcerns : 0
        };
        
        setStats(validatedStats);
      } else {
        console.warn('[DashboardOverview] Stats data is empty or invalid');
        // Set default stats
        setStats({
          totalChatbots: 0,
          totalRooms: 0,
          activeRooms: 0,
          pendingConcerns: 0
        });
      }
    } catch (err) {
      console.error("[DashboardOverview] Error fetching dashboard stats:", err);
      const errorMessage = err instanceof Error ? err.message : 'Could not load dashboard statistics.';
      setStatsError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage);
      
      // Provide default stats even in error case to avoid UI issues
      setStats({
        totalChatbots: 0,
        totalRooms: 0,
        activeRooms: 0,
        pendingConcerns: 0
      });
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
    setStatsError(null);
    setSuccess("Room created successfully!");
    // Add success state and display it briefly
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
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
      setSuccess(`Deletion for "${chatbotName}" would be handled on the main chatbots page`);
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
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
      {success && <Alert variant="success" style={{ marginBottom: '16px' }}>{success}</Alert>}

      <StatsGrid>
        {!stats && statsError ? (
          <>
            <Card style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center' }}>
              <Alert variant="error" style={{ marginBottom: '16px' }}>Failed to load dashboard statistics</Alert>
              <Button onClick={fetchDashboardStats} variant="primary">Retry Loading Stats</Button>
            </Card>
          </>
        ) : (
          <>
            <StatsCard
              icon={<FiAlertTriangle />}
              title="Pending Concerns"
              value={stats?.pendingConcerns ?? 0}
              subtitle={(stats?.pendingConcerns ?? 0) > 0 ? "Require attention" : "All clear"}
              onClick={() => router.push('/teacher-dashboard/concerns')}
              accentColor={(stats?.pendingConcerns ?? 0) > 0 ? 'danger' : 'success'}
            />
            <StatsCard
              icon={<FiActivity />}
              title="Active Rooms"
              value={stats?.activeRooms ?? 0}
              subtitle="Learning spaces"
              onClick={() => router.push('/teacher-dashboard/rooms')}
              accentColor="primary" 
            />
            <StatsCard
              icon={<FiMessageSquare />}
              title="My Skolrbots"
              value={stats?.totalChatbots ?? 0}
              subtitle="AI assistants"
              onClick={() => router.push('/teacher-dashboard/chatbots')}
              accentColor="secondary" 
            />
            <StatsCard
              icon={<FiUsers />}
              title="Total Rooms"
              value={stats?.totalRooms ?? 0}
              subtitle="Created rooms"
              onClick={() => router.push('/teacher-dashboard/rooms')} 
              accentColor="success" 
            />
          </>
        )}
      </StatsGrid>

      <Section $accentSide="top" $accentColor="magenta">
        <SectionHeader>
          <SectionTitle>Quick Actions</SectionTitle>
        </SectionHeader>
        <QuickActionsContainer>
          <Button onClick={handleCreateNewChatbot}>
            + Create New Skolrbot
          </Button>
          <Button
            onClick={() => setShowRoomForm(true)}
            disabled={loadingChatbots || availableChatbots.length === 0}
            title={availableChatbots.length === 0 && !loadingChatbots ? "Create a skolrbot before creating a room" : "Create New Room"}
          >
            {loadingChatbots ? "Loading Skolrbots..." : "+ Create New Room"}
          </Button>
        </QuickActionsContainer>
        {availableChatbots.length === 0 && !loadingChatbots && !statsError?.includes("Failed to load chatbots for Room Creation.") && (
            <Alert variant='info' style={{marginTop: '16px'}}>
                You need to create at least one skolrbot before you can create a classroom room using the quick action.
            </Alert>
        )}
      </Section>

      {/* MODIFIED: Section to display recent chatbots */}
      <Section $accentSide="top" $accentColor="blue">
        <SectionHeader>
          <SectionTitle>My Recent Skolrbots</SectionTitle>
          {stats && stats.totalChatbots > recentChatbots.length && (
            <Button variant="outline" size="small" onClick={() => router.push('/teacher-dashboard/chatbots')}>
              View All ({stats.totalChatbots})
            </Button>
          )}
        </SectionHeader>
        {loadingRecentChatbots && recentChatbots.length === 0 ? (
            <div style={{textAlign: 'center', padding: '20px'}}><LoadingSpinner /> Loading skolrbots...</div>
        ) : recentChatbots.length > 0 ? (
          <ChatbotList
            chatbots={recentChatbots} 
            onEdit={handleEditChatbotOverview}
            onDelete={handleDeleteChatbotOverview}
            viewMode="card" // MODIFIED: Provide the viewMode prop, defaulting to 'card' for overview
          />
        ) : (
          <p>No skolrbots created yet. <Link href="/teacher-dashboard/chatbots/new/edit" style={{textDecoration: 'underline', fontWeight: '500'}}>Create one now!</Link></p>
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