// src/app/api/student/assessment-detail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { 
    StudentAssessment, 
    ChatMessage as DbChatMessage
} from '@/types/database.types';

// StudentDetailedAssessmentResponse interface remains the same
export interface StudentDetailedAssessmentResponse extends StudentAssessment {
    chatbot_name?: string | null;
    room_name?: string | null;
    assessed_conversation?: DbChatMessage[];
}

export async function GET(request: NextRequest) { // Removed the second 'params' argument
  const { searchParams } = new URL(request.url);
  const assessmentId = searchParams.get('assessmentId'); // Get assessmentId from query params

  console.log(`[API GET /student/assessment-detail] Received request for assessmentId: ${assessmentId}`);

  if (!assessmentId) {
    return NextResponse.json({ error: 'Assessment ID query parameter is required' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn(`[API GET /student/assessment-detail] Not authenticated:`, authError?.message);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: assessment, error: assessmentError } = await supabase
      .from('student_assessments')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('student_id', user.id)
      .single();

    if (assessmentError || !assessment) {
      console.warn(`[API GET /student/assessment-detail] Assessment ${assessmentId} not found or student ${user.id} not authorized:`, assessmentError?.message);
      return NextResponse.json({ error: 'Assessment not found or you are not authorized to view it.' }, { status: 404 });
    }
    console.log(`[API GET /student/assessment-detail] Assessment ${assessmentId} found and student ${user.id} authorized.`);

    let chatbotName: string | null = null;
    if (assessment.chatbot_id) {
      const { data: chatbotData } = await supabase
        .from('chatbots')
        .select('name')
        .eq('chatbot_id', assessment.chatbot_id)
        .single();
      chatbotName = chatbotData?.name || 'Assessment Bot';
    }

    let roomName: string | null = null;
    if (assessment.room_id && !assessment.room_id.startsWith('teacher_test_room_')) {
        const { data: roomData } = await supabase
            .from('rooms')
            .select('room_name')
            .eq('room_id', assessment.room_id)
            .single();
        roomName = roomData?.room_name || null;
    } else if (assessment.room_id && assessment.room_id.startsWith('teacher_test_room_')) {
        roomName = 'Teacher Test Chat';
    }

    let assessedConversation: DbChatMessage[] = [];
    if (assessment.assessed_message_ids && Array.isArray(assessment.assessed_message_ids) && assessment.assessed_message_ids.length > 0) {
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .in('message_id', assessment.assessed_message_ids)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error(`[API GET /student/assessment-detail] Error fetching assessed conversation for ${assessmentId}:`, messagesError.message);
      } else {
        assessedConversation = (messagesData || []) as DbChatMessage[];
      }
    }
    console.log(`[API GET /student/assessment-detail] Fetched ${assessedConversation.length} messages for ${assessmentId}.`);

    const responseData: StudentDetailedAssessmentResponse = {
      ...(assessment as StudentAssessment),
      chatbot_name: chatbotName,
      room_name: roomName,
      assessed_conversation: assessedConversation,
    };
    
    console.log(`[API GET /student/assessment-detail] Successfully prepared data for ${assessmentId}. Returning response.`);
    return NextResponse.json(responseData);

  } catch (error) {
    const typedError = error as Error;
    console.error(`[API GET /student/assessment-detail] CATCH BLOCK Error for ${assessmentId}:`, typedError.message);
    return NextResponse.json(
      { error: typedError.message || 'Failed to fetch assessment details' },
      { status: 500 }
    );
  }
}