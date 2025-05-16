// src/app/teacher-dashboard/page.tsx
'use client';

import styled from 'styled-components';
import { useState, useEffect } from 'react';
import DashboardOverview from '@/components/teacher/DashboardOverview'; 
import { createClient as createStandardSupabaseClient } from '@/lib/supabase/client';

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
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const supabase = createStandardSupabaseClient();

  useEffect(() => {
    async function fetchTeacherProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user?.id) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', session.user.id)
            .single();
            
          if (error) {
            console.error('[TeacherDashboard] Error fetching profile:', error);
          } else if (profile) {
            setTeacherName(profile.full_name);
          }
        }
      } catch (error) {
        console.error('[TeacherDashboard] Error in fetchTeacherProfile:', error);
      }
    }
    
    fetchTeacherProfile();
  }, [supabase]);

  console.log('[TeacherDashboardPage] Rendering with DashboardOverview...');
  
  return (
    <div>
      <PageHeader>
        <Title>Teacher Dashboard</Title>
        <Subtitle>Welcome {teacherName ? `${teacherName}` : ''}! Here&apos;s a summary of your Skolr activities.</Subtitle>
      </PageHeader>
      <DashboardOverview />
    </div>
  );
}