// src/app/api/teacher/students-overview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AssessmentStatusEnum } from '@/types/database.types';

interface StudentWithAssessments {
  user_id: string;
  full_name: string;
  year_group: string | null;
  room_id: string;
  room_name: string;
  assessments: Array<{
    assessment_id: string;
    assessed_at: string;
    ai_grade_raw: string | null;
    teacher_override_grade: string | null;
    status: AssessmentStatusEnum | null;
    chatbot_name: string;
  }>;
  average_grade: number | null;
}

interface StudentsOverviewResponse {
  students: StudentWithAssessments[];
  rooms: Array<{
    room_id: string;
    room_name: string;
    student_count: number;
  }>;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomIdFilter = searchParams.get('roomId');

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Verify teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get teacher's rooms
    let roomsQuery = supabase
      .from('rooms')
      .select('room_id, room_name')
      .eq('teacher_id', user.id)
      .eq('is_active', true);

    if (roomIdFilter) {
      roomsQuery = roomsQuery.eq('room_id', roomIdFilter);
    }

    const { data: rooms, error: roomsError } = await roomsQuery;

    if (roomsError) {
      console.error('[API GET /teacher/students-overview] Error fetching rooms:', roomsError);
      return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }

    if (!rooms || rooms.length === 0) {
      return NextResponse.json({ 
        students: [], 
        rooms: [] 
      });
    }

    const roomIds = rooms.map(r => r.room_id);

    // Get all students in these rooms
    const { data: memberships, error: membershipsError } = await adminSupabase
      .from('room_memberships')
      .select('student_id, room_id, joined_at')
      .in('room_id', roomIds)
      .eq('is_archived', false);

    if (membershipsError) {
      console.error('[API GET /teacher/students-overview] Error fetching memberships:', membershipsError);
      return NextResponse.json({ error: 'Failed to fetch student memberships' }, { status: 500 });
    }

    if (!memberships || memberships.length === 0) {
      // Return rooms data even if no students
      const roomsData = rooms.map(room => ({
        room_id: room.room_id,
        room_name: room.room_name,
        student_count: 0
      }));
      return NextResponse.json({ 
        students: [], 
        rooms: roomsData 
      });
    }

    const studentIds = [...new Set(memberships.map(m => m.student_id))];

    // Get student profiles
    const { data: studentProfiles, error: profilesError } = await adminSupabase
      .from('student_profiles')
      .select('user_id, full_name, year_group')
      .in('user_id', studentIds);

    if (profilesError) {
      console.error('[API GET /teacher/students-overview] Error fetching student profiles:', profilesError);
    }

    // Get all assessments for these students
    const { data: assessments, error: assessmentsError } = await adminSupabase
      .from('student_assessments')
      .select(`
        assessment_id,
        student_id,
        chatbot_id,
        room_id,
        assessed_at,
        ai_grade_raw,
        teacher_override_grade,
        status
      `)
      .eq('teacher_id', user.id)
      .in('student_id', studentIds)
      .order('assessed_at', { ascending: false });

    if (assessmentsError) {
      console.error('[API GET /teacher/students-overview] Error fetching assessments:', assessmentsError);
    }

    // Get chatbot names for assessments
    const chatbotIds = assessments ? [...new Set(assessments.map(a => a.chatbot_id))] : [];
    let chatbotNames: Map<string, string> = new Map();

    if (chatbotIds.length > 0) {
      const { data: chatbots, error: chatbotsError } = await adminSupabase
        .from('chatbots')
        .select('chatbot_id, name')
        .in('chatbot_id', chatbotIds);

      if (!chatbotsError && chatbots) {
        chatbots.forEach(bot => chatbotNames.set(bot.chatbot_id, bot.name));
      }
    }

    // Build students with assessments data
    const studentsMap = new Map<string, StudentWithAssessments>();

    // Initialize students from memberships
    memberships.forEach(membership => {
      const key = `${membership.student_id}-${membership.room_id}`;
      const profile = studentProfiles?.find(p => p.user_id === membership.student_id);
      const room = rooms.find(r => r.room_id === membership.room_id);

      if (!studentsMap.has(key)) {
        studentsMap.set(key, {
          user_id: membership.student_id,
          full_name: profile?.full_name || 'Unknown Student',
          year_group: profile?.year_group || null,
          room_id: membership.room_id,
          room_name: room?.room_name || 'Unknown Room',
          assessments: [],
          average_grade: null
        });
      }
    });

    // Add assessments to students
    if (assessments) {
      assessments.forEach(assessment => {
        const key = `${assessment.student_id}-${assessment.room_id}`;
        const student = studentsMap.get(key);
        
        if (student) {
          student.assessments.push({
            assessment_id: assessment.assessment_id,
            assessed_at: assessment.assessed_at,
            ai_grade_raw: assessment.ai_grade_raw,
            teacher_override_grade: assessment.teacher_override_grade,
            status: assessment.status,
            chatbot_name: chatbotNames.get(assessment.chatbot_id) || 'Unknown Chatbot'
          });
        }
      });
    }

    // Calculate average grades
    studentsMap.forEach(student => {
      if (student.assessments.length > 0) {
        const grades = student.assessments
          .map(a => {
            const grade = a.teacher_override_grade || a.ai_grade_raw;
            if (!grade) return null;
            
            // Extract numeric value from grade string
            const match = grade.match(/(\d+(?:\.\d+)?)/);
            return match ? parseFloat(match[1]) : null;
          })
          .filter(g => g !== null) as number[];

        if (grades.length > 0) {
          student.average_grade = Math.round((grades.reduce((sum, g) => sum + g, 0) / grades.length) * 10) / 10;
        }
      }
    });

    // Prepare room statistics
    const roomsData = rooms.map(room => ({
      room_id: room.room_id,
      room_name: room.room_name,
      student_count: memberships.filter(m => m.room_id === room.room_id).length
    }));

    const studentsArray = Array.from(studentsMap.values())
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    const response: StudentsOverviewResponse = {
      students: studentsArray,
      rooms: roomsData
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API GET /teacher/students-overview] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch students overview' },
      { status: 500 }
    );
  }
}