// src/app/api/chat/[roomId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateEmbedding } from '@/lib/openai/embeddings';
import { queryVectors } from '@/lib/pinecone/utils';
import { checkMessageSafety, initialConcernCheck } from '@/lib/safety/monitoring';
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from '@/lib/utils/api-responses';
import type { ChatMessage, Room } from '@/types/database.types';
import { filterMessageContent, isUserUnder13, getUnder13SystemPrompt, logFilteredContent } from '@/lib/safety/content-filter';
import { moderateContent } from '@/lib/safety/ai-moderation';
import { getKindFilterMessage, getKindModerationMessage } from '@/lib/safety/kind-messages';

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

        if (!roomId) return createErrorResponse('Room ID is required', 400, ErrorCodes.VALIDATION_ERROR);

        // Check for direct access headers from API
        const directAccessKey = request.headers.get('x-direct-access-admin-key');
        const bypassUserId = request.headers.get('x-bypass-auth-user-id');
        let user;

        // Always use the admin client to bypass RLS policies
        const supabaseAdmin = createAdminClient();

        if (directAccessKey && bypassUserId && directAccessKey === (process.env.DIRECT_ACCESS_ADMIN_KEY || 'directaccess_key')) {
            console.log(`[API Chat GET] Using bypassed auth for user: ${bypassUserId}`);
            // Use admin client to verify the user exists - check both profile tables
            const { data: studentProfile } = await supabaseAdmin
                .from('student_profiles')
                .select('user_id')
                .eq('user_id', bypassUserId)
                .maybeSingle();
                
            if (studentProfile) {
                user = { id: bypassUserId, role: 'student' };
            } else {
                // Check teacher_profiles if not a student
                const { data: teacherProfile } = await supabaseAdmin
                    .from('teacher_profiles')
                    .select('user_id')
                    .eq('user_id', bypassUserId)
                    .maybeSingle();
                    
                if (teacherProfile) {
                    user = { id: bypassUserId, role: 'teacher' };
                } else {
                    console.error(`[API Chat GET] User ${bypassUserId} not found in student_profiles or teacher_profiles`);
                    return createErrorResponse('Invalid bypass user ID', 401, ErrorCodes.UNAUTHORIZED);
                }
            }
        } else {
            // Standard authentication
            const supabase = await createServerSupabaseClient();
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
            if (authError || !authUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
            
            // Get user profile with admin client to ensure we have the role
            const { data: studentProfile } = await supabaseAdmin
                .from('student_profiles')
                .select('user_id')
                .eq('user_id', authUser.id)
                .single();
                
            if (studentProfile) {
                user = { ...authUser, role: 'student' };
            } else {
                const { data: teacherProfile } = await supabaseAdmin
                    .from('teacher_profiles')
                    .select('user_id')
                    .eq('user_id', authUser.id)
                    .single();
                    
                user = { ...authUser, role: teacherProfile ? 'teacher' : undefined };
            }
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
                const { data: studentProfile } = await supabaseAdmin
                    .from('student_profiles')
                    .select('user_id')
                    .eq('user_id', user.id)
                    .single();
                    
                if (studentProfile) {
                    userRole = 'student';
                } else {
                    const { data: teacherProfile } = await supabaseAdmin
                        .from('teacher_profiles')
                        .select('user_id')
                        .eq('user_id', user.id)
                        .single();
                        
                    userRole = teacherProfile ? 'teacher' : undefined;
                }
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
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/');
  const roomId = segments.length > 0 ? segments[segments.length - 1] : null;
  
  // Declare variables at function scope for error handling
  let user: any;
  let chatbot_id: string | undefined;
  let requestCountryCode: string | undefined;
  let userProfile: any;
  
  try {
    if (!roomId) return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });

    // Check for direct access headers from API
    const directAccessKey = request.headers.get('x-direct-access-admin-key');
    const bypassUserId = request.headers.get('x-bypass-auth-user-id');
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

    // Get request body first to have access to requestCountryCode
    let content, chatbot_id, instance_id, requestedModel, requestCountryCode, debug_forward_source, provided_message_id;
    try {
      const body = await request.json();
      content = body.content;
      chatbot_id = body.chatbot_id;
      instance_id = body.instance_id;
      requestedModel = body.model;
      requestCountryCode = body.country_code;
      debug_forward_source = body.debug_forward_source;
      provided_message_id = body.message_id; // Check if message_id was provided (from direct-access)
    } catch (jsonError) {
      console.error('[API Chat POST] Error parsing request body:', jsonError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Get user profile with admin client to bypass RLS - check both profile tables
    let userProfile: any = null;
    let userRole: string | undefined;
    
    // Check student_profiles first
    const { data: studentProfile } = await supabaseAdmin
        .from('student_profiles')
        .select('user_id, country_code')
        .eq('user_id', user.id)
        .single();
        
    if (studentProfile) {
        userProfile = { ...studentProfile, role: 'student' };
        userRole = 'student';
    } else {
        // Check teacher_profiles
        const { data: teacherProfile } = await supabaseAdmin
            .from('teacher_profiles')
            .select('user_id, country_code')
            .eq('user_id', user.id)
            .single();
            
        if (teacherProfile) {
            userProfile = { ...teacherProfile, role: 'teacher' };
            userRole = 'teacher';
        } else {
            console.error(`[API Chat POST] User ${user.id} not found in student_profiles or teacher_profiles`);
            return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
        }
    }
    
    // Determine effective country code: request body takes precedence over profile
    const effectiveCountryCode = requestCountryCode || userProfile.country_code || null;
    console.log(`[API Chat POST] Country code resolution for ${user.id}:`, {
      fromRequest: requestCountryCode || 'null',
      fromProfile: userProfile.country_code || 'null', 
      effective: effectiveCountryCode || 'null'
    });

    const isStudent = userRole === 'student';
    const isTeacher = userRole === 'teacher';
    
    console.log(`[API Chat POST] Received request:`, {
      content: content?.substring(0, 30),
      requestCountryCode,
      debug_forward_source,
      hasCountryCode: !!requestCountryCode
    });
    const trimmedContent = content?.trim();
    if (!trimmedContent || typeof trimmedContent !== 'string') return NextResponse.json({ error: 'Invalid message content' }, { status: 400 });
    if (!chatbot_id) return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
    
    // Content filtering for under-13 users (assume all students need filtering for now)
    if (isStudent) {
      const filterResult = filterMessageContent(trimmedContent, true, true);
      
      if (filterResult.isBlocked) {
        console.log(`[API Chat POST] Content filtered for user ${user.id}: ${filterResult.reason}`);
        
        // Log the filtered content for compliance
        await logFilteredContent(
          user.id,
          roomId,
          trimmedContent,
          filterResult.reason || 'Unknown reason',
          supabaseAdmin
        );
        
        // Return a friendly message to the user using kind messages
        const kindMessage = getKindFilterMessage(filterResult.reason || '');
        
        // Insert a system message to show the kind message in chat
        const systemMessageId = `system-filter-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await supabaseAdmin
          .from('chat_messages')
          .insert({
            message_id: systemMessageId,
            room_id: roomId,
            user_id: user.id,
            role: 'system',
            content: kindMessage,
            created_at: new Date().toISOString(),
            metadata: {
              isSystemMessage: true,
              isContentFilterMessage: true,
              filterReason: filterResult.reason,
              chatbotId: chatbot_id
            }
          });
        
        return NextResponse.json({ 
          error: 'Message blocked', 
          message: kindMessage,
          systemMessageId: systemMessageId,
          reason: filterResult.reason 
        }, { status: 400 });
      }
    }
    
    // AI-based content moderation for inappropriate content and jailbreak attempts
    if (isStudent) {
      // First check if this might be a safety concern - we don't want to block crisis messages
      const { hasConcern: mightBeSafetyConcern } = initialConcernCheck(trimmedContent);
      
      const moderationResult = await moderateContent(trimmedContent, {
        studentId: user.id,
        roomId: roomId,
        logToDatabase: true // Automatically log flagged content
      });
      
      if (moderationResult.isFlagged) {
        console.log(`[API Chat POST] AI moderation flagged content from user ${user.id}: ${moderationResult.reason}`);
        
        // CRITICAL: If this might be a safety concern (self-harm, suicide, etc.), 
        // let it through so the safety system can provide helplines
        if (mightBeSafetyConcern && (moderationResult.categories.includes('self-harm') || 
                                     moderationResult.categories.includes('self-harm/intent') ||
                                     moderationResult.categories.includes('self-harm/instructions'))) {
          console.log(`[API Chat POST] AI moderation detected self-harm content, but allowing through for safety response`);
          // Continue processing - safety system will handle this appropriately
        } else {
          // Not a safety concern, or not self-harm related - block it
          const userMessage = getKindModerationMessage(
            moderationResult.categories, 
            moderationResult.severity, 
            moderationResult.jailbreakDetected || false
          );
          
          // Insert a system message to show the kind message in chat
          const systemMessageId = `system-moderation-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          await supabaseAdmin
            .from('chat_messages')
            .insert({
              message_id: systemMessageId,
              room_id: roomId,
              user_id: user.id,
              role: 'system',
              content: userMessage,
              created_at: new Date().toISOString(),
              metadata: {
                isSystemMessage: true,
                isAIModerationMessage: true,
                moderationCategories: moderationResult.categories,
                moderationSeverity: moderationResult.severity,
                chatbotId: chatbot_id
              }
            });
          
          return NextResponse.json({ 
            error: 'Message blocked', 
            message: userMessage,
            systemMessageId: systemMessageId,
            reason: `AI moderation: ${moderationResult.categories.join(', ')}`,
            severity: moderationResult.severity
          }, { status: 400 });
        }
      }
    }
    
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
                .from('teacher_profiles')
                .select('country_code, email')
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
            .from('teacher_profiles')
            .select('country_code, email')
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
    // Reduce excessive logging that might cause performance issues
    console.log(`[API Chat POST] Processing message in room: ${roomId}`);
    console.log(`[API Chat POST] User role: ${isStudent ? 'student' : 'teacher'}`);
    console.log(`[API Chat POST] Chatbot ID: ${chatbot_id}`);

    let currentMessageId: string;
    let userMessageCreatedAt: string;
    
    // Check if message was already saved (by direct-access route)
    if (provided_message_id && debug_forward_source === 'direct-access') {
      console.log(`[API Chat POST] Message already saved by direct-access with ID: ${provided_message_id}`);
      currentMessageId = provided_message_id;
      
      // Fetch the created_at timestamp for the existing message
      const { data: existingMessage, error: fetchError } = await supabaseAdmin
        .from('chat_messages')
        .select('created_at')
        .eq('message_id', provided_message_id)
        .single();
        
      if (fetchError || !existingMessage) {
        console.error('[API Chat POST] Error fetching existing message:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch existing message' }, { status: 500 });
      }
      
      userMessageCreatedAt = existingMessage.created_at;
    } else {
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
      
      currentMessageId = savedUserMessageData.message_id; 
      userMessageCreatedAt = savedUserMessageData.created_at;
    }

    // --- SAFETY CHECK (FOR MAIN MODEL USE) ---
    // Run initial safety keyword check
    const { hasConcern, concernType } = initialConcernCheck(trimmedContent);
    const initialHasConcern = hasConcern;
    const initialConcernType = concernType || null;
    
    console.log(`[API Chat POST] Safety check result: hasConcern=${initialHasConcern}, concernType=${initialConcernType || 'none'}`);
    
    // Simple test room detection (just keep the teacher test room check for now)
    const isTestRoom = isTeacherTestRoom(roomId);
                        
    // Process safety check if a concern is detected
    if (initialHasConcern && !isTestRoom) {
        console.log(`[API Chat POST] Safety concern detected in message: ${currentMessageId}`);
        // Get the room data for safety processing
        const { data: roomData } = await supabaseAdmin
            .from('rooms')
            .select('*')
            .eq('room_id', roomId)
            .single();
            
        if (roomData) {
            // Determine country code for safety helplines
            // Priority: 1) Request body, 2) User profile, 3) Teacher profile, 4) DEFAULT
            let countryCode = effectiveCountryCode || teacherCountryCode || 'DEFAULT';
            
            console.log(`[API Chat POST] Safety check using country code: "${countryCode}" (effective: ${effectiveCountryCode}, teacher: ${teacherCountryCode})`);
            
            // Process the message for safety concerns
            try {
                await checkMessageSafety(
                    supabaseAdmin,
                    trimmedContent,
                    currentMessageId,
                    user.id,
                    roomData,
                    countryCode
                );
                
                console.log(`[API Chat POST] Safety check invoked with country code: "${countryCode}"`);
                console.log(`[API Chat POST] Safety check processing complete for message ${currentMessageId} with country code "${countryCode}"`);
                
                // Return special response to client to indicate safety intervention
                // This triggers the safety placeholder in the UI while waiting for the safety message
                return NextResponse.json(
                  { 
                    type: "safety_intervention_triggered", 
                    message: "Safety intervention triggered. A safety message will be displayed.",
                    country_code: countryCode,
                    message_id: currentMessageId,
                    room_id: roomId,
                    user_id: user.id
                  }, 
                  { status: 200 }
                );
            } catch (safetyError) {
                console.error(`[API Chat POST] Error processing safety check:`, safetyError);
                console.error(`[API Chat POST] Safety check error details:`, {
                    errorType: safetyError?.constructor?.name,
                    errorMessage: safetyError instanceof Error ? safetyError.message : String(safetyError),
                    errorStack: safetyError instanceof Error ? safetyError.stack : 'No stack trace',
                    messageId: currentMessageId,
                    userId: user.id,
                    roomId: roomId,
                    countryCode: countryCode
                });
                // Return error response instead of continuing
                return NextResponse.json(
                    { error: 'Failed to process safety check', details: safetyError instanceof Error ? safetyError.message : 'Unknown error' },
                    { status: 500 }
                );
            }
        } else {
            console.error(`[API Chat POST] Could not find room data for safety processing: ${roomId}`);
        }
    }
    
    // --- END OF MODIFIED SAFETY CHECK AND MAIN LLM CALL FLOW ---

    if (isStudent && chatbotConfig.bot_type === 'assessment' && trimmedContent.toLowerCase() === ASSESSMENT_TRIGGER_COMMAND) {
        console.log(`[API Chat POST] Assessment trigger detected for student ${user.id}, bot ${chatbot_id}, room ${roomId}.`);
        console.log(`[API Chat POST] Student chatbot instance ID: ${studentChatbotInstanceId || 'not set'}`);
        console.log(`[API Chat POST] Message saved with ID: ${currentMessageId}`);
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
        console.log(`[API Chat POST] Found ${messageIdsToAssess.length} messages to assess for student ${user.id}`);
        const assessmentPayload = { student_id: user.id, chatbot_id: chatbot_id, room_id: roomId, message_ids_to_assess: messageIdsToAssess };
        console.log(`[API Chat POST] Calling /api/assessment/process with improved handling.`);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
        
        // Create a more robust fetch with timeout and retries
        const callAssessmentEndpoint = async (retryCount = 0, maxRetries = 2) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 sec timeout
                
                const response = await fetch(`${baseUrl}/api/assessment/process`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-assessment-source': 'internal-trigger',
                        'x-request-id': `assess-${user.id}-${Date.now()}`
                    },
                    body: JSON.stringify(assessmentPayload),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'Unknown error');
                    throw new Error(`Assessment API error (${response.status}): ${errorText}`);
                }
                
                const result = await response.json();
                console.log(`[API Chat POST] Assessment API successfully called. Result:`, result);
                return result;
            } catch (error) {
                console.error(`[API Chat POST] Error calling assessment API (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
                
                // Retry logic
                if (retryCount < maxRetries) {
                    const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff
                    console.log(`[API Chat POST] Retrying assessment API call in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return callAssessmentEndpoint(retryCount + 1, maxRetries);
                }
                
                throw error;
            }
        };
        
        // Execute the assessment call without blocking the response
        callAssessmentEndpoint()
            .then(result => {
                console.log(`[API Chat POST] Assessment processing successful:`, result);
            })
            .catch(async (error) => {
                console.error(`[API Chat POST] Final assessment processing error:`, error);
                // Add a fallback error message to the chat
                try {
                    await supabaseAdmin
                        .from('chat_messages')
                        .insert({
                            room_id: roomId,
                            user_id: user.id,
                            role: 'system',
                            content: 'Assessment processing encountered an error. Please try again or contact your teacher if the problem persists.',
                            metadata: {
                                chatbotId: chatbot_id,
                                isAssessmentError: true,
                                errorDetails: error instanceof Error ? error.message : String(error)
                            }
                        });
                } catch (insertError) {
                    console.error(`[API Chat POST] Failed to insert error message:`, insertError);
                }
            });
        
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

    // --- MEMORY CONTEXT INJECTION ---
    let memoryContext = '';
    if (isStudent) {
      try {
        console.log(`[MEMORY] Fetching memory context for student ${user.id} and chatbot ${chatbot_id}`);
        
        // Fetch student's memories and learning profile
        const memoryUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/student/memory`);
        memoryUrl.searchParams.append('studentId', user.id);
        memoryUrl.searchParams.append('chatbotId', chatbot_id);
        memoryUrl.searchParams.append('limit', '3');
        
        const memoryResponse = await fetch(memoryUrl.toString(), {
          method: 'GET',
          headers: {
            'Cookie': request.headers.get('cookie') || '',
            'Authorization': request.headers.get('authorization') || ''
          }
        });
        
        if (memoryResponse.ok) {
          const { memories, profile } = await memoryResponse.json();
          
          if (memories && memories.length > 0) {
            memoryContext += '\n\n[Student Memory Context]\n';
            memoryContext += 'Previous conversations with this student:\n';
            
            memories.forEach((memory: any, index: number) => {
              const daysAgo = Math.floor((Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60 * 24));
              memoryContext += `\n${index + 1}. ${daysAgo} days ago:\n`;
              memoryContext += `   Summary: ${memory.conversation_summary}\n`;
              memoryContext += `   Topics: ${memory.key_topics.join(', ')}\n`;
              if (memory.learning_insights?.understood?.length > 0) {
                memoryContext += `   Understood well: ${memory.learning_insights.understood.join(', ')}\n`;
              }
              if (memory.learning_insights?.struggling?.length > 0) {
                memoryContext += `   Needs help with: ${memory.learning_insights.struggling.join(', ')}\n`;
              }
              if (memory.next_steps) {
                memoryContext += `   Suggested next steps: ${memory.next_steps}\n`;
              }
            });
          }
          
          if (profile) {
            memoryContext += '\n[Student Learning Profile]\n';
            if (profile.topics_mastered?.length > 0) {
              memoryContext += `Topics mastered: ${profile.topics_mastered.join(', ')}\n`;
            }
            if (profile.topics_in_progress?.length > 0) {
              memoryContext += `Currently learning: ${profile.topics_in_progress.join(', ')}\n`;
            }
            if (profile.topics_struggling?.length > 0) {
              memoryContext += `Struggling with: ${profile.topics_struggling.join(', ')}\n`;
            }
            if (profile.preferred_explanation_style) {
              memoryContext += `Preferred learning style: ${profile.preferred_explanation_style}\n`;
            }
            if (profile.pace_preference) {
              memoryContext += `Learning pace: ${profile.pace_preference}\n`;
            }
          }
          
          if (memoryContext) {
            memoryContext += '\nUse this context to personalize your responses and build on previous conversations.\n';
            console.log(`[MEMORY] Successfully loaded memory context (${memoryContext.length} chars)`);
          }
        }
      } catch (memoryError) {
        console.error('[MEMORY] Error fetching memory context:', memoryError);
        // Continue without memory context
      }
    }

    // Get teacher system prompt from the chatbot config or use default
    // This is a critical part of the system - make sure we always have a valid system prompt
    const defaultSystemPrompt = "You are a safe, ethical, and supportive AI learning assistant for students. Your primary goal is to help students understand educational topics in an engaging and age-appropriate manner.";
    
    // Ensure we have a system prompt even if the database field is null/empty
    let teacherSystemPrompt = (chatbotConfig.system_prompt && chatbotConfig.system_prompt.trim() !== '') 
        ? chatbotConfig.system_prompt 
        : defaultSystemPrompt;
    
    // Log the system prompt status
    if (chatbotConfig.system_prompt && chatbotConfig.system_prompt.trim() !== '') {
        console.log(`[PROMPT] Using custom teacher system prompt (${chatbotConfig.system_prompt.length} chars) for chatbot ${chatbot_id}`);
        console.log(`[PROMPT] Preview: "${chatbotConfig.system_prompt.substring(0, 100)}${chatbotConfig.system_prompt.length > 100 ? '...' : ''}"`);
    } else {
        console.log(`[PROMPT] No custom system prompt found for chatbot ${chatbot_id}, using default`);
    }
    
    // FORCE CHECK: Make sure we actually have a system prompt at this point
    if (!teacherSystemPrompt || teacherSystemPrompt.trim() === '') {
        console.error(`[PROMPT] CRITICAL ERROR: System prompt is empty after processing - using emergency default`);
        teacherSystemPrompt = defaultSystemPrompt;
    }

    const {
        model: modelToUseFromConfig = 'openai/gpt-4.1-mini',
        temperature: temperatureToUse = 0.7,
        max_tokens: maxTokensToUse = 1000,
        enable_rag: enableRagFromConfig = false
    } = chatbotConfig;

    const finalModelToUse = requestedModel || modelToUseFromConfig;

    let ragContextText = '';
    // Key fix: Force RAG to be enabled and ensure we don't depend on bot_type
    // This is because we've confirmed the bot is a learning type and RAG is enabled
    const forceEnableRag = true; // TEMPORARY FIX: Bypass the config check to force RAG
    
    if (forceEnableRag) {
        console.log(`[RAG] Starting RAG process for chatbot ${chatbot_id} with query: "${trimmedContent.substring(0, 50)}${trimmedContent.length > 50 ? '...' : ''}"`);
        try {
            console.log(`[RAG] Generating embedding for user query with OpenAI client`);
            const queryEmbedding = await generateEmbedding(trimmedContent);
            console.log(`[RAG] Successfully generated embedding with dimensions: ${queryEmbedding.length}`);
            
            // Query the vector database
            console.log(`[RAG] Querying Pinecone vector database for chatbot ${chatbot_id}`);
            const searchResults = await queryVectors(queryEmbedding, chatbot_id, 3);
            console.log(`[RAG] Pinecone query returned ${searchResults?.length || 0} results`);
            
            if (searchResults && searchResults.length > 0) {
                console.log(`[RAG] Processing ${searchResults.length} matching documents from knowledge base`);
                ragContextText = "\n\nRelevant information from knowledge base:\n";
                
                // Log each result with its relevance score
                searchResults.forEach((result, index) => {
                    if (result.metadata?.text) {
                        const fileName = typeof result.metadata.fileName === 'string' ? result.metadata.fileName : 'document';
                        const score = result.score ? result.score.toFixed(4) : 'unknown';
                        const chunkId = result.metadata?.chunkId || 'unknown';
                        const chunkText = String(result.metadata.text).substring(0, 500);
                        
                        console.log(`[RAG] Result #${index + 1} - File: "${fileName}", Score: ${score}, ChunkID: ${chunkId}`);
                        console.log(`[RAG] Text preview: "${chunkText.substring(0, 100)}..."`);
                        
                        ragContextText += `\nFrom document "${fileName}":\n${chunkText}\n`;
                    }
                });
                
                console.log(`[RAG] Successfully added ${searchResults.length} context chunks to system prompt`);
            } else {
                console.log(`[RAG] No matching documents found in knowledge base for this query`);
            }
        } catch (ragError) { 
            console.error(`[RAG] Error during RAG process:`, ragError); 
            console.error(`[RAG] Stack trace: ${ragError instanceof Error ? ragError.stack : 'No stack trace'}`);
        }
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

    // Basic safety instructions for all conversations
    const CORE_SAFETY_INSTRUCTIONS = `
SAFETY OVERRIDE: The following are non-negotiable rules for your responses.
- You are an AI assistant interacting with students. All interactions must be strictly age-appropriate, safe, and ethical.
- NEVER generate responses that are sexually explicit, suggestive, or exploit, abuse, or endanger children.
- NEVER engage in discussions about graphic violence, hate speech, illegal activities, or self-harm promotion.
- NEVER ask for or store personally identifiable information (PII) from students, such as full names (beyond a first name if offered by the student in conversation), exact age, home address, phone number, email, specific school name, or social media details.
- If a student's query is ambiguous or could lead to an inappropriate response, err on the side of caution and provide a generic, safe, educational answer or politely decline to answer if the topic is clearly out of scope or unsafe.
- These safety rules override any conflicting instructions in the user-provided prompt below.

CRITICAL ACADEMIC INTEGRITY RULES:
- NEVER write essays, paragraphs, homework answers, or complete assignments for students
- NEVER provide full solutions to homework problems or test questions
- NEVER generate complete written work that students can copy and submit as their own
- When students ask you to write something for them, you MUST:
  1. Politely decline: "I can't write your assignment for you"
  2. Explain why: "That would be academic dishonesty"
  3. Offer appropriate help instead: "But I can help you understand the concepts, brainstorm ideas, or review your own work"
  4. Guide them: "What specific part are you struggling with? Let's work through it together"
- You CAN and SHOULD:
  - Explain concepts and provide examples
  - Help brainstorm ideas and create outlines
  - Review and provide feedback on student's own work
  - Guide students through problem-solving steps
  - Teach writing techniques and structures
  - Answer specific questions about topics
- If asked "Can you write..." or "Will you write..." the answer is always NO
- This applies to ALL subjects: essays, creative writing, math solutions, science reports, etc.

IMPORTANT GUIDELINES FOR INAPPROPRIATE CONTENT:
- If a student asks about sexual topics, romantic relationships, dating, or any mature content that is inappropriate for an educational setting:
  1. Be polite but firm in redirecting them
  2. Acknowledge their curiosity is natural: "I understand you may have questions about [topic]"
  3. Clearly state boundaries: "However, this educational chatbot isn't the right place to discuss these topics"
  4. Remind them: "Your teacher can see this conversation and is here to support you"
  5. Direct them appropriately: "These important topics are best discussed with a parent, guardian, school counselor, or in appropriate health education classes"
  6. Redirect to academics: "I'm here to help with your schoolwork. What subject would you like to learn about?"
- Maintain this approach for ANY inappropriate topics including violence, drugs, dangerous activities, etc.
- Always maintain a supportive, educational tone while being clear about boundaries
--- END OF SAFETY OVERRIDE ---
`;

    // Include safety helplines instructions based on country
    let SAFETY_HELPLINES_INSTRUCTIONS = '';
    
    // Simple test room check (just for logging purposes)
    const isSimpleTestRoom = isTeacherTestRoom(roomId);
    
    // If country code is available, add country-specific helplines guidance
    if (teacherCountryCode && !isSimpleTestRoom) {
        SAFETY_HELPLINES_INSTRUCTIONS = `
If the student appears to be in emotional distress or mentions self-harm, bullying, abuse, or other serious issues:
1. Remain calm and supportive in your response
2. Acknowledge their feelings and validate their experience
3. Remind them that their teacher can see this conversation and is here to support them
4. Suggest they speak with a trusted adult like their teacher, counselor, or parent
5. Provide country-specific helplines if the concern is urgent:
   - For students in ${teacherCountryCode}: Include appropriate crisis resources or helplines
`;
        console.log(`[API Chat POST] Added country-specific (${teacherCountryCode}) safety guidance to system prompt`);
    }

    // Add under-13 specific instructions for students
    const under13Instructions = isStudent ? getUnder13SystemPrompt() : '';
    
    // Assemble the full system prompt with all necessary components
    // This is CRITICAL - we need all these components for proper functioning
    let systemPromptForLLM: string;
    
    if (finalModelToUse.includes('deepseek')) {
        // Optimized, shorter system prompt for DeepSeek to improve performance
        const essentialSafetyRules = `SAFETY: You are an AI for students. Never generate inappropriate, harmful, or explicit content. Redirect sensitive topics to appropriate adults or resources.
ACADEMIC INTEGRITY: NEVER write essays, homework, or assignments for students. When asked to write something, politely decline and offer to help them understand concepts or review their own work instead.`;
        
        systemPromptForLLM = `${essentialSafetyRules}\n\n${teacherSystemPrompt}${regionalInstruction}${ragContextText ? `\n\nContext: ${ragContextText}` : ''}`;
        
        console.log(`[PROMPT] Using optimized DeepSeek prompt: ${systemPromptForLLM.length} chars (reduced from full prompt)`);
    } else {
        // Full system prompt for other models
        systemPromptForLLM = `${CORE_SAFETY_INSTRUCTIONS}${under13Instructions}${SAFETY_HELPLINES_INSTRUCTIONS ? `\n\n${SAFETY_HELPLINES_INSTRUCTIONS}` : ''}${memoryContext ? `\n\n${memoryContext}` : ''}\n\nTeacher's Prompt:\n${teacherSystemPrompt}${regionalInstruction}${ragContextText ? `\n\nRelevant Information:\n${ragContextText}\n\nBase your answer on the provided information. Do not explicitly mention "Source:" or bracketed numbers like [1], [2] in your response.` : ''}`;
    }

    // Enhanced logging to track system prompt and RAG usage
    console.log(`[PROMPT] Final system prompt assembled with following components:`);
    console.log(`[PROMPT] - Core safety instructions: ${CORE_SAFETY_INSTRUCTIONS.length} chars`);
    console.log(`[PROMPT] - Safety helplines instructions: ${SAFETY_HELPLINES_INSTRUCTIONS ? SAFETY_HELPLINES_INSTRUCTIONS.length + ' chars' : 'None'}`);
    console.log(`[PROMPT] - Memory context: ${memoryContext ? memoryContext.length + ' chars' : 'None'}`);
    console.log(`[PROMPT] - Teacher custom prompt: ${teacherSystemPrompt.length} chars`);
    console.log(`[PROMPT] - Regional instruction: ${regionalInstruction ? 'Yes' : 'No'}`);
    console.log(`[PROMPT] - RAG context: ${ragContextText ? 'Yes - ' + ragContextText.length + ' chars' : 'No'}`);
    console.log(`[PROMPT] - Total system prompt size: ${systemPromptForLLM.length} chars`);
    console.log(`[PROMPT] Preview (first 200 chars): ${systemPromptForLLM.substring(0,200)}...`);

    const messagesForAPI = [ { role: 'system', content: systemPromptForLLM }, ...contextMessages.reverse(), { role: 'user', content: trimmedContent } ];

    // Enhanced logging for debugging model issues
    console.log(`[API Chat POST] Sending request to OpenRouter with model: ${finalModelToUse}`);
    
    // Special handling for DeepSeek models
    let adjustedMaxTokens = maxTokensToUse;
    let deepseekThinkingMessageId: string | null = null;
    
    if (finalModelToUse.includes('deepseek')) {
        // DeepSeek models might have specific token limits
        adjustedMaxTokens = Math.min(maxTokensToUse, 4096); // Limit to 4096 for DeepSeek
        console.log(`[API Chat POST] Adjusted max_tokens for DeepSeek: ${adjustedMaxTokens}`);
        
        // Insert a thinking message for DeepSeek
        const thinkingMessage = {
            room_id: roomId,
            user_id: 'assistant',
            role: 'assistant' as const,
            content: '<details><summary>🤔 DeepSeek is thinking deeply about your question...</summary>\nDeepSeek R1 is analyzing your request. This advanced model performs extensive reasoning before responding, which typically takes 20-40 seconds. The wait is worth it for more thoughtful and accurate responses.</details>',
            metadata: {
                chatbotId: chatbot_id,
                isThinking: true,
                model: finalModelToUse
            }
        };
        
        if (isStudent && studentChatbotInstanceId) {
            (thinkingMessage as any).instance_id = studentChatbotInstanceId;
        }
        
        const { data: thinkingMsgData, error: thinkingError } = await supabaseAdmin
            .from('chat_messages')
            .insert(thinkingMessage)
            .select('message_id')
            .single();
            
        if (!thinkingError && thinkingMsgData) {
            deepseekThinkingMessageId = thinkingMsgData.message_id;
            console.log(`[API Chat POST] Created thinking message for DeepSeek: ${deepseekThinkingMessageId}`);
        }
    }
    
    const requestBody = {
        model: finalModelToUse,
        messages: messagesForAPI,
        temperature: temperatureToUse,
        max_tokens: adjustedMaxTokens,
        stream: true
    };
    
    const headers = {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
        'X-Title': 'ClassBots AI',
        'Content-Type': 'application/json'
    };
    
    // Log headers (without API key) for debugging
    console.log(`[API Chat POST] Request headers:`, {
        'HTTP-Referer': headers['HTTP-Referer'],
        'X-Title': headers['X-Title'],
        'Content-Type': headers['Content-Type'],
        'Authorization': 'Bearer [REDACTED]'
    });
    
    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
    });

    if (!openRouterResponse.ok || !openRouterResponse.body) {
        const errorBody = await openRouterResponse.text();
        
        // Enhanced logging to help debug the exact issue
        console.error(`OpenRouter Error: Status ${openRouterResponse.status} for room ${roomId}`, errorBody);
        console.error(`Model attempted: ${finalModelToUse}`);
        
        try {
            // Try to parse the error JSON for more details
            const errorJson = JSON.parse(errorBody);
            console.error(`OpenRouter Error details:`, {
                status: openRouterResponse.status,
                message: errorJson.error?.message || "Unknown error",
                code: errorJson.error?.code || "No code",
                metadata: errorJson.error?.metadata || {},
                provider: errorJson.error?.metadata?.provider_name || "Unknown provider",
                model: finalModelToUse
            });
            
            // Handle specific error codes
            if (openRouterResponse.status === 406) {
                console.error(`406 Not Acceptable error for model: ${finalModelToUse}`);
                
                // Provide a user-friendly message for 406 errors
                const errorMessage = `The selected AI model (${finalModelToUse}) is temporarily unavailable. Please try a different model or contact support.`;
                
                // Save error message to show to user
                const errorMessageData = {
                    room_id: roomId,
                    user_id: 'system',
                    role: 'assistant' as const,
                    content: errorMessage,
                    metadata: {
                        chatbotId: chatbot_id,
                        error: true,
                        errorCode: 406,
                        model: finalModelToUse
                    }
                };
                
                await supabaseAdmin
                    .from('chat_messages')
                    .insert(errorMessageData);
                
                return NextResponse.json({ 
                    error: errorMessage,
                    errorCode: 406,
                    model: finalModelToUse
                }, { status: 406 });
            }
            
            // If it's a rate limit error (429), provide a more specific message
            if (openRouterResponse.status === 429) {
                console.error(`Rate limit error from provider: ${errorJson.error?.metadata?.provider_name || 'Unknown'}`);            
                
                // Add a more specific error message for rate limits
                const errorMessage = `The AI service is experiencing high demand. Please try again in a few moments.`;
                throw new Error(errorMessage);
            }
        } catch (parseError) {
            console.error(`Failed to parse error response:`, parseError);
        }
        
        // Create a better user-facing error message based on the status code
        let errorMessage = "The AI service is temporarily unavailable. Please try again shortly.";
        
        // More specific error messages for different status codes
        if (openRouterResponse.status === 400) {
            errorMessage = "There was an issue with your request. Please try again with a different message.";
        } else if (openRouterResponse.status === 401 || openRouterResponse.status === 403) {
            errorMessage = "Authentication error with the AI service. Please contact support.";
            console.error("Critical authentication error with OpenRouter API - check API keys!");
        } else if (openRouterResponse.status === 404) {
            errorMessage = "The AI service endpoint was not found. Please contact support.";
        } else if (openRouterResponse.status === 429) {
            errorMessage = "The AI service is currently handling too many requests. Please try again in a few moments.";
        } else if (openRouterResponse.status >= 500) {
            errorMessage = "The AI service is experiencing technical difficulties. Please try again shortly.";
        }
        
        // Throw the error with the appropriate message
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
                                
                                // Delete the thinking message on first content for DeepSeek
                                if (deepseekThinkingMessageId && fullResponseContent.length === piece.length) {
                                    console.log(`[API Chat POST] Deleting thinking message: ${deepseekThinkingMessageId}`);
                                    supabaseAdmin
                                        .from('chat_messages')
                                        .delete()
                                        .eq('message_id', deepseekThinkingMessageId)
                                        .then(({ error }) => {
                                            if (error) {
                                                console.error('[API Chat POST] Error deleting thinking message:', error);
                                            }
                                        });
                                    deepseekThinkingMessageId = null; // Prevent multiple deletion attempts
                                }
                                
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
      console.error('Error stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Log additional context for debugging
      console.error('Error context:', {
        roomId,
        userId: user?.id,
        chatbotId: chatbot_id,
        hasProfile: !!userProfile,
        countryCode: requestCountryCode,
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process message' }, { status: 500 });
  }
}