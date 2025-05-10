// src/components/teacher/DashboardOverview.tsx
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import StatsCard from './StatsCard';
import { Button, Alert } from '@/styles/StyledComponents';
import { useRouter } from 'next/navigation'; // For linking

const OverviewWrapper = styled.div`
  // Add any specific wrapper styles if needed
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
`;

interface DashboardStats {
  totalChatbots: number;
  totalRooms: number;
  activeRooms: number;
  pendingConcerns: number;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/teacher/dashboard-stats');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch stats (status ${response.status})`);
        }
        const data: DashboardStats = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError(err instanceof Error ? err.message : 'Could not load dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <p>Loading dashboard overview...</p>;
  }

  if (error) {
    return <Alert variant="error">Error loading stats: {error}</Alert>;
  }

  return (
    <OverviewWrapper>
      {stats && (
        <StatsGrid>
          <StatsCard 
            title="Pending Concerns" 
            value={stats.pendingConcerns} 
            onClick={() => router.push('/teacher-dashboard/concerns')}
            variant={stats.pendingConcerns > 0 ? 'danger' : 'default'}
            // icon={<SomeIconForConcerns />} 
          />
          <StatsCard 
            title="Active Rooms" 
            value={stats.activeRooms} 
            onClick={() => router.push('/teacher-dashboard/rooms')}
            // icon={<SomeIconForRooms />} 
          />
          <StatsCard 
            title="My Chatbots" 
            value={stats.totalChatbots} 
            onClick={() => router.push('/teacher-dashboard/chatbots')}
            // icon={<SomeIconForChatbots />} 
          />
          <StatsCard 
            title="Total Rooms" 
            value={stats.totalRooms} 
            // icon={<SomeIconForTotalRooms />} 
          />
        </StatsGrid>
      )}

      <Section>
        <SectionHeader>
          <SectionTitle>Quick Actions</SectionTitle>
        </SectionHeader>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Button onClick={() => alert('Navigate to Create Chatbot Form/Modal')}>
            + Create New Chatbot
          </Button>
          <Button onClick={() => alert('Navigate to Create Room Form/Modal')}>
            + Create New Room
          </Button>
        </div>
      </Section>
      
      {/* Placeholder for recent activity or tips */}
      {/* 
      <Section>
        <SectionTitle>Recent Activity</SectionTitle>
        <p>No recent activity to show yet.</p>
      </Section>
      */}

    </OverviewWrapper>
  );
}