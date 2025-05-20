// src/app/api/student/direct-dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Room } from '@/types/database.types';
import { createServerClient } from '@supabase/ssr';

// Simple in-memory cache to reduce database load
interface CacheEntry {
  data: {
    profile: Record<string, unknown>;
    rooms: RoomWithChatbots[];
    isAnonymous: boolean;
    recentAssessments?: any[]; // Add assessments to the cache structure
  };
  timestamp: number;
}

const CACHE_TIMEOUT = 30 * 1000; // 30 seconds
const dashboardCache = new Map<string, CacheEntry>();

// Define interfaces for the specific data structures we're using
interface RoomWithChatbots extends Room {
  chatbots: ChatbotSummary[];
}

interface ChatbotSummary {
  chatbot_id: string;
  name: string;
  bot_type: string;
}

// Using a more general type for the database response
interface ChatbotAssociation {
  chatbots: {
    chatbot_id: string;
    name: string;
    bot_type?: string;
  } | null;
}

// A simplified API endpoint specifically for direct access
// This doesn't try to use normal auth flow and directly uses the user ID
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    console.log('[Direct Dashboard API] Request received. User ID:', userId);
    
    if (!userId) {
      console.error('[Direct Dashboard API] No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // SECURITY ENHANCEMENT: Check if the authenticated user matches the requested userId
    // or if the authenticated user is a teacher (authorized to view student data)
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set() { /* Not needed for this operation */ },
            remove() { /* Not needed for this operation */ }
          }
        }
      );
      
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // If the user is requesting data for a different user ID
        if (user.id !== userId) {
          // Check if the user is a teacher (can access any student's data)
          let isTeacher = user.user_metadata?.role === 'teacher';
          
          if (!isTeacher) {
            // Check profile table as fallback
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('user_id', user.id)
              .single();
              
            isTeacher = profile?.role === 'teacher';
          }
          
          // If not a teacher, deny access with clear message
          if (!isTeacher) {
            console.error(`[Direct Dashboard API] Unauthorized access: User ${user.id} trying to access user ${userId}`);
            return NextResponse.json({ 
              error: 'Unauthorized access attempt',
              message: 'You do not have permission to access another user\'s data',
              code: 'UNAUTHORIZED_ACCESS'
            }, { status: 403 });
          }
        }
      }
    } catch (authError) {
      console.error('[Direct Dashboard API] Error checking authorization:', authError);
      // Continuing without auth check could be dangerous, so return an error
      return NextResponse.json({ error: 'Authentication error' }, { status: 500 });
    }
    
    // Check cache first
    const cacheKey = `dashboard_${userId}`;
    const cachedData = dashboardCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TIMEOUT)) {
      console.log(`[Direct Dashboard API] Using cached data for user ${userId}`);
      return NextResponse.json(cachedData.data);
    }
    
    // Create admin client (server-side only)
    const supabaseAdmin = createAdminClient();
    
    // 1. Load student profile - don't try to select is_anonymous since it might not exist
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, email, username, pin_code')
      .eq('user_id', userId)
      .single();
      
    if (profileError) {
      console.error('[Direct Dashboard API] Error loading profile:', profileError);
      return NextResponse.json({ error: 'Could not load student profile' }, { status: 500 });
    }
    
    console.log('[Direct Dashboard API] Profile loaded:', {
      name: profile.full_name,
      has_username: !!profile.username,
      has_pin: !!profile.pin_code
    });
    
    // 2. Load student's room memberships
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('room_memberships')
      .select(`
        room_id,
        joined_at
      `)
      .eq('student_id', userId);
      
    if (membershipError) {
      console.error('[Direct Dashboard API] Error loading room memberships:', membershipError);
      return NextResponse.json({ error: 'Could not load classroom memberships' }, { status: 500 });
    }
    
    console.log('[Direct Dashboard API] Found memberships:', memberships?.length || 0);
    
    // If no memberships, still check for assessments before returning
    if (!memberships || memberships.length === 0) {
      // Determine if this is a temporary user based on pin_code/username
      const isAnonymous = !profile.pin_code || !profile.username;
      
      // Try to get assessments even if no rooms
      const { data: assessmentsData } = await supabaseAdmin
        .from('student_assessments')
        .select('*')
        .eq('student_id', userId)
        .limit(1);
        
      // If no assessments either, return early
      if (!assessmentsData || assessmentsData.length === 0) {
        return NextResponse.json({
          profile,
          rooms: [],
          isAnonymous,
          recentAssessments: []
        });
      }
      
      // Otherwise, continue to assessments loading but with empty rooms
      console.log('[Direct Dashboard API] No rooms but found assessments');
    }
    
    // Get detailed room info
    const roomIds = memberships.map(m => m.room_id);
    
    const { data: roomsData, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select(`
        room_id,
        room_name,
        room_code, 
        is_active,
        created_at,
        teacher_id
      `)
      .in('room_id', roomIds)
      .eq('is_active', true);
      
    if (roomsError) {
      console.error('[Direct Dashboard API] Error loading rooms:', roomsError);
      return NextResponse.json({ error: 'Could not load classroom details' }, { status: 500 });
    }
    
    console.log('[Direct Dashboard API] Found active rooms:', roomsData?.length || 0);
    
    // Get chatbots for each room
    const roomsWithChatbots: RoomWithChatbots[] = [];
    
    for (const room of roomsData || []) {
      const { data: chatbotAssociations, error: chatbotsError } = await supabaseAdmin
        .from('room_chatbots')
        .select(`
          chatbots (
            chatbot_id,
            name,
            bot_type
          )
        `)
        .eq('room_id', room.room_id);
        
      if (chatbotsError) {
        console.warn(`[Direct Dashboard API] Error loading chatbots for room ${room.room_id}:`, chatbotsError);
      }
      
      // Type for our chatbots array
      const chatbots: ChatbotSummary[] = [];
      
      if (chatbotAssociations) {
        // Use an explicit unknown cast first for safety, then to our expected type
        (chatbotAssociations as unknown as ChatbotAssociation[]).forEach(assoc => {
          if (assoc.chatbots) {
            chatbots.push({
              chatbot_id: assoc.chatbots.chatbot_id,
              name: assoc.chatbots.name || 'Unnamed Bot',
              bot_type: assoc.chatbots.bot_type || 'learning' // Provide default for bot_type
            });
          }
        });
      }
      
      roomsWithChatbots.push({
        ...room,
        chatbots
      } as RoomWithChatbots);
    }
    
    // Determine if this is a temporary user based on pin_code/username
    const isAnonymous = !profile.pin_code || !profile.username;
    
    console.log('[Direct Dashboard API] User is anonymous:', isAnonymous);
    console.log('[Direct Dashboard API] Returning rooms with chatbots:', roomsWithChatbots.length);
    
    // 3. Load student's recent assessments
    let recentAssessments: any[] = [];
    
    // Load real assessments from database
    const { data: assessmentsData, error: assessmentsError } = await supabaseAdmin
      .from('student_assessments')
      .select(`
        assessment_id,
        room_id, 
        chatbot_id,
        ai_grade_raw,
        ai_feedback_student,
        assessed_at,
        status,
        teacher_override_grade,
        teacher_override_notes,
        chatbot:chatbots!student_assessments_chatbot_id_fkey(name)
      `)
      .eq('student_id', userId)
      .order('assessed_at', { ascending: false })
      .limit(10);
    
    if (assessmentsError) {
      console.error('[Direct Dashboard API] Error loading assessments:', assessmentsError);
    }
    
    console.log('[Direct Dashboard API] Found assessments:', assessmentsData?.length || 0);
    
    if (assessmentsData && assessmentsData.length > 0) {
      // Process real assessments to include room names
      const roomIdsFromAssessments = [...new Set(
        assessmentsData.map(a => a.room_id).filter(id => id && !id.startsWith('teacher_test_room_'))
      )] as string[];
      
      // Build a map of room IDs to room names
      const roomNamesMap: Map<string, string> = new Map();
      
      if (roomIdsFromAssessments.length > 0) {
        const { data: roomNameData } = await supabaseAdmin
          .from('rooms')
          .select('room_id, room_name')
          .in('room_id', roomIdsFromAssessments);
          
        if (roomNameData) {
          roomNameData.forEach(r => roomNamesMap.set(r.room_id, r.room_name));
        }
      }
      
      // Format assessments with room names
      for (const asmnt of assessmentsData) {
        const chatbotData = asmnt.chatbot as { name?: string | null } | null;
        let roomNameDisplay = 'N/A';
        
        if (asmnt.room_id) {
          if (asmnt.room_id.startsWith('teacher_test_room_')) {
            roomNameDisplay = 'Test Environment';
          } else {
            roomNameDisplay = roomNamesMap.get(asmnt.room_id) || `Room ID: ${asmnt.room_id.substring(0,6)}`;
          }
        }
        
        recentAssessments.push({
          assessment_id: asmnt.assessment_id,
          room_id: asmnt.room_id,
          room_name: roomNameDisplay,
          chatbot_id: asmnt.chatbot_id,
          chatbot_name: chatbotData?.name || 'Assessment Bot',
          ai_grade_raw: asmnt.ai_grade_raw,
          ai_feedback_student: asmnt.ai_feedback_student,
          assessed_at: asmnt.assessed_at,
          status: asmnt.status,
          teacher_override_grade: asmnt.teacher_override_grade,
          teacher_override_notes: asmnt.teacher_override_notes
        });
      }
    } else if (process.env.NODE_ENV !== 'production') {
      // If no real assessments found and we're in development, create test data
      console.log('[Direct Dashboard API] No real assessments found. Creating test assessment data');
      
      recentAssessments = [
        {
          assessment_id: 'test-assessment-123',
          room_id: 'test-room-123',
          room_name: 'Test Classroom 1',
          chatbot_id: 'test-chatbot-123',
          chatbot_name: 'Shakespeare Bot',
          ai_grade_raw: 'B+',
          ai_feedback_student: 'Good understanding of the themes in Romeo and Juliet. Your analysis of the characters could be more detailed.',
          assessed_at: new Date().toISOString(),
          status: 'ai_completed',
          teacher_override_grade: null,
          teacher_override_notes: null
        },
        {
          assessment_id: 'test-assessment-456',
          room_id: 'test-room-456',
          room_name: 'Test Classroom 2',
          chatbot_id: 'test-chatbot-456',
          chatbot_name: 'History Bot',
          ai_grade_raw: 'A-',
          ai_feedback_student: 'Excellent work on your WWII timeline. Consider adding more details about the Pacific theater.',
          assessed_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          status: 'teacher_reviewed',
          teacher_override_grade: 'A',
          teacher_override_notes: 'Great improvement! Your analysis shows deep understanding.'
        }
      ];
    }
    
    console.log('[Direct Dashboard API] Returning assessments count:', recentAssessments.length);
    
    // Prepare response data
    const responseData = {
      profile,
      rooms: roomsWithChatbots,
      isAnonymous,
      recentAssessments
    };
    
    // Store in cache
    dashboardCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[Direct Dashboard API] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}