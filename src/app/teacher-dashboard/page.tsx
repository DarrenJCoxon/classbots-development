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

  const fetchRecentActivity = async (userId?: string) => {
    if (!userId) return;
    
    try {
      const activities: Activity[] = [];
      
      // Get teacher's rooms first
      const { data: rooms } = await supabase
        .from('rooms')
        .select('room_id, room_name')
        .eq('teacher_id', userId);
        
      const roomIds = rooms?.map(r => r.room_id) || [];
      const roomMap = new Map(rooms?.map(r => [r.room_id, r.room_name]) || []);
      
      if (roomIds.length > 0) {
        // Fetch recent student joins (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: recentJoins } = await supabase
          .from('room_student_associations')
          .select(`
            student_id,
            room_id,
            created_at,
            profiles!room_student_associations_student_id_fkey (
              full_name,
              username
            )
          `)
          .in('room_id', roomIds)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(5);
          
        // Add student join activities
        recentJoins?.forEach((join: any) => {
          const profile = Array.isArray(join.profiles) ? join.profiles[0] : join.profiles;
          const studentName = profile?.full_name || profile?.username || 'A student';
          const roomName = roomMap.get(join.room_id) || 'a room';
          activities.push({
            id: `join-${join.student_id}-${join.room_id}`,
            type: 'student',
            content: `${studentName} joined ${roomName}`,
            time: formatTimeAgo(new Date(join.created_at))
          });
        });
        
        // Fetch recent assessments
        const { data: recentAssessments } = await supabase
          .from('assessment_results')
          .select(`
            result_id,
            room_id,
            created_at,
            status,
            profiles!assessment_results_student_id_fkey (
              full_name,
              username
            ),
            chatbots!assessment_results_chatbot_id_fkey (
              chatbot_name
            )
          `)
          .in('room_id', roomIds)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(5);
          
        // Add assessment activities
        recentAssessments?.forEach((assessment: any) => {
          const profile = Array.isArray(assessment.profiles) ? assessment.profiles[0] : assessment.profiles;
          const chatbot = Array.isArray(assessment.chatbots) ? assessment.chatbots[0] : assessment.chatbots;
          const studentName = profile?.full_name || profile?.username || 'A student';
          const chatbotName = chatbot?.chatbot_name || 'assessment';
          const roomName = roomMap.get(assessment.room_id) || 'a room';
          activities.push({
            id: `assessment-${assessment.result_id}`,
            type: 'assessment',
            content: `${studentName} completed ${chatbotName} in ${roomName}`,
            time: formatTimeAgo(new Date(assessment.created_at))
          });
        });
        
        // Fetch recent safety concerns
        const { data: recentConcerns } = await supabase
          .from('flagged_messages')
          .select(`
            flag_id,
            created_at,
            rooms!flagged_messages_room_id_fkey (
              room_name
            ),
            profiles!flagged_messages_student_id_fkey (
              full_name,
              username
            )
          `)
          .eq('teacher_id', userId)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(5);
          
        // Add concern activities
        recentConcerns?.forEach((concern: any) => {
          const room = Array.isArray(concern.rooms) ? concern.rooms[0] : concern.rooms;
          const roomName = room?.room_name || 'a room';
          activities.push({
            id: `concern-${concern.flag_id}`,
            type: 'concern',
            content: `Safety alert in ${roomName}`,
            time: formatTimeAgo(new Date(concern.created_at))
          });
        });
      }
      
      // Sort all activities by time and take the most recent
      activities.sort((a, b) => {
        // Parse the time strings to compare
        const timeA = parseTimeAgo(a.time);
        const timeB = parseTimeAgo(b.time);
        return timeA - timeB;
      });
      
      setRecentActivity(activities.slice(0, 10)); // Show top 10 most recent
      
    } catch (error) {
      console.error('[TeacherDashboard] Error fetching recent activity:', error);
      // Fallback to empty array on error
      setRecentActivity([]);
    }
  };
  
  // Helper function to format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };
  
  // Helper to parse time ago strings for sorting
  const parseTimeAgo = (timeStr: string): number => {
    if (timeStr === 'just now') return 0;
    
    const match = timeStr.match(/(\d+)\s+(minute|hour|day)/);
    if (!match) return Infinity;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'minute': return value;
      case 'hour': return value * 60;
      case 'day': return value * 1440;
      default: return Infinity;
    }
  };

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
      
      // Fetch recent activity from Supabase
      await fetchRecentActivity(session?.user?.id);
      
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