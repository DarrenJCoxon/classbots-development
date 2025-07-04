// src/app/api/teacher/room-details/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin'; // For fetching student profiles

export async function GET(request: NextRequest) {
  console.log('[API GET /teacher/room-details] Received request.');
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      console.warn('[API GET /teacher/room-details] roomId query parameter is missing.');
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }
    console.log(`[API GET /teacher/room-details] Processing for roomId: ${roomId}`);

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[API GET /teacher/room-details] Not authenticated:', authError?.message);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: teacherProfile, error: profileError } = await supabase
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !teacherProfile) {
      console.warn(`[API GET /teacher/room-details] Teacher profile not found for user ${user.id}:`, profileError?.message);
      return NextResponse.json({ error: 'Not authorized (user is not a teacher)' }, { status: 403 });
    }
    console.log(`[API GET /teacher/room-details] User ${user.id} authenticated as teacher.`);

    // Fetch room details and verify ownership
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*') // Select all room fields
      .eq('room_id', roomId)
      .eq('teacher_id', user.id) // RLS also enforces this, but explicit check is good
      .single();

    if (roomError || !roomData) {
      console.warn(`[API GET /teacher/room-details] Room ${roomId} not found or teacher ${user.id} not authorized:`, roomError?.message);
      return NextResponse.json({ error: 'Room not found or unauthorized' }, { status: 404 });
    }
    console.log(`[API GET /teacher/room-details] Room ${roomId} details fetched.`);

    // Fetch assigned chatbots
    const { data: roomChatbotsData, error: roomChatbotsError } = await supabase
      .from('room_chatbots')
      .select('chatbots (chatbot_id, name, description, bot_type)') // Include description and bot_type
      .eq('room_id', roomId);

    if (roomChatbotsError) {
      console.error(`[API GET /teacher/room-details] Error fetching chatbots for room ${roomId}:`, roomChatbotsError.message);
      // Don't fail the whole request, proceed with empty chatbots array
    }
    const assignedChatbots = roomChatbotsData?.map(rc => rc.chatbots).filter(Boolean) || [];
    console.log(`[API GET /teacher/room-details] Fetched ${assignedChatbots.length} assigned chatbots for room ${roomId}.`);

    // Fetch assigned courses
    const { data: roomCoursesData, error: roomCoursesError } = await supabase
      .from('room_courses')
      .select('courses (course_id, title, description, subject)')
      .eq('room_id', roomId);

    if (roomCoursesError) {
      console.error(`[API GET /teacher/room-details] Error fetching courses for room ${roomId}:`, roomCoursesError.message);
      // Don't fail the whole request, proceed with empty courses array
    }
    const assignedCourses = roomCoursesData?.map(rc => rc.courses).filter(Boolean) || [];
    console.log(`[API GET /teacher/room-details] Fetched ${assignedCourses.length} assigned courses for room ${roomId}.`);


    // Get query parameter to include archived students
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const archivedOnly = searchParams.get('archivedOnly') === 'true';
    
    console.log(`[API GET /teacher/room-details] Query params: includeArchived=${includeArchived}, archivedOnly=${archivedOnly}`);
    
    // Fetch student memberships with archive filtering
    let membershipQuery = supabase
      .from('room_memberships')
      .select('student_id, joined_at, is_archived')
      .eq('room_id', roomId);
      
    // Apply archive filtering based on query parameters  
    if (archivedOnly) {
      membershipQuery = membershipQuery.eq('is_archived', true);
    } else if (!includeArchived) {
      membershipQuery = membershipQuery.eq('is_archived', false);
    }
    
    const { data: memberships, error: membershipError } = await membershipQuery;

    if (membershipError) {
      console.error(`[API GET /teacher/room-details] Error fetching student memberships for room ${roomId}:`, membershipError.message);
      return NextResponse.json({ error: 'Failed to fetch student memberships' }, { status: 500 });
    }

    interface StudentInRoom {
        user_id: string;
        full_name: string;
        email: string;
        username?: string;
        joined_at: string;
        is_archived?: boolean;
    }

    let studentsInRoom: StudentInRoom[] = [];
    if (memberships && memberships.length > 0) {
      const studentIds = memberships.map(m => m.student_id);
      console.log(`[API GET /teacher/room-details] Found ${studentIds.length} student IDs in room ${roomId}.`);

      const adminSupabase = createAdminClient();
      const { data: profilesData, error: profilesError } = await adminSupabase
        .from('student_profiles')
        .select('user_id, full_name, first_name, surname, username')
        .in('user_id', studentIds);

      if (profilesError) {
        console.error(`[API GET /teacher/room-details] Admin client error fetching student profiles:`, profilesError.message);
        // Proceed, but student names/emails might be missing
      }

      studentsInRoom = memberships.map(membership => {
        const profile = profilesData?.find(p => p.user_id === membership.student_id);
        return {
          user_id: membership.student_id,
          full_name: profile?.full_name || 'Student', // Fallback name
          email: '',       // Email not in student_profiles
          username: profile?.username || undefined,    // Include username
          joined_at: membership.joined_at,
          is_archived: membership.is_archived || false
        };
      });
      console.log(`[API GET /teacher/room-details] Processed student profile data for room ${roomId}.`);
    } else {
      console.log(`[API GET /teacher/room-details] No student memberships found for room ${roomId}.`);
    }

    const responsePayload = {
      room: roomData,
      chatbots: assignedChatbots,
      courses: assignedCourses,
      students: studentsInRoom,
    };

    console.log(`[API GET /teacher/room-details] Successfully prepared data for room ${roomId}. Returning response.`);
    return NextResponse.json(responsePayload);

  } catch (error) {
    const typedError = error as Error & { code?: string; details?: string };
    console.error('[API GET /teacher/room-details] CATCH BLOCK Error:', typedError.message, 'Code:', typedError.code, 'Details:', typedError.details);
    return NextResponse.json(
      { error: typedError.message || 'Failed to fetch room details' },
      { status: 500 }
    );
  }
}