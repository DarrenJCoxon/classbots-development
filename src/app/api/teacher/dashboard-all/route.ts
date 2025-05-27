// src/app/api/teacher/dashboard-all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Fetch all dashboard data in parallel
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data in parallel - MUCH faster than sequential
    const [
      profileResult,
      studentsResult,
      chatbotsResult,
      roomsResult,
      assessmentsResult,
      concernsResult,
      recentActivityResult
    ] = await Promise.allSettled([
      // Teacher profile
      supabase
        .from('teacher_profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single(),
      
      // Total students
      supabase
        .from('students')
        .select('student_id', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
        .eq('is_archived', false),
      
      // Total chatbots
      supabase
        .from('chatbots')
        .select('chatbot_id', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
        .eq('is_active', true),
      
      // Rooms (total and active)
      supabase
        .from('rooms')
        .select('room_id, is_active')
        .eq('teacher_id', user.id)
        .eq('is_archived', false),
      
      // Assessments completed
      supabase
        .from('assessments')
        .select('assessment_id', { count: 'exact', head: true })
        .eq('teacher_id', user.id),
      
      // Active concerns
      supabase
        .from('flagged_content')
        .select('flag_id', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
        .eq('status', 'pending'),
      
      // Recent activity (limit to last 7 days for performance)
      fetchRecentActivity(supabase, user.id)
    ]);

    // Process results with fallbacks
    const teacherName = profileResult.status === 'fulfilled' && profileResult.value.data
      ? profileResult.value.data.display_name
      : 'Teacher';

    const stats = {
      totalStudents: studentsResult.status === 'fulfilled' ? (studentsResult.value.count || 0) : 0,
      totalChatbots: chatbotsResult.status === 'fulfilled' ? (chatbotsResult.value.count || 0) : 0,
      totalRooms: roomsResult.status === 'fulfilled' && roomsResult.value.data 
        ? roomsResult.value.data.length : 0,
      activeRooms: roomsResult.status === 'fulfilled' && roomsResult.value.data
        ? roomsResult.value.data.filter(r => r.is_active).length : 0,
      assessmentsCompleted: assessmentsResult.status === 'fulfilled' 
        ? (assessmentsResult.value.count || 0) : 0,
      activeConcerns: concernsResult.status === 'fulfilled' 
        ? (concernsResult.value.count || 0) : 0,
    };

    const recentActivity = recentActivityResult.status === 'fulfilled' 
      ? recentActivityResult.value : [];

    // Cache the response for 1 minute
    const response = NextResponse.json({
      teacherName,
      stats,
      recentActivity
    });
    
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30');
    
    return response;

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

async function fetchRecentActivity(supabase: any, userId: string) {
  const activities: any[] = [];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    // Get teacher's rooms
    const { data: rooms } = await supabase
      .from('rooms')
      .select('room_id, room_name')
      .eq('teacher_id', userId);
      
    const roomIds = rooms?.map((r: any) => r.room_id) || [];
    
    if (roomIds.length > 0) {
      // Fetch recent joins (limit for performance)
      const { data: recentJoins } = await supabase
        .from('room_memberships')
        .select(`
          joined_at,
          student:students!inner(student_id, full_name)
        `)
        .in('room_id', roomIds)
        .gte('joined_at', sevenDaysAgo.toISOString())
        .order('joined_at', { ascending: false })
        .limit(10);

      if (recentJoins) {
        recentJoins.forEach((join: any) => {
          activities.push({
            id: `join-${join.student.student_id}-${join.joined_at}`,
            type: 'student',
            content: `${join.student.full_name} joined a room`,
            time: join.joined_at
          });
        });
      }
    }

    // Sort and limit activities
    return activities
      .sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 20);
      
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}