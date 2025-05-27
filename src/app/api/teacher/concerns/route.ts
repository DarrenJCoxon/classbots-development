// src/app/api/teacher/concerns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin'; // << IMPORT ADMIN CLIENT
import type { FlaggedMessage, ConcernStatus, Profile, Room, ChatMessage as DatabaseChatMessage } from '@/types/database.types';
import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Intermediate type - Simpler, as we'll fetch student profiles separately
type RawFlaggedMessage = FlaggedMessage & {
    // No 'student' field here initially
    room: Pick<Room, 'room_name'> | null;
    message: Pick<DatabaseChatMessage, 'content' | 'created_at' | 'metadata'> | null;
};

interface FlaggedConcernListDetails extends FlaggedMessage {
    student_name: string | null;
    student_email: string | null;
    room_name: string | null;
    message_content: string | null;
}
// ... (FlagDetailsResponse and getSingleConcernDetails can remain mostly as is, but getSingleConcernDetails will also use admin client for student profile)
interface FlagDetailsResponse extends FlaggedMessage {
    student: null;
    student_name: string | null;
    student_email: string | null;
    room_name: string;
    message_content: string;
    message: DatabaseChatMessage | null;
    surroundingMessages: DatabaseChatMessage[];
}


export async function GET(request: NextRequest) {
    console.log('[API GET /concerns] Received request.');
    try {
        const supabase = await createServerSupabaseClient(); // Standard client for user context
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) { /* ... auth checks ... */ 
            console.warn('[API GET /concerns] Not authenticated.');
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const { data: profile, error: profileError } = await supabase
            .from('teacher_profiles')
            .select('user_id')
            .eq('user_id', user.id)
            .single();
        if (profileError || !profile) {
            console.warn('[API GET /concerns] User profile/role issue.');
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }
        console.log(`[API GET /concerns] Authenticated teacher: ${user.id}`);

        const { searchParams } = new URL(request.url);
        const flagId = searchParams.get('flagId');
        
        if (flagId) {
            console.log(`[API GET /concerns] Fetching single concern details for flagId: ${flagId}`);
            // Modify getSingleConcernDetails to use admin client for student profile
            return await getSingleConcernDetails_V2(supabase, flagId, user.id); 
        }
        
        const statusFilter = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const page = parseInt(searchParams.get('page') || '0', 10);
        const offset = page * limit;

        console.log(`[API GET /concerns] Fetching concerns list. Status: ${statusFilter || 'all'}, Page: ${page}, Limit: ${limit}`);

        let countQuery = supabase
            .from('flagged_messages')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', user.id);

        // Fetch flagged_messages with joins to rooms and chat_messages, but NOT profiles yet
        let dataQuery = supabase
            .from('flagged_messages')
            .select(`
                *, 
                room:rooms!fk_room(room_name),
                message:chat_messages!fk_message(content, created_at, metadata)
            `)
            .eq('teacher_id', user.id) // RLS on flagged_messages will handle this
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (statusFilter && ['pending', 'reviewing', 'resolved', 'false_positive'].includes(statusFilter)) {
            countQuery = countQuery.eq('status', statusFilter);
            dataQuery = dataQuery.eq('status', statusFilter);
        }

        const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

        const { count, error: countError } = countResult;
        const { data: rawFlagsData, error: fetchError } = dataResult as { data: RawFlaggedMessage[] | null, error: PostgrestError | null };

        if (countError) console.warn('[API GET /concerns] Error fetching concerns count:', countError.message);
        if (fetchError) {
            console.error('[API GET /concerns] Error fetching base flagged messages data:', fetchError);
            throw new Error(`Failed to fetch flagged messages: ${fetchError.message}`);
        }

        if (!rawFlagsData || rawFlagsData.length === 0) {
            console.log('[API GET /concerns] No raw flags found.');
            return NextResponse.json({ concerns: [], pagination: { currentPage: page, pageSize: limit, totalCount: 0, totalPages: 0, hasMore: false } });
        }

        // Get unique student IDs from the fetched flags
        const studentIds = [...new Set(rawFlagsData.map(flag => flag.student_id).filter(id => id != null))] as string[];
        const studentProfilesMap: Map<string, Pick<Profile, 'full_name'>> = new Map();

        if (studentIds.length > 0) {
            console.log('[API GET /concerns] Fetching profiles for student IDs:', studentIds);
            const adminSupabase = createAdminClient();
            const { data: profilesData, error: profilesError } = await adminSupabase
                .from('student_profiles')
                .select('user_id, full_name')
                .in('user_id', studentIds);

            if (profilesError) {
                console.error('[API GET /concerns] Admin client error fetching student profiles:', profilesError.message);
                // Proceed without student names if this fails, or handle error more gracefully
            } else if (profilesData) {
                profilesData.forEach(p => studentProfilesMap.set(p.user_id, { full_name: p.full_name }));
            }
        }

        // Map raw flags to the detailed response, adding student info
        const concerns: FlaggedConcernListDetails[] = rawFlagsData.map((flag: RawFlaggedMessage) => {
            const studentProfile = flag.student_id ? studentProfilesMap.get(flag.student_id) : null;
            return {
                ...flag,
                student_name: studentProfile?.full_name || 'Unknown Student',
                student_email: null,
                room_name: flag.room?.room_name || 'Unknown Room',
                message_content: flag.message?.content || '[Message Content Unavailable]',
            };
        });

        const totalCount = count || 0;
        const hasMore = (offset + concerns.length) < totalCount;
        const totalPages = limit > 0 ? Math.ceil(totalCount / limit) : 0;

        console.log(`[API GET /concerns] Processed ${concerns.length} concerns for page ${page}, total: ${totalCount}`);
        return NextResponse.json({
            concerns,
            pagination: { currentPage: page, pageSize: limit, totalCount, totalPages, hasMore }
        });

    } catch (error) { /* ... error handling ... */ 
        console.error('[API GET /concerns] CATCH BLOCK Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'An internal error occurred while fetching concerns.' },
            { status: 500 }
        );
    }
}


// Modified getSingleConcernDetails to use Admin Client for student profile
async function getSingleConcernDetails_V2(
    supabaseUserClient: SupabaseClient<Database>, // User-context client for initial flag fetch
    flagId: string,
    teacherId: string
): Promise<NextResponse> {
    try {
        console.log(`[API getSingleConcernDetails_V2] Fetching details for concern flag ID: ${flagId}`);
        
        // Fetch the main flag data (without student profile yet)
        const { data: flag, error: flagError } = await supabaseUserClient
            .from('flagged_messages')
            .select(`
                *, 
                room:rooms!fk_room(room_name),
                message:chat_messages!fk_message(*)
            `)
            .eq('flag_id', flagId)
            .eq('teacher_id', teacherId) // Ensures teacher owns the flag
            .single();
            
        if (flagError) { /* ... error handling for flag fetch ... */ 
            console.error(`[API getSingleConcernDetails_V2] Error fetching flag ${flagId}:`, flagError);
            if (flagError.code === 'PGRST116') {
                 return NextResponse.json({ error: 'Concern not found or not authorized' }, { status: 404 });
            }
            throw flagError;
        }
        if (!flag) { return NextResponse.json({ error: 'Concern not found' }, { status: 404 }); }
        
        // Cast to a working type, student profile will be added
        const typedFlag = flag as unknown as (FlaggedMessage & { 
            room: Pick<Room, 'room_name'> | null; 
            message: DatabaseChatMessage | null;
        });

        let studentName: string | null = 'Unknown Student';
        let studentEmail: string | null = null;

        if (typedFlag.student_id) {
            const adminSupabase = createAdminClient();
            const { data: studentProfileData, error: studentProfileError } = await adminSupabase
                .from('student_profiles')
                .select('full_name')
                .eq('user_id', typedFlag.student_id)
                .single();
            if (studentProfileError) {
                console.warn(`[API getSingleConcernDetails_V2] Admin client error fetching student profile ${typedFlag.student_id}:`, studentProfileError.message);
            } else if (studentProfileData) {
                studentName = studentProfileData.full_name || studentName;
                studentEmail = null; // student_profiles doesn't have email
            }
        }

        // Make sure we have a good analysis_explanation if it's missing or contains an API error
        let analysis = typedFlag.analysis_explanation || "";
        
        // Check if the analysis contains an API error
        if (!analysis || analysis.includes("OpenRouter API error") || analysis.includes("Failed to fetch")) {
            // Set a more user-friendly explanation based on concern type
            const readableConcernType = typedFlag.concern_type ? 
                typedFlag.concern_type.replace(/_/g, ' ') : 
                'potential safety';
                
            analysis = `This message was flagged due to ${readableConcernType} concerns. Please review the conversation context and take appropriate action if needed.`;
        }
        
        const response: FlagDetailsResponse = {
            ...typedFlag,
            student: null, // Not fetching the full student object in this structure anymore, using flattened names
            student_name: studentName,
            student_email: studentEmail,
            room_name: typedFlag.room?.room_name || 'Unknown Room',
            message_content: typedFlag.message?.content || '[Message Content Unavailable]',
            message: typedFlag.message,
            // Always provide a valid analysis_explanation 
            analysis_explanation: analysis,
            surroundingMessages: [] // Populate this as before
        };
        
        // Fetch surrounding messages (logic remains similar, ensure chatMessageRoomId is correct)
        if (typedFlag.message && typedFlag.message.room_id && typedFlag.student_id) {
            const messageCreatedAt = typedFlag.message.created_at;
            const studentId = typedFlag.student_id;
            const chatMessageRoomId = typedFlag.message.room_id; // TEXT room_id from chat_messages
            const messageChatbotId = typedFlag.message.metadata?.chatbotId || null;

            const { data: messagesData, error: messagesError } = await supabaseUserClient // Use user client for chat history
                .from('chat_messages')
                .select<string, DatabaseChatMessage>("*") 
                .eq('room_id', chatMessageRoomId) 
                .eq('user_id', studentId)
                .filter('metadata->>chatbotId', messageChatbotId ? 'eq' : 'is', messageChatbotId || null)
                .lt('created_at', messageCreatedAt) 
                .order('created_at', { ascending: false })
                .limit(5); 
            
            const { data: messagesDataAfter, error: messagesErrorAfter } = await supabaseUserClient
                .from('chat_messages')
                .select<string, DatabaseChatMessage>("*")
                .eq('room_id', chatMessageRoomId) 
                .eq('user_id', studentId)
                .filter('metadata->>chatbotId', messageChatbotId ? 'eq' : 'is', messageChatbotId || null)
                .gt('created_at', messageCreatedAt) 
                .order('created_at', { ascending: true })
                .limit(5); 

            if (messagesError || messagesErrorAfter) {
                console.warn(`[API getSingleConcernDetails_V2] Error fetching conversation context for flag ${flagId}:`, messagesError || messagesErrorAfter);
            } else {
                const beforeMessages = (messagesData || []).reverse(); 
                const afterMessages = messagesDataAfter || [];
                const mainFlaggedMessageTyped = typedFlag.message as DatabaseChatMessage;
                response.surroundingMessages = [...beforeMessages, mainFlaggedMessageTyped, ...afterMessages].filter(Boolean);
            }
        }
        
        console.log(`[API getSingleConcernDetails_V2] Successfully fetched details for flag ${flagId}`);
        return NextResponse.json(response);
        
    } catch (error) { /* ... error handling ... */ 
        console.error(`[API getSingleConcernDetails_V2] CATCH for flag ${flagId}:`, error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch concern details' },
            { status: 500 }
        );
    }
}

// PATCH handler remains the same, as it operates on flagged_messages directly
// and RLS for UPDATE on flagged_messages already checks teacher_id.
export async function PATCH(request: NextRequest) {
    console.log('[API PATCH /concerns] Received request.');
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.warn('[API PATCH /concerns] Not authenticated.');
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { data: profile } = await supabase.from('teacher_profiles').select('user_id').eq('user_id', user.id).single();
        if (!profile) {
            console.warn('[API PATCH /concerns] User not a teacher or profile error.');
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        const body = await request.json();
        const { flagId, status, notes } = body;

        if (!flagId) {
            return NextResponse.json({ error: 'Flag ID is required' }, { status: 400 });
        }

        const validStatuses: ConcernStatus[] = ['pending', 'reviewing', 'resolved', 'false_positive'];
        if (!status || !validStatuses.includes(status as ConcernStatus)) {
            return NextResponse.json({ error: `Invalid status provided: ${status}` }, { status: 400 });
        }
        
        if (notes !== undefined && notes !== null && typeof notes !== 'string') {
            return NextResponse.json({ error: 'Invalid notes format, must be a string or null.' }, { status: 400 });
        }

        console.log(`[API PATCH /concerns] Updating flag ${flagId} by teacher ${user.id} to status: ${status}`);

        const updateData: Partial<FlaggedMessage> = {
            status: status as ConcernStatus,
            updated_at: new Date().toISOString(),
            reviewer_id: user.id,
            reviewed_at: new Date().toISOString(),
        };
        if (notes !== undefined) {
            updateData.notes = notes === '' ? null : notes;
        }

        const { data: updatedFlag, error: updateError } = await supabase
            .from('flagged_messages')
            .update(updateData)
            .eq('flag_id', flagId)
            .eq('teacher_id', user.id)
            .select()
            .single();

        if (updateError) {
            console.error(`[API PATCH /concerns] Error updating flag ${flagId}:`, updateError);
            if (updateError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Update failed: Flag not found or permission denied' }, { status: 404 });
            }
            throw updateError;
        }

        if (!updatedFlag) {
            return NextResponse.json({ error: 'Flag not found or update failed post-operation' }, { status: 404 });
        }

        console.log(`[API PATCH /concerns] Flag ${flagId} updated successfully.`);
        return NextResponse.json(updatedFlag);

    } catch (error) { 
        console.error(`[API PATCH /concerns] CATCH BLOCK Error:`, error); 
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Failed to update concern status' 
        }, { status: 500 }); 
    }
}