// src/app/teacher-dashboard/page.tsx
'use client';

import styled from 'styled-components';
import DashboardOverview from '@/components/teacher/DashboardOverview'; // Import the new component

const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: 2rem;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 1.125rem;
`;

export default function TeacherDashboardPage() {
  console.log('[TeacherDashboardPage] Rendering with DashboardOverview...');
  return (
    <div>
      <PageHeader>
        <Title>Teacher Dashboard</Title> {/* Kept general title */}
        <Subtitle>Welcome! Here&apos;s a summary of your ClassBots activities.</Subtitle>
      </PageHeader>
      <DashboardOverview /> {/* Use the new overview component */}
    </div>
  );
}