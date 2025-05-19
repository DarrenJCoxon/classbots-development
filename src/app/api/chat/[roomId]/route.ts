// src/app/api/chat/[roomId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateEmbedding } from '@/lib/openai/embeddings';
import { queryVectors } from '@/lib/pinecone/utils';
import { checkMessageSafety, initialConcernCheck } from '@/lib/safety/monitoring';
import type { ChatMessage, Room } from '@/types/database.types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// This is still the internal command identifier used by the backend
const ASSESSMENT_TRIGGER_COMMAND = "/assess";
// Number of messages to include in the assessment context
const ASSESSMENT_CONTEXT_MESSAGE_COUNT = 5;

const isTeacherTestRoom = (roomId: string) => roomId.startsWith('teacher_test_room_for_');

// --- GET Function ---
export async function GET(request: NextRequest) {
    try {
        const pathname = request.nextUrl.pathname;
        const segments = pathname.split('/');
        const roomId = segments.length > 0 ? segments[segments.length - 1] : null;
        const { searchParams } = new URL(request.url);
        const chatbotIdFilter = searchParams.get('chatbotId');
        const instanceIdFilter = searchParams.get('instanceId');

        if (!roomId) return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });

        // Check for direct access headers from API
        const directAccessKey = request.headers.get('x-direct-access-admin-key');
        const bypassUserId = request.headers.get('x-bypass-auth-user-id');
        let user;

        // Always use the admin client to bypass RLS policies
        const supabaseAdmin = createAdminClient();

        if (directAccessKey && bypassUserId && directAccessKey === (process.env.DIRECT_ACCESS_ADMIN_KEY || 'directaccess_key')) {
            console.log(`[API Chat GET] Using bypassed auth for user: ${bypassUserId}`);
            // Use admin client to verify the user exists
            const { data: userData, error: userError } = await supabaseAdmin
                .from('profiles')
                .select('user_id, role')
                .eq('user_id', bypassUserId)
                .maybeSingle();

            if (userError || !userData) {
                console.error(`[API Chat GET] Error verifying bypassed user ${bypassUserId}:`, userError);
                return NextResponse.json({ error: 'Invalid bypass user ID' }, { status: 401 });
            }

            user = { id: bypassUserId, role: userData.role };
        } else {
            // Standard authentication
            const supabase = await createServerSupabaseClient();
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
            if (authError || !authUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
            
            // Get user profile with admin client to ensure we have the role
            const { data: userProfile } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('user_id', authUser.id)
                .single();
                
            user = { ...authUser, role: userProfile?.role };
        }
        
        if (!isTeacherTestRoom(roomId)) {
            // Check membership using admin client to bypass RLS recursion
            const { data: roomMembership, error: membershipError } = await supabaseAdmin
                .from('room_memberships')
                .select('room_id')
                .eq('room_id', roomId)
                .eq('student_id', user.id)
                .maybeSingle();

            if (membershipError) {
                console.error(`[API Chat GET] Error checking room membership for user ${user.id} in room ${roomId}:`, membershipError);
            }

            // Get user profile using admin client if not already available
            let userRole = user.role;
            if (!userRole) {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('role')
                    .eq('user_id', user.id)
                    .single();
                    
                userRole = profile?.role;
            }
            
            if (userRole === 'student' && !roomMembership) {
                 console.warn(`[API Chat GET] Student ${user.id} is not a member of room ${roomId}.`);
                 return NextResponse.json({ error: 'Access denied to this room\'s messages.' }, { status: 403 });
            }
        }
        
        const isStudent = user.role === 'student';
        
        // If this is a student and we have an instance ID, use that for filtering
        if (isStudent && instanceIdFilter) {
            console.log(`[API Chat GET] Using instance_id filter ${instanceIdFilter} for student ${user.id}`);
            
            // Verify this instance belongs to the student
            const { data: instance, error: instanceError } = await supabaseAdmin
                .from('student_chatbot_instances')
                .select('instance_id')
                .eq('instance_id', instanceIdFilter)
                .eq('student_id', user.id)
                .single();
                
            if (instanceError || !instance) {
                console.warn(`[API Chat GET] Invalid instance ID ${instanceIdFilter} for student ${user.id}`);
                return NextResponse.json({ error: 'Invalid chatbot instance ID' }, { status: 403 });
            }
            
            // Use instance_id to fetch student-specific messages
            let query = supabaseAdmin
                .from('chat_messages')
                .select('*')
                .eq('room_id', roomId)
                .eq('instance_id', instanceIdFilter);
                
            const { data: messages, error: messagesError } = await query.order('created_at', { ascending: true });
            
            if (messagesError) {
                console.error('[API Chat GET] Error fetching messages by instance_id:', messagesError);
                return NextResponse.json({ error: messagesError.message }, { status: 500 });
            }
            
            console.log(`[API Chat GET] Fetched ${messages?.length || 0} messages for instance ${instanceIdFilter}`);
            return NextResponse.json(messages || []);
        } else {
            // Use admin client to fetch messages to bypass RLS policies
            let query = supabaseAdmin
                .from('chat_messages')
                .select('*')
                .eq('room_id', roomId);
                
            if (isStudent && chatbotIdFilter) {
                // For students, we need to isolate their messages by user_id and chatbot_id
                // Try to find an instance for this student and chatbot
                const { data: instanceData, error: instanceError } = await supabaseAdmin
                    .from('student_chatbot_instances')
                    .select('instance_id')
                    .eq('student_id', user.id)
                    .eq('room_id', roomId)
                    .eq('chatbot_id', chatbotIdFilter)
                    .single();
                    
                if (!instanceError && instanceData?.instance_id) {
                    console.log(`[API Chat GET] Using student instance ${instanceData.instance_id} for filtering`);
                    
                    // If we have an instance, use it for the most precise filtering
                    query = query.eq('instance_id', instanceData.instance_id);
                } else {
                    console.log(`[API Chat GET] No instance found, using fallback filtering for student ${user.id}`);
                    
                    // Fallback: use the traditional filtering method with improved isolation
                    // This is crucial! Instead of AND, use OR with proper conditions to isolate student messages
                    query = query
                        .or(`user_id.eq.${user.id},role.eq.assistant,role.eq.system`)
                        .filter('metadata->>chatbotId', 'eq', chatbotIdFilter)
                        .or(`role.neq.user,user_id.eq.${user.id}`); // Get all assistant messages and only this user's messages
                }
            } else {
                // For teachers or if instance wasn't found, use standard filtering
                query = query
                    .or(`user_id.eq.${user.id},role.eq.assistant,role.eq.system`);
                    
                if (chatbotIdFilter) {
                    query = query.filter('metadata->>chatbotId', 'eq', chatbotIdFilter);
                }
            }
    
            const { data: messages, error: messagesError } = await query.order('created_at', { ascending: true });
    
            if (messagesError) {
                console.error('[API Chat GET] Error fetching messages:', messagesError);
                return NextResponse.json({ error: messagesError.message }, { status: 500 });
            }
            console.log(`[API Chat GET] Fetched ${messages?.length || 0} messages for room ${roomId}, user ${user.id}, chatbot ${chatbotIdFilter || 'any'}`);
            return NextResponse.json(messages || []);
        }
    } catch (error) {
        console.error('[API Chat GET] General error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
    }
}


// --- POST Handler ---
export async function POST(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/');
    const roomId = segments.length > 0 ? segments[segments.length - 1] : null;
    if (!roomId) return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });

    // Check for direct access headers from API
    const directAccessKey = request.headers.get('x-direct-access-admin-key');
    const bypassUserId = request.headers.get('x-bypass-auth-user-id');
    let user;
    
    // Always use admin client to bypass RLS policies
    const supabaseAdmin = createAdminClient();
    
    if (directAccessKey && bypassUserId && directAccessKey === (process.env.DIRECT_ACCESS_ADMIN_KEY || 'directaccess_key')) {
      console.log(`[API Chat POST] Using bypassed auth for user: ${bypassUserId}`);
      user = { id: bypassUserId };
    } else {
      // Standard authentication
      const supabase = await createServerSupabaseClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
      user = authUser;
    }

    // Get user profile with admin client to bypass RLS - include country_code
    const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role, country_code')
        .eq('user_id', user.id)
        .single();
    if (profileError || !userProfile) { return NextResponse.json({ error: 'User profile not found' }, { status: 403 }); }
    
    // For debugging country code issues
    console.log(`[API Chat POST] User profile country code for ${user.id}: "${userProfile.country_code || 'null'}"`);

    const isStudent = userProfile.role === 'student';
    const isTeacher = userProfile.role === 'teacher';

    const { content, chatbot_id, instance_id, model: requestedModel } = await request.json();
    const trimmedContent = content?.trim();
    if (!trimmedContent || typeof trimmedContent !== 'string') return NextResponse.json({ error: 'Invalid message content' }, { status: 400 });
    if (!chatbot_id) return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
    
    // Extra logging for instance ID debugging
    console.log(`[API Chat POST] Request data:
      - user_id: ${user.id}
      - role: ${userProfile.role}
      - chatbot_id: ${chatbot_id}
      - instance_id: ${instance_id || 'not provided'}
      - room_id: ${roomId}
    `);

    // Check for instance_id if user is a student
    let studentChatbotInstanceId = instance_id;
    if (isStudent && !studentChatbotInstanceId) {
      // Try to get the instance_id for this student and chatbot
      const { data: instanceData, error: instanceError } = await supabaseAdmin
        .from('student_chatbot_instances')
        .select('instance_id')
        .eq('student_id', user.id)
        .eq('chatbot_id', chatbot_id)
        .eq('room_id', roomId)
        .single();
        
      if (instanceError || !instanceData) {
        console.warn(`[API Chat POST] Error finding chatbot instance for student ${user.id}, chatbot ${chatbot_id}, room ${roomId}:`, instanceError?.message);
        
        // Create a new instance on-the-fly
        const { data: newInstance, error: createError } = await supabaseAdmin
          .from('student_chatbot_instances')
          .insert({
            student_id: user.id,
            chatbot_id: chatbot_id,
            room_id: roomId
          })
          .select('instance_id')
          .single();
          
        if (createError || !newInstance) {
          console.error(`[API Chat POST] Error creating chatbot instance:`, createError?.message);
          return NextResponse.json({ error: 'Failed to create student chatbot instance.' }, { status: 500 });
        }
        
        studentChatbotInstanceId = newInstance.instance_id;
        console.log(`[API Chat POST] Created new chatbot instance ${studentChatbotInstanceId} for student ${user.id}`);
      } else {
        studentChatbotInstanceId = instanceData.instance_id;
        console.log(`[API Chat POST] Found existing chatbot instance ${studentChatbotInstanceId} for student ${user.id}`);
      }
    }

    // Use admin client for chatbot config
    const { data: chatbotConfig, error: chatbotFetchError } = await supabaseAdmin
        .from('chatbots')
        .select('system_prompt, model, temperature, max_tokens, enable_rag, bot_type, assessment_criteria_text, welcome_message, teacher_id, name')
        .eq('chatbot_id', chatbot_id)
        .single();

    if (chatbotFetchError || !chatbotConfig) {
        console.warn(`[API Chat POST] Error fetching chatbot ${chatbot_id} config:`, chatbotFetchError?.message);
        return NextResponse.json({ error: 'Chatbot configuration not found.' }, { status: 404 });
    }

    let roomForSafetyCheck: Room | null = null;
    let teacherCountryCode: string | null = null;

    if (!isTeacherTestRoom(roomId)) {
        // Use admin client for room data
        const { data: roomData, error: roomFetchError } = await supabaseAdmin
            .from('rooms')
            .select('room_id, teacher_id, room_name, school_id')
            .eq('room_id', roomId)
            .single();
        if (roomFetchError || !roomData) {
            console.error("[API Chat POST] Room fetch error for non-test room:", roomFetchError);
            return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 });
        }
        roomForSafetyCheck = roomData as Room; // Cast is safe here due to checks

        if (roomData.teacher_id) {
            console.log(`[SafetyDiagnostics] ===== TEACHER PROFILE RETRIEVAL TRACKING =====`);
            console.log(`[SafetyDiagnostics] Looking up teacher profile for teacher_id: ${roomData.teacher_id}`);
            
            // Get this specific teacher's profile
            const { data: roomTeacherProfile, error: roomTeacherProfileError } = await supabaseAdmin
                .from('profiles')
                .select('country_code, role, email')
                .eq('user_id', roomData.teacher_id)
                .single();
                
            if (roomTeacherProfileError) {
                console.error(`[SafetyDiagnostics] ERROR fetching teacher profile: ${roomTeacherProfileError.message}`);
                console.warn(`[API Chat POST] Error fetching teacher profile for room's teacher (${roomData.teacher_id}) using admin client:`, roomTeacherProfileError.message);
            } else if (roomTeacherProfile) {
                // Get the country code from the profile and validate it
                console.log(`[SafetyDiagnostics] Teacher profile found. Raw country_code value: "${roomTeacherProfile.country_code}"`);
                console.log(`[SafetyDiagnostics] Teacher profile country_code type: ${typeof roomTeacherProfile.country_code}`);
                
                // Validate and normalize the country code
                const rawCountryCode = roomTeacherProfile.country_code;
                if (rawCountryCode && typeof rawCountryCode === 'string' && rawCountryCode.trim() !== '') {
                    // Convert to uppercase for consistency
                    teacherCountryCode = rawCountryCode.trim().toUpperCase();
                    // Special case handling: convert UK to GB as that's the ISO standard
                    if (teacherCountryCode === 'UK') {
                        teacherCountryCode = 'GB';
                        console.log(`[SafetyDiagnostics] Converted UK to GB for ISO standard`);
                    }
                    console.log(`[SafetyDiagnostics] Set normalized teacherCountryCode to: "${teacherCountryCode}"`);
                } else {
                    // If no valid country code, use null which will result in DEFAULT helplines
                    teacherCountryCode = null;
                    console.warn(`[SafetyDiagnostics] No valid country code found, using null (will fallback to DEFAULT)`);
                }
                
                console.log(`[API Chat POST] Teacher country code for room ${roomId}: "${teacherCountryCode || 'null'}" (Teacher ID: ${roomData.teacher_id})`);
            } else {
                console.error(`[SafetyDiagnostics] No teacher profile found for teacher_id: ${roomData.teacher_id}`);
                console.warn(`[API Chat POST] Teacher profile not found for teacher ${roomData.teacher_id}`);
            }
            console.log(`[SafetyDiagnostics] ===== END TRACKING =====`);
        } else {
            console.warn(`[API Chat POST] Room ${roomId} has no teacher_id set`);
        }
    } else if (isTeacherTestRoom(roomId)) {
        if (!isTeacher) {
            return NextResponse.json({ error: 'Not authorized for this test room' }, { status: 403 });
        }
        roomForSafetyCheck = { // This creates a non-null Room object
            room_id: roomId,
            teacher_id: chatbotConfig.teacher_id,
            room_name: `Test Room for ${chatbotConfig.name || 'Chatbot'}`,
            room_code: 'TEACHER_TEST',
            is_active: true,
            created_at: new Date().toISOString(),
        };
        const { data: designatedTeacherProfile, error: designatedTeacherProfileError } = await supabaseAdmin
            .from('profiles')
            .select('country_code, email, role')
            .eq('user_id', chatbotConfig.teacher_id)
            .single();
            
        if (designatedTeacherProfileError) {
            console.warn(`[API Chat POST] Error fetching designated teacher profile for chatbot (${chatbotConfig.teacher_id}) for test room:`, designatedTeacherProfileError.message);
        } else if (designatedTeacherProfile) {
            // Get and validate the country code from the profile
            console.log(`[SafetyDiagnostics] ===== TEST ROOM COUNTRY CODE TRACKING =====`);
            console.log(`[SafetyDiagnostics] Raw country_code from test room teacher: "${designatedTeacherProfile.country_code}"`);
            
            // Validate and normalize the country code
            const rawCountryCode = designatedTeacherProfile.country_code;
            if (rawCountryCode && typeof rawCountryCode === 'string' && rawCountryCode.trim() !== '') {
                // Convert to uppercase for consistency
                teacherCountryCode = rawCountryCode.trim().toUpperCase();
                // Special case handling: convert UK to GB as that's the ISO standard
                if (teacherCountryCode === 'UK') {
                    teacherCountryCode = 'GB';
                    console.log(`[SafetyDiagnostics] Converted UK to GB for ISO standard in test room`);
                }
                console.log(`[SafetyDiagnostics] Set normalized teacherCountryCode to: "${teacherCountryCode}" for test room`);
            } else {
                // If no valid country code, use null which will result in DEFAULT helplines
                teacherCountryCode = null;
                console.warn(`[SafetyDiagnostics] No valid country code found for test room, using null (will fallback to DEFAULT)`);
            }
            
            console.log(`[API Chat POST] Teacher country code for test room: "${teacherCountryCode || 'null'}" (Teacher ID: ${chatbotConfig.teacher_id})`);
            console.log(`[SafetyDiagnostics] ===== END TRACKING =====`);
        } else {
            console.warn(`[API Chat POST] Teacher profile not found for test room teacher ${chatbotConfig.teacher_id}`);
        }
    }
    // Enhanced debugging for country code and safety system
    console.log(`[API Chat POST] ========= SAFETY SYSTEM PARAMS =========`);
    console.log(`[API Chat POST] Determined teacherCountryCode: "${teacherCountryCode}"`);
    console.log(`[API Chat POST] Teacher profile country_code: "${userProfile.country_code}"`);
    console.log(`[API Chat POST] Country code type: ${typeof teacherCountryCode}`);
    console.log(`[API Chat POST] Initial concern check: ${initialConcernCheck(trimmedContent).hasConcern}`);
    console.log(`[API Chat POST] Concern type: ${initialConcernCheck(trimmedContent).concernType}`); 
    console.log(`[API Chat POST] isStudent: ${isStudent}`);
    console.log(`[API Chat POST] roomId: ${roomId}`);
    console.log(`[API Chat POST] ===========================================`);

    const userMessageToStore: Omit<ChatMessage, 'message_id' | 'created_at' | 'updated_at'> & { metadata: { chatbotId: string }, instance_id?: string } = {
      room_id: roomId, 
      user_id: user.id, 
      role: 'user' as const, 
      content: trimmedContent, 
      metadata: { chatbotId: chatbot_id }
    };
    
    // Add the instance_id for students
    if (isStudent && studentChatbotInstanceId) {
      userMessageToStore.instance_id = studentChatbotInstanceId;
    }
    
    // Use admin client to store message
    const { data: savedUserMessageData, error: userMessageError } = await supabaseAdmin
        .from('chat_messages')
        .insert(userMessageToStore)
        .select('message_id, created_at')
        .single();
    
    if (userMessageError || !savedUserMessageData || !savedUserMessageData.message_id) { 
        console.error('Error storing user message or message_id missing:', userMessageError, savedUserMessageData); 
        return NextResponse.json({ error: 'Failed to store message or retrieve its ID' }, { status: 500 }); 
    }
    
    const currentMessageId: string = savedUserMessageData.message_id; 
    const userMessageCreatedAt = savedUserMessageData.created_at;

    // --- MODIFIED SAFETY CHECK AND MAIN LLM CALL FLOW ---
    const { hasConcern: initialHasConcern, concernType: initialConcernType } = initialConcernCheck(trimmedContent);

    // Condition for triggering safety check AND bypassing main LLM
    // Now we explicitly check if roomForSafetyCheck is not null before using it.
    const triggerSafetyOverride = isStudent &&
                                  initialHasConcern &&
                                  initialConcernType &&
                                  roomForSafetyCheck !== null && // Explicit null check
                                  !isTeacherTestRoom(roomId);

    if (triggerSafetyOverride) {
        console.log(`[API Chat POST] Initial concern detected: ${initialConcernType}. Prioritizing safety response. Bypassing main LLM.`);
        console.log(`[API Chat POST] Country code being passed to safety check: "${teacherCountryCode}"`);
        // Since roomForSafetyCheck is checked for non-null in triggerSafetyOverride,
        // TypeScript knows it's a 'Room' here.
        // Special debug logging to trace the country code issue
        console.log(`[SafetyDiagnostics] ===== ROUTE.TS SAFETY CHECK TRACKING =====`);
        console.log(`[SafetyDiagnostics] API route preparing to call checkMessageSafety`);
        console.log(`[SafetyDiagnostics] roomId: ${roomId}`);
        console.log(`[SafetyDiagnostics] teacherId: ${roomForSafetyCheck!.teacher_id}`);
        console.log(`[SafetyDiagnostics] teacherCountryCode: "${teacherCountryCode}"`);
        console.log(`[SafetyDiagnostics] teacherCountryCode type: ${typeof teacherCountryCode}`);
        console.log(`[SafetyDiagnostics] messageId: ${currentMessageId}`);
        console.log(`[SafetyDiagnostics] studentId: ${user.id}`);
        console.log(`[SafetyDiagnostics] chatbotId: ${chatbot_id}`);
        console.log(`[SafetyDiagnostics] initialConcernType: ${initialConcernType}`);
        console.log(`[SafetyDiagnostics] ===== END TRACKING =====`);
        
        // We're now passing the actual teacher country code instead of forcing it
        console.log(`[API Chat POST] Using actual teacher country code: "${teacherCountryCode}"`);
        
        // Add additional logging right before the call for detailed debugging
        console.log(`[SafetyDiagnostics] ========= SAFETY CALL PARAMETERS =========`);
        console.log(`[SafetyDiagnostics] FINAL CHECK - About to call checkMessageSafety with:`);
        console.log(`[SafetyDiagnostics] - countryCode: "${teacherCountryCode}" (${typeof teacherCountryCode})`);
        console.log(`[SafetyDiagnostics] - roomId: ${roomForSafetyCheck!.room_id}`);
        console.log(`[SafetyDiagnostics] - teacherId: ${roomForSafetyCheck!.teacher_id}`);
        console.log(`[SafetyDiagnostics] - messageId: ${currentMessageId}`);
        console.log(`[SafetyDiagnostics] - studentId: ${user.id}`);
        console.log(`[SafetyDiagnostics] - messageContentLength: ${trimmedContent.length}`);
        console.log(`[SafetyDiagnostics] - original countryCode from profile: "${userProfile.country_code}"`);
        console.log(`[SafetyDiagnostics] ===========================================`);
        
        // For the UK case specifically, ensure we're sending the correct code
        let finalCountryCode = teacherCountryCode;
        if (userProfile.country_code === 'UK') {
            console.log(`[SafetyDiagnostics] Original country code is UK, ensuring we use GB for ISO standard`);
            finalCountryCode = 'GB';
        }
        
        // Call the safety system with the properly processed country code
        checkMessageSafety(supabaseAdmin, trimmedContent, currentMessageId, user.id, roomForSafetyCheck!, finalCountryCode)
            .catch(safetyError => console.error(`[Safety Check Background Error] for message ${currentMessageId}:`, safetyError));

        return NextResponse.json({
            type: "safety_intervention_triggered",
            message: "Your message is being reviewed for safety. Relevant guidance will appear shortly."
        });
    }
    console.log(`[API Chat POST] No safety override. Proceeding with regular chat/assessment flow. isStudent: ${isStudent}, initialHasConcern: ${initialHasConcern}, isTeacherTestRoom: ${isTeacherTestRoom(roomId)}`);
    // --- END OF MODIFIED SAFETY CHECK AND MAIN LLM CALL FLOW ---

    if (isStudent && chatbotConfig.bot_type === 'assessment' && trimmedContent.toLowerCase() === ASSESSMENT_TRIGGER_COMMAND) {
        console.log(`[API Chat POST] Assessment trigger detected for student ${user.id}, bot ${chatbot_id}, room ${roomId}.`);
        // Use admin client for message IDs
        const { data: contextMessagesForAssessment, error: contextMsgsError } = await supabaseAdmin
            .from('chat_messages')
            .select('message_id')
            .eq('room_id', roomId)
            .eq('user_id', user.id)
            .eq('metadata->>chatbotId', chatbot_id)
            .lt('created_at', userMessageCreatedAt)
            .order('created_at', { ascending: false })
            .limit(ASSESSMENT_CONTEXT_MESSAGE_COUNT * 2 + 5);
        if (contextMsgsError) {
            console.error(`[API Chat POST] Error fetching message IDs for assessment context: ${contextMsgsError.message}`);
        }
        const messageIdsToAssess = (contextMessagesForAssessment || []).map(m => m.message_id).reverse();
        const assessmentPayload = { student_id: user.id, chatbot_id: chatbot_id, room_id: roomId, message_ids_to_assess: messageIdsToAssess };
        console.log(`[API Chat POST] Asynchronously calling /api/assessment/process.`);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
        fetch(`${baseUrl}/api/assessment/process`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assessmentPayload),
        }).catch(fetchError => console.error(`[API Chat POST] Error calling /api/assessment/process internally:`, fetchError));
        return NextResponse.json({ type: "assessment_pending", message: "Your responses are being submitted for assessment. Feedback will appear here shortly." });
    }

    // --- MAIN LLM CALL (Only if not handled by safety override or assessment trigger) ---
    // Use admin client for context messages
    const { data: contextMessagesData, error: contextError } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content').eq('room_id', roomId).eq('user_id', user.id)
      .filter('metadata->>chatbotId', 'eq', chatbot_id)
      .neq('message_id', currentMessageId)
      .order('created_at', { ascending: false }).limit(5);
    if (contextError) console.warn("Error fetching context messages:", contextError.message);
    const contextMessages = (contextMessagesData || []).map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content || '' }));

    const teacherSystemPrompt = chatbotConfig.system_prompt || "You are a safe, ethical, and supportive AI learning assistant for students. Your primary goal is to help students understand educational topics in an engaging and age-appropriate manner.";

    const {
        model: modelToUseFromConfig = 'openai/gpt-4.1-nano',
        temperature: temperatureToUse = 0.7,
        max_tokens: maxTokensToUse = 1000,
        enable_rag: enableRagFromConfig = false
    } = chatbotConfig;

    const finalModelToUse = requestedModel || modelToUseFromConfig;

    let ragContextText = '';
    if (enableRagFromConfig && chatbotConfig.bot_type === 'learning') {
        try {
            const queryEmbedding = await generateEmbedding(trimmedContent);
            const searchResults = await queryVectors(queryEmbedding, chatbot_id, 3);
            if (searchResults && searchResults.length > 0) {
                ragContextText = "\n\nRelevant information from knowledge base:\n";
                searchResults.forEach((result) => {
                    if (result.metadata?.text) {
                        const fileName = typeof result.metadata.fileName === 'string' ? result.metadata.fileName : 'document';
                        const chunkText = String(result.metadata.text).substring(0, 500);
                        ragContextText += `\nFrom document "${fileName}":\n${chunkText}\n`;
                    }
                });
            }
        } catch (ragError) { console.warn(`[RAG] Error:`, ragError); }
    }

    let regionalInstruction = '';
    if (teacherCountryCode === 'GB' || teacherCountryCode === 'AE') {
        regionalInstruction = " Please use British English spelling (e.g., 'colour', 'analyse').";
    } else if (teacherCountryCode === 'AU') {
        regionalInstruction = " Please use Australian English spelling.";
    } else if (teacherCountryCode === 'CA') {
        regionalInstruction = " Please use Canadian English spelling.";
    } else if (teacherCountryCode === 'MY') {
        regionalInstruction = " Please respond appropriately for a Malaysian context if relevant, using standard English.";
    }

    const CORE_SAFETY_INSTRUCTIONS = `
SAFETY OVERRIDE: The following are non-negotiable rules for your responses.
- You are an AI assistant interacting with students. All interactions must be strictly age-appropriate, safe, and ethical.
- NEVER generate responses that are sexually explicit, suggestive, or exploit, abuse, or endanger children.
- NEVER engage in discussions about graphic violence, hate speech, illegal activities, or self-harm promotion.
- NEVER ask for or store personally identifiable information (PII) from students, such as full names (beyond a first name if offered by the student in conversation), exact age, home address, phone number, email, specific school name, or social media details.
- If a student's query is ambiguous or could lead to an inappropriate response, err on the side of caution and provide a generic, safe, educational answer or politely decline to answer if the topic is clearly out of scope or unsafe.
- If a student expresses direct intent for self-harm or mentions ongoing abuse, the system has separate alerts, but your immediate response should be brief, empathetic, and guide them to seek help from a trusted adult without engaging in therapeutic conversation.
- These safety rules override any conflicting instructions in the user-provided prompt below.
--- END OF SAFETY OVERRIDE ---
`;

    const systemPromptForLLM = `${CORE_SAFETY_INSTRUCTIONS}\n\nTeacher's Prompt:\n${teacherSystemPrompt}${regionalInstruction}${ragContextText ? `\n\nRelevant Information:\n${ragContextText}\n\nBase your answer on the provided information. Do not explicitly mention "Source:" or bracketed numbers like [1], [2] in your response.` : ''}`;

    console.log(`[API Chat POST] Final System Prompt (first 500 chars): ${systemPromptForLLM.substring(0,500)}...`);

    const messagesForAPI = [ { role: 'system', content: systemPromptForLLM }, ...contextMessages.reverse(), { role: 'user', content: trimmedContent } ];

    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
        method: 'POST', headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.OPENROUTER_SITE_URL || 'http://localhost:3000', 'X-Title': 'ClassBots AI', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: finalModelToUse, messages: messagesForAPI, temperature: temperatureToUse, max_tokens: maxTokensToUse, stream: true }),
    });

    if (!openRouterResponse.ok || !openRouterResponse.body) {
        const errorBody = await openRouterResponse.text(); console.error(`OpenRouter Error: Status ${openRouterResponse.status}`, errorBody);
        let errorMessage = `Failed to get AI response (status: ${openRouterResponse.status})`;
        try { const errorJson = JSON.parse(errorBody); errorMessage = errorJson.error?.message || errorMessage; } catch {}
        throw new Error(errorMessage);
    }

    let fullResponseContent = ''; const encoder = new TextEncoder(); let assistantMessageId: string | null = null;
    const stream = new ReadableStream({
        async start(controller) {
            const reader = openRouterResponse.body!.getReader(); const decoder = new TextDecoder();
            try {
                // Create a placeholder message for the assistant's response to update as we stream
                console.log('[API POST /chat/[roomId]] Creating assistant message placeholder');
                const messageData: any = { 
                  room_id: roomId, 
                  user_id: user.id, 
                  role: 'assistant', 
                  content: '', 
                  metadata: { 
                    chatbotId: chatbot_id,
                    isStreaming: true 
                  }
                };
                
                // Add the instance_id for students
                if (isStudent && studentChatbotInstanceId) {
                  messageData.instance_id = studentChatbotInstanceId;
                }
                
                const { data: initData, error: initError } = await supabaseAdmin
                    .from('chat_messages')
                    .insert(messageData)
                    .select('message_id').single();
                
                if (initError || !initData) {
                  console.error('[API POST /chat/[roomId]] Error creating placeholder assistant message:', initError);
                } else {
                  console.log(`[API POST /chat/[roomId]] Created placeholder message with ID: ${initData.message_id}`);
                  assistantMessageId = initData.message_id;
                }

                while (true) {
                    const { done, value } = await reader.read(); 
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true }); 
                    const lines = chunk.split('\n').filter(l => l.trim().startsWith('data:'));
                    
                    for (const line of lines) {
                        const dataContent = line.substring(6).trim(); 
                        if (dataContent === '[DONE]') continue;
                        
                        try { 
                            const parsed = JSON.parse(dataContent);
                            const piece = parsed.choices?.[0]?.delta?.content; 
                            
                            if (typeof piece === 'string') { 
                                fullResponseContent += piece; 
                                
                                // Update the message in the database periodically
                                // This helps with long responses
                                if (assistantMessageId && fullResponseContent.length % 200 === 0) {
                                    try {
                                        // Execute background update without awaiting
                                        (async () => {
                                            try {
                                                const { error } = await supabaseAdmin
                                                    .from('chat_messages')
                                                    .update({ 
                                                        content: fullResponseContent,
                                                        updated_at: new Date().toISOString()
                                                    })
                                                    .eq('message_id', assistantMessageId);
                                                    
                                                if (error) {
                                                    console.warn('[API POST /chat/[roomId]] Stream interim update error:', error);
                                                }
                                            } catch (dbError) {
                                                console.warn('[API POST /chat/[roomId]] Stream interim update exception:', dbError);
                                            }
                                        })(); // Execute IIFE without awaiting
                                    } catch (updateError) {
                                        console.warn('[API POST /chat/[roomId]] Error during interim update:', updateError);
                                    }
                                }
                                
                                // Try to enqueue data for streaming to client
                                try {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: piece })}\n\n`));
                                } catch (enqueueError) {
                                    console.warn('[API POST /chat/[roomId]] Controller enqueue error:', enqueueError);
                                    // Just continue with response collection even if streaming fails
                                }
                            } 
                        }
                        catch (parseError) { 
                            console.warn('[API POST /chat/[roomId]] Stream parse error:', parseError, "Data:", dataContent); 
                        }
                    }
                }
            } catch (streamError) { 
                console.error('Stream error:', streamError); 
                // Try to send error
                try {
                    controller.error(streamError);
                } catch (controllerError) {
                    console.warn('Controller error while handling stream error:', controllerError);
                }
            }
            finally {
                // Clean up the final content
                let finalContent = fullResponseContent.trim();
                // Remove citation patterns
                finalContent = finalContent.replace(/\s*Source:\s*\[\d+\]\s*$/gm, '').trim();
                finalContent = finalContent.replace(/\s*\[\d+\]\s*$/gm, '').trim();
                // Normalize whitespace
                finalContent = finalContent.replace(/(\r\n|\n|\r){2,}/gm, '$1').replace(/ +/g, ' ');

                console.log(`[API POST /chat/[roomId]] Stream complete. Final content length: ${finalContent.length}`);
                
                if (assistantMessageId && finalContent) {
                    // Use admin client to update the final message with streaming flag removed
                    console.log(`[API POST /chat/[roomId]] Updating final message content for ID: ${assistantMessageId}`);
                    
                    try {
                        const updateData: any = { 
                            content: finalContent, 
                            updated_at: new Date().toISOString(),
                            metadata: { 
                                chatbotId: chatbot_id,
                                isStreaming: false 
                            }
                        };
                        
                        // We don't need to update instance_id as it was set during creation
                        
                        const { error: updateError } = await supabaseAdmin
                            .from('chat_messages')
                            .update(updateData)
                            .eq('message_id', assistantMessageId);
                            
                        if (updateError) {
                            console.error(`[API POST /chat/[roomId]] Error updating assistant message ${assistantMessageId}:`, updateError);
                        } else {
                            console.log(`[API POST /chat/[roomId]] Assistant message ${assistantMessageId} updated with final content.`);
                        }
                    } catch (finalUpdateError) {
                        console.error(`[API POST /chat/[roomId]] Exception during final message update:`, finalUpdateError);
                    }
                } else if (!assistantMessageId && finalContent) {
                    // Fallback if the placeholder message creation failed
                    console.warn("[API POST /chat/[roomId]] Fallback: Assistant message placeholder not created, inserting full message.");
                    
                    try {
                        const fallbackMessageData: any = { 
                            room_id: roomId, 
                            user_id: user.id, 
                            role: 'assistant', 
                            content: finalContent, 
                            metadata: { chatbotId: chatbot_id } 
                        };
                        
                        // Add the instance_id for students
                        if (isStudent && studentChatbotInstanceId) {
                            fallbackMessageData.instance_id = studentChatbotInstanceId;
                        }
                        
                        const { error: insertError } = await supabaseAdmin
                            .from('chat_messages')
                            .insert(fallbackMessageData);
                            
                        if (insertError) {
                            console.error(`[API POST /chat/[roomId]] Error inserting fallback assistant message:`, insertError);
                        } else {
                            console.log(`[API POST /chat/[roomId]] Fallback assistant message inserted successfully.`);
                        }
                    } catch (fallbackInsertError) {
                        console.error(`[API POST /chat/[roomId]] Exception during fallback message insert:`, fallbackInsertError);
                    }
                }
                
                // Attempt to close the stream controller
                try {
                    controller.close();
                    console.log("[API POST /chat/[roomId]] Server stream closed successfully.");
                } catch (closeError) {
                    console.warn("[API POST /chat/[roomId]] Error while closing controller:", closeError);
                }
            }
        }
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Content-Type-Options': 'nosniff' } });
    // --- END OF MAIN LLM CALL ---

  } catch (error) {
      console.error('Error in POST /api/chat/[roomId]:', error);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process message' }, { status: 500 });
  }
}