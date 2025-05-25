// src/app/teacher-dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ModernDashboard } from '@/components/teacher/ModernDashboard';
import { createClient as createStandardSupabaseClient } from '@/lib/supabase/client';
import { FullPageLoader } from '@/components/shared/AnimatedLoader';

interface DashboardStats {
  totalStudents: number;
  totalChatbots: number;
  totalRooms: number;
  activeRooms: number;
  assessmentsCompleted: number;
  activeConcerns: number;
}

interface Activity {
  id: string;
  type: 'student' | 'room' | 'assessment' | 'concern';
  content: string;
  time: string;
}

export default function TeacherDashboardPage() {
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createStandardSupabaseClient();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch teacher profile
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', session.user.id)
          .single();
          
        if (profile) {
          setTeacherName(profile.full_name);
        }
      }
      
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/teacher/dashboard-stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          totalStudents: statsData.totalStudents || 0,
          totalChatbots: statsData.totalChatbots || 0,
          totalRooms: statsData.totalRooms || 0,
          activeRooms: statsData.activeRooms || 0,
          assessmentsCompleted: statsData.assessmentsCompleted || 0,
          activeConcerns: statsData.pendingConcerns || 0
        });
      }
      
      // Mock recent activity - replace with actual API call
      setRecentActivity([
        { id: '1', type: 'student', content: 'John Doe joined Math Room', time: '5 minutes ago' },
        { id: '2', type: 'assessment', content: 'Quiz completed in Science Room', time: '1 hour ago' },
        { id: '3', type: 'room', content: 'English Room created', time: '2 hours ago' },
        { id: '4', type: 'concern', content: 'Safety alert in History Room', time: '3 hours ago' }
      ]);
      
    } catch (error) {
      console.error('[TeacherDashboard] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);
  
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading || !stats) {
    return <FullPageLoader message="Loading your dashboard..." variant="dots" />;
  }
  
  return (
    <ModernDashboard
      stats={stats}
      recentActivity={recentActivity}
      teacherName={teacherName}
    />
  );
}