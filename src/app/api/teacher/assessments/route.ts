// src/app/api/teacher/assessments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
// Ensure all necessary types from database.types.ts are imported
import type {
    StudentAssessment,
    Profile,
    ChatMessage as DbChatMessage,
    AssessmentStatusEnum,
    AssessmentListSummary,      // These should be in your database.types.ts now
    PaginatedAssessmentsResponse,
    DetailedAssessmentResponse,
    UpdateAssessmentPayload
} from '@/types/database.types';


// getSingleDetailedAssessment function (remains exactly as in your provided code)
async function getSingleDetailedAssessment(
    assessmentId: string,
    requestingUserId: string,
    adminSupabase: ReturnType<typeof createAdminClient>
): Promise<NextResponse> {
    console.log(`[API GET /assessments?assessmentId=${assessmentId}] Fetching single assessment details.`);
    const { data: assessment, error: assessmentError } = await adminSupabase.from('student_assessments').select('*').eq('assessment_id', assessmentId).single();
    if (assessmentError || !assessment) { return NextResponse.json({ error: 'Assessment not found or error fetching it.' }, { status: 404 }); }
    const { data: chatbotOwner, error: chatbotOwnerError } = await adminSupabase.from('chatbots').select('teacher_id, name').eq('chatbot_id', assessment.chatbot_id).single();
    if (chatbotOwnerError || !chatbotOwner || chatbotOwner.teacher_id !== requestingUserId) { return NextResponse.json({ error: 'Not authorized to view this assessment' }, { status: 403 });}
    let studentProfile: { full_name: string | null } | null = null;
    if (assessment.student_id) {
        const { data: studentData } = await adminSupabase.from('student_profiles').select('full_name').eq('user_id', assessment.student_id).single();
        studentProfile = studentData;
    }
    let assessedConversation: DbChatMessage[] = [];
    if (assessment.assessed_message_ids && Array.isArray(assessment.assessed_message_ids) && assessment.assessed_message_ids.length > 0) {
        const { data: messagesData } = await adminSupabase.from('chat_messages').select('*').in('message_id', assessment.assessed_message_ids).order('created_at', { ascending: true });
        assessedConversation = (messagesData || []) as DbChatMessage[];
    }
    const responseData: DetailedAssessmentResponse = {
        ...(assessment as StudentAssessment), student_name: studentProfile?.full_name || null, student_email: null,
        chatbot_name: chatbotOwner?.name || null, assessed_conversation: assessedConversation,
    };
    return NextResponse.json(responseData);
}


export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get('assessmentId');
    const page = parseInt(searchParams.get('page') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const statusFilter = searchParams.get('status') as AssessmentStatusEnum | null;
    const roomIdFilter = searchParams.get('roomId');
    const studentIdFilter = searchParams.get('studentId');

    console.log(`[API GET /assessments] Request: assessmentId=${assessmentId||'list'}, page=${page}, limit=${limit}, status=${statusFilter||'all'}`);

    const supabaseUserClient = await createServerSupabaseClient();
    const adminSupabase = createAdminClient();

    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }

    const { data: profile, error: profileError } = await supabaseUserClient.from('teacher_profiles').select('role').eq('user_id', user.id).single();
    if (profileError || !profile || profile.role !== 'teacher') { return NextResponse.json({ error: 'Not authorized' }, { status: 403 });}
    
    if (assessmentId) {
        return getSingleDetailedAssessment(assessmentId, user.id, adminSupabase);
    } else {
        console.log(`[API GET /assessments] Fetching list for teacher ${user.id}. Filters: status=${statusFilter}, room=${roomIdFilter}, student=${studentIdFilter}`);
        const offset = page * limit;
        try {
            const studentForeignKeyHint = "!student_assessments_student_id_fkey"; // Using the name from your FK list
            const chatbotForeignKeyHint = "!student_assessments_chatbot_id_fkey"; // Using the name from your FK list

            // First, get the assessments
            let query = adminSupabase
                .from('student_assessments')
                .select('*', { count: 'exact' })
                .eq('teacher_id', user.id) 
                .order('assessed_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (statusFilter) query = query.eq('status', statusFilter);
            if (roomIdFilter) query = query.eq('room_id', roomIdFilter);
            if (studentIdFilter) query = query.eq('student_id', studentIdFilter);

            const { data, error, count } = await query;

            if (error) {
                console.error(`[API GET /assessments] DB Error fetching list (initial query):`, JSON.stringify(error, null, 2));
                throw error;
            }

            if (!data) { // Should not happen if error is null, but good check
                console.warn("[API GET /assessments] No assessment data returned from initial query, though no explicit error.");
                 return NextResponse.json({ assessments: [], pagination: { currentPage: page, pageSize: limit, totalCount: 0, totalPages: 0 }});
            }
            
            // Step 2: Fetch student names separately
            const studentIds = [...new Set(data.map(item => item.student_id).filter(Boolean))] as string[];
            const studentNamesMap: Map<string, string> = new Map();
            if (studentIds.length > 0) {
                const { data: studentData, error: studentError } = await adminSupabase
                    .from('student_profiles')
                    .select('user_id, full_name')
                    .in('user_id', studentIds);
                
                if (studentError) {
                    console.warn("[API GET /assessments] Error fetching student names:", studentError.message);
                } else if (studentData) {
                    studentData.forEach(student => {
                        if (student.full_name) {
                            studentNamesMap.set(student.user_id, student.full_name);
                        }
                    });
                }
            }
            
            // Step 3: Fetch chatbot names separately
            const chatbotIds = [...new Set(data.map(item => item.chatbot_id).filter(Boolean))] as string[];
            const chatbotNamesMap: Map<string, string> = new Map();
            if (chatbotIds.length > 0) {
                const { data: chatbotData, error: chatbotError } = await adminSupabase
                    .from('chatbots')
                    .select('chatbot_id, name')
                    .in('chatbot_id', chatbotIds);
                
                if (chatbotError) {
                    console.warn("[API GET /assessments] Error fetching chatbot names:", chatbotError.message);
                } else if (chatbotData) {
                    chatbotData.forEach(chatbot => {
                        if (chatbot.name) {
                            chatbotNamesMap.set(chatbot.chatbot_id, chatbot.name);
                        }
                    });
                }
            }
            
            // Step 4: Fetch room names separately for valid UUID room_ids
            const roomIdsToFetchNames = [...new Set(
                data.map(item => item.room_id).filter(id => id && !id.startsWith('teacher_test_room_'))
            )] as string[]; // Ensure it's an array of strings

            const roomNamesMap: Map<string, string> = new Map();
            if (roomIdsToFetchNames.length > 0) {
                const { data: roomData, error: roomNameError } = await adminSupabase
                    .from('rooms')
                    .select('room_id, room_name')
                    .in('room_id', roomIdsToFetchNames);
                
                if (roomNameError) {
                    console.warn("[API GET /assessments] Error fetching room names separately:", roomNameError.message);
                } else if (roomData) {
                    roomData.forEach(room => roomNamesMap.set(room.room_id, room.room_name));
                }
            }

            const assessments: AssessmentListSummary[] = data.map(item => {
                const studentName = item.student_id ? studentNamesMap.get(item.student_id) || 'N/A' : 'N/A';
                const chatbotName = item.chatbot_id ? chatbotNamesMap.get(item.chatbot_id) || 'N/A' : 'N/A';
                
                let resolvedRoomName = 'N/A';
                if (item.room_id) {
                    if (item.room_id.startsWith('teacher_test_room_')) {
                        resolvedRoomName = 'Teacher Test Chat';
                    } else if (roomNamesMap.has(item.room_id)) {
                        resolvedRoomName = roomNamesMap.get(item.room_id)!;
                    } else {
                        // Fallback if room_id is a UUID but not found in rooms table (e.g., room deleted)
                        resolvedRoomName = `Room ID: ${item.room_id.substring(0,8)}...`;
                    }
                }

                return {
                    assessment_id: item.assessment_id, student_id: item.student_id, chatbot_id: item.chatbot_id,
                    room_id: item.room_id, teacher_id: item.teacher_id, assessed_at: item.assessed_at,
                    ai_grade_raw: item.ai_grade_raw, teacher_override_grade: item.teacher_override_grade, status: item.status,
                    student_name: studentName,
                    chatbot_name: chatbotName,
                    room_name: resolvedRoomName
                };
            });
            
            const totalCount = count || 0;
            const totalPages = limit > 0 ? Math.ceil(totalCount / limit) : 0;
            const responsePayload: PaginatedAssessmentsResponse = {
                assessments,
                pagination: { currentPage: page, pageSize: limit, totalCount, totalPages }
            };
            console.log(`[API GET /assessments] Returning ${assessments.length} assessments. Total: ${totalCount}`);
            return NextResponse.json(responsePayload);

        } catch (error) {
            console.error(`[API GET /assessments] CATCH BLOCK fetching list:`, error);
            return NextResponse.json({ error: 'Failed to fetch assessments list' }, { status: 500 });
        }
    }
}

// PATCH handler (remains exactly as you provided)
export async function PATCH(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get('assessmentId');
    if (!assessmentId) { return NextResponse.json({ error: 'Assessment ID is required for PATCH' }, { status: 400 });}
    console.log(`[API PATCH /assessments?assessmentId=${assessmentId}] Request to update.`);
    const supabaseUserClient = await createServerSupabaseClient();
    const adminSupabase = createAdminClient();
    try {
        const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
        if (authError || !user) { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
        const { data: assessment, error: fetchError } = await adminSupabase.from('student_assessments').select('chatbot_id').eq('assessment_id', assessmentId).single();
        if (fetchError || !assessment) { return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });}
        const { data: chatbotOwner, error: chatbotOwnerError } = await adminSupabase.from('chatbots').select('teacher_id').eq('chatbot_id', assessment.chatbot_id).single();
        if (chatbotOwnerError || !chatbotOwner || chatbotOwner.teacher_id !== user.id) { return NextResponse.json({ error: 'Not authorized' }, { status: 403 });}
        const body: UpdateAssessmentPayload = await request.json();
        const updateData: Partial<Omit<StudentAssessment, 'created_at' | 'assessment_id'>> = {};
        if (body.hasOwnProperty('teacher_override_grade')) updateData.teacher_override_grade = body.teacher_override_grade;
        if (body.hasOwnProperty('teacher_override_notes')) updateData.teacher_override_notes = body.teacher_override_notes;
        if (body.status) {
            const validStatuses: AssessmentStatusEnum[] = ['ai_processing', 'ai_completed', 'teacher_reviewed'];
            if (validStatuses.includes(body.status)) updateData.status = body.status;
            else console.warn(`[API PATCH /assessments?assessmentId=${assessmentId}] Invalid status: ${body.status}`);
        }
        updateData.updated_at = new Date().toISOString();
        if (Object.keys(updateData).length <= 1 && updateData.updated_at) { console.log(`[API PATCH /assessments?assessmentId=${assessmentId}] No data fields to update.`); }
        console.log(`[API PATCH /assessments?assessmentId=${assessmentId}] Updating with:`, updateData);
        const { data: updatedAssessment, error: updateError } = await adminSupabase.from('student_assessments').update(updateData).eq('assessment_id', assessmentId).select().single();
        if (updateError) { return NextResponse.json({ error: 'Failed to update assessment', details: updateError.message }, { status: 500 });}
        return NextResponse.json(updatedAssessment);
    } catch (error) {
        console.error(`[API PATCH /assessments?assessmentId=${assessmentId}] General error:`, error);
        if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
        return NextResponse.json({ error: 'Internal server error during PATCH.' }, { status: 500 });
    }
}