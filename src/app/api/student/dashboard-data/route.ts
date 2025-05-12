// src/app/api/student/dashboard-data/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { 
    Room, 
    Chatbot, 
    StudentAssessment,
    Profile
} from '@/types/database.types';

// --- Interfaces for API Response ---

interface JoinedRoomForDashboard extends Pick<Room, 'room_id' | 'room_name' | 'room_code'> {
  chatbots: Pick<Chatbot, 'chatbot_id' | 'name' | 'bot_type'>[]; // Added bot_type
  joined_at: string;
}

interface AssessmentSummaryForDashboard extends Pick<StudentAssessment, 'assessment_id' | 'ai_grade_raw' | 'ai_feedback_student' | 'assessed_at' | 'status'> {
  room_id: string;
  room_name: string | null;
  chatbot_id: string;
  chatbot_name: string | null;
}

interface StudentDashboardDataResponse {
  joinedRooms: JoinedRoomForDashboard[];
  recentAssessments: AssessmentSummaryForDashboard[];
  studentProfile: Pick<Profile, 'user_id' | 'full_name' | 'email'> | null;
}

// Helper type for Supabase query for joined rooms
interface MembershipWithRoomAndChatbots {
  joined_at: string;
  rooms: { // Nullable if inner join fails or no room
    room_id: string;
    room_name: string;
    room_code: string;
    is_active: boolean;
    created_at: string;
    room_chatbots: { // Nullable array
      chatbots: { // Nullable chatbot
        chatbot_id: string;
        name: string;
        description: string | null;
        bot_type: Chatbot['bot_type']; // Ensure bot_type is selected
      } | null;
    }[] | null;
  } | null;
}


export async function GET() {
  console.log('[API GET /student/dashboard-data] Received request.');
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[API GET /student/dashboard-data] Not authenticated:', authError?.message);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is a student
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, role, full_name, email') // Fetch full_name and email too
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.warn(`[API GET /student/dashboard-data] Profile error for user ${user.id}:`, profileError?.message);
      return NextResponse.json({ error: 'User profile not found.' }, { status: 403 });
    }
    if (profile.role !== 'student') {
      console.warn(`[API GET /student/dashboard-data] User ${user.id} is not a student. Role: ${profile.role}`);
      return NextResponse.json({ error: 'Not authorized (user is not a student)' }, { status: 403 });
    }
    console.log(`[API GET /student/dashboard-data] User ${user.id} (${profile.email}) authenticated as student.`);
    
    const studentProfileInfo: Pick<Profile, 'user_id' | 'full_name' | 'email'> = {
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email
    };

    // 1. Fetch joined rooms (adapted from /api/student/rooms)
    const { data: membershipsData, error: roomsError } = await supabase
      .from('room_memberships')
      .select(`
        joined_at,
        rooms!inner(
          room_id,
          room_name,
          room_code,
          is_active,
          created_at,
          room_chatbots(
            chatbots!inner(
              chatbot_id,
              name,
              description,
              bot_type
            )
          )
        )
      `)
      .eq('student_id', user.id)
      .eq('rooms.is_active', true); // Only fetch active rooms for the dashboard

    if (roomsError) {
      console.error('[API GET /student/dashboard-data] Error fetching student rooms:', roomsError.message);
      // Don't fail entirely, dashboard might still show assessments
    }

    const typedMembershipsData = (membershipsData || []) as unknown as MembershipWithRoomAndChatbots[];
    const joinedRooms: JoinedRoomForDashboard[] = typedMembershipsData.map(membership => {
      const room = membership.rooms;
      if (!room) return null;

      const chatbotsInRoom: Pick<Chatbot, 'chatbot_id' | 'name' | 'bot_type'>[] = [];
      if (room.room_chatbots && Array.isArray(room.room_chatbots)) {
        room.room_chatbots.forEach(rc => {
          if (rc && rc.chatbots) { // Check if rc and rc.chatbots are not null
            chatbotsInRoom.push({
              chatbot_id: rc.chatbots.chatbot_id,
              name: rc.chatbots.name,
              bot_type: rc.chatbots.bot_type || 'learning', // Default if bot_type is null
            });
          }
        });
      }
      
      return {
        room_id: room.room_id,
        room_name: room.room_name,
        room_code: room.room_code,
        chatbots: chatbotsInRoom,
        joined_at: membership.joined_at,
      };
    }).filter((room): room is JoinedRoomForDashboard => room !== null);
    console.log(`[API GET /student/dashboard-data] Fetched ${joinedRooms.length} joined active rooms.`);


    // 2. Fetch recent assessments (e.g., last 5-10 completed or reviewed by teacher)
    // For assessments, we need joins to get room_name and chatbot_name
    const chatbotForeignKeyHint = "!student_assessments_chatbot_id_fkey"; // FK from student_assessments to chatbots
                                                                        // If room_id in student_assessments is TEXT and not a direct FK, we'll need a two-step fetch or careful query

    // Check if room_id in student_assessments is a direct FK to rooms.room_id
    // For now, assuming student_assessments.room_id is TEXT and might be 'teacher_test_room_...',
    // so a direct join on rooms might only work for actual UUID room_ids.
    // Let's fetch assessments and then enrich with room names.

    const { data: assessmentsData, error: assessmentsError } = await supabase
      .from('student_assessments')
      .select(`
        assessment_id,
        room_id, 
        chatbot_id,
        ai_grade_raw,
        ai_feedback_student,
        assessed_at,
        status,
        chatbot:chatbots${chatbotForeignKeyHint}!inner(name) 
      `)
      .eq('student_id', user.id)
      // .in('status', ['ai_completed', 'teacher_reviewed']) // Only show actionable/finalized feedback
      .order('assessed_at', { ascending: false })
      .limit(10); // Limit to recent ones

    if (assessmentsError) {
      console.error('[API GET /student/dashboard-data] Error fetching student assessments:', assessmentsError.message);
      // Don't fail entirely
    }
    
    let recentAssessments: AssessmentSummaryForDashboard[] = [];
    if (assessmentsData && assessmentsData.length > 0) {
        const roomIdsFromAssessments = [...new Set(
            assessmentsData.map(a => a.room_id).filter(id => id && !id.startsWith('teacher_test_room_'))
        )] as string[];

        const roomNamesMap: Map<string, string> = new Map();
        if (roomIdsFromAssessments.length > 0) {
            const { data: roomNameData, error: roomNameError } = await supabase
                .from('rooms')
                .select('room_id, room_name')
                .in('room_id', roomIdsFromAssessments);
            if (roomNameError) {
                console.warn('[API GET /student/dashboard-data] Error fetching room names for assessments:', roomNameError.message);
            } else {
                roomNameData?.forEach(r => roomNamesMap.set(r.room_id, r.room_name));
            }
        }

        recentAssessments = assessmentsData.map(asmnt => {
            const chatbotData = asmnt.chatbot as { name?: string | null } | null;
            let roomNameDisplay = 'N/A';
            if (asmnt.room_id) {
                if (asmnt.room_id.startsWith('teacher_test_room_')) {
                    // This case should ideally not appear for student-facing dashboard
                    // but handled just in case tests by teachers appear in their own 'student_assessments'
                    roomNameDisplay = 'Test Environment'; 
                } else {
                    roomNameDisplay = roomNamesMap.get(asmnt.room_id) || `Room ID: ${asmnt.room_id.substring(0,6)}`;
                }
            }

            return {
                assessment_id: asmnt.assessment_id,
                room_id: asmnt.room_id,
                room_name: roomNameDisplay,
                chatbot_id: asmnt.chatbot_id,
                chatbot_name: chatbotData?.name || 'Assessment Bot',
                ai_grade_raw: asmnt.ai_grade_raw,
                ai_feedback_student: asmnt.ai_feedback_student,
                assessed_at: asmnt.assessed_at,
                status: asmnt.status
            };
        });
    }
    console.log(`[API GET /student/dashboard-data] Fetched ${recentAssessments.length} recent assessments.`);


    const responsePayload: StudentDashboardDataResponse = {
      studentProfile: studentProfileInfo,
      joinedRooms,
      recentAssessments,
    };

    console.log('[API GET /student/dashboard-data] Successfully prepared data. Returning response.');
    return NextResponse.json(responsePayload);

  } catch (error) {
    const typedError = error as Error & { code?: string; details?: string };
    console.error('[API GET /student/dashboard-data] CATCH BLOCK Error:', typedError.message, 'Code:', typedError.code, 'Details:', typedError.details);
    return NextResponse.json(
      { error: typedError.message || 'Failed to fetch student dashboard data' },
      { status: 500 }
    );
  }
}