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
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !teacherProfile) {
      console.warn(`[API GET /teacher/room-details] Profile not found or error for user ${user.id}:`, profileError?.message);
      return NextResponse.json({ error: 'User profile not found or error fetching it.' }, { status: 403 });
    }
    if (teacherProfile.role !== 'teacher') {
      console.warn(`[API GET /teacher/room-details] User ${user.id} is not a teacher. Role: ${teacherProfile.role}`);
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


    // Fetch student memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('room_memberships')
      .select('student_id, joined_at')
      .eq('room_id', roomId);

    if (membershipError) {
      console.error(`[API GET /teacher/room-details] Error fetching student memberships for room ${roomId}:`, membershipError.message);
      return NextResponse.json({ error: 'Failed to fetch student memberships' }, { status: 500 });
    }

    interface StudentInRoom {
        user_id: string;
        full_name: string;
        email: string;
        joined_at: string;
    }

    let studentsInRoom: StudentInRoom[] = [];
    if (memberships && memberships.length > 0) {
      const studentIds = memberships.map(m => m.student_id);
      console.log(`[API GET /teacher/room-details] Found ${studentIds.length} student IDs in room ${roomId}.`);

      const adminSupabase = createAdminClient();
      const { data: profilesData, error: profilesError } = await adminSupabase
        .from('profiles')
        .select('user_id, full_name, email')
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
          email: profile?.email || 'No email',       // Fallback email
          joined_at: membership.joined_at,
        };
      });
      console.log(`[API GET /teacher/room-details] Processed student profile data for room ${roomId}.`);
    } else {
      console.log(`[API GET /teacher/room-details] No student memberships found for room ${roomId}.`);
    }

    const responsePayload = {
      room: roomData,
      chatbots: assignedChatbots,
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