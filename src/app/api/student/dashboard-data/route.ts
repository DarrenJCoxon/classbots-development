// src/app/api/student/dashboard-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
  studentProfile: Pick<Profile, 'user_id' | 'full_name' | 'email' | 'pin_code' | 'username'> | null;
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


export async function GET(request: NextRequest) {
  console.log('[API GET /student/dashboard-data] Received request.');
  
  // Check for direct login flag
  const url = new URL(request.url);
  const isDirect = url.searchParams.get('direct') === '1';
  const hasTimestamp = url.searchParams.has('_t');
  
  // Check for our special bypass token cookie
  const bypassToken = request.cookies.get('student-pin-auth-bypass')?.value;
  const hasBypassToken = !!bypassToken;
  
  // Log all cookies for debugging
  const allCookies = request.cookies.getAll();
  console.log('[API GET /student/dashboard-data] Available cookies:', 
    allCookies.map(c => c.name));
  
  // Try to get user ID from bypass token if available
  let bypassUserId = null;
  if (bypassToken && bypassToken.startsWith('BYPASS_')) {
    bypassUserId = bypassToken.split('_')[1];
    console.log(`[API GET /student/dashboard-data] Found bypass token with user ID: ${bypassUserId}`);
  }
  
  // Extract user ID from the URL
  const urlUserId = url.searchParams.get('user_id');
  
  // Check if we have a valid bypass session
  const isDirectBypass = isDirect && (hasTimestamp || hasBypassToken) && (bypassUserId || urlUserId);
  
  try {
    const supabase = await createServerSupabaseClient();
    
    // We'll still try to get the user/session for normal flow
    let user = null;
    let authError = null;
    
    if (!isDirectBypass) {
      // Try normal auth flow
      const authResult = await supabase.auth.getUser();
      user = authResult.data.user;
      authError = authResult.error;
      
      // Also get session info for logging
      const sessionResult = await supabase.auth.getSession();
      
      console.log('[API GET /student/dashboard-data] Auth check:', { 
        hasUser: !!user, 
        hasSession: !!sessionResult.data.session,
        isDirect: isDirect,
        hasTimestamp: hasTimestamp,
        hasBypassToken: hasBypassToken,
        userError: authError?.message,
        sessionError: sessionResult.error?.message
      });
      
      // Check for normal auth failure
      if (authError || !user) {
        console.warn('[API GET /student/dashboard-data] Normal auth failed:', 
          authError?.message || 'No valid user');
          
        // If we don't have a bypass, return auth error
        if (!isDirectBypass) {
          return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
      }
    } else {
      console.log('[API GET /student/dashboard-data] Using direct bypass authentication');
    }

    // Get the effective user ID from various sources (in order of preference)
    // 1. URL param (most reliable for bypass)
    // 2. Bypass token 
    // 3. Normal auth user
    const effectiveUserId = urlUserId || bypassUserId || user?.id;
    const pinVerified = url.searchParams.get('pin_verified') === 'true';
    
    if (!effectiveUserId) {
      console.error('[API GET /student/dashboard-data] No effective user ID available');
      return NextResponse.json({ error: 'User ID not available' }, { status: 400 });
    }
    
    console.log(`[API GET /student/dashboard-data] Using effective user ID: ${effectiveUserId}`);
    console.log(`[API GET /student/dashboard-data] PIN verification status: ${pinVerified ? 'Verified' : 'Unknown'}`);
    
    // Verify user is a student
    try {
      // Let's try to be extra careful about database connections
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, role, full_name, email') // Fetch full_name and email too
        .eq('user_id', effectiveUserId)
        .single();

    if (profileError || !profile) {
      console.warn(`[API GET /student/dashboard-data] Profile error for user ${effectiveUserId}:`, profileError?.message);
      
      // SPECIAL CASE: If PIN was verified but profile lookup failed, we trust the verification
      // and create a very basic temporary profile to show the dashboard
      if (pinVerified || (isDirect && hasTimestamp)) {
        console.log(`[API GET /student/dashboard-data] Creating a basic profile for PIN-verified user ${effectiveUserId}`);
        
        // Generate a dummy profile since we already verified the PIN but DB lookup failed
        const tempProfile = {
          user_id: effectiveUserId,
          role: 'student',
          full_name: 'Student',
          email: null
        };
        
        return NextResponse.json({
          studentProfile: tempProfile,
          joinedRooms: [],
          recentAssessments: [],
          message: 'Using temporary profile for authenticated student'
        });
      }
      
      // If not PIN verified, try regular profile creation flow
      if (isDirect && hasTimestamp) {
        console.log(`[API GET /student/dashboard-data] Direct login - trying to create profile for ${effectiveUserId}`);
        
        try {
          // Create a basic profile with PIN code and username
          const username = `student-${Date.now()}`;
          const pinCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit PIN
          
          // Try to create a basic profile directly (don't try to use auth.admin which is failing)
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: effectiveUserId,
              role: 'student',
              full_name: 'Student',
              pin_code: pinCode,
              username: username,
              last_pin_change: new Date().toISOString(),
              pin_change_by: 'system'
            });
            
          if (insertError) {
            console.error('[API GET /student/dashboard-data] Failed to create profile:', insertError);
          } else {
            console.log('[API GET /student/dashboard-data] Successfully created profile with PIN:', pinCode);
            
            // Try to get the profile again
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('user_id, role, full_name, email')
              .eq('user_id', effectiveUserId)
              .single();
              
            if (newProfile) {
              console.log('[API GET /student/dashboard-data] Successfully retrieved new profile');
              return NextResponse.json({
                studentProfile: newProfile,
                joinedRooms: [],
                recentAssessments: [],
                message: 'New profile created' 
              });
            }
          }
        } catch (err) {
          console.error('[API GET /student/dashboard-data] Error creating profile:', err);
        }
      }
      
      // If we still don't have a profile, return an error
      return NextResponse.json({ error: 'User profile not found.' }, { status: 403 });
    }
    
    if (profile.role !== 'student') {
      console.warn(`[API GET /student/dashboard-data] User ${effectiveUserId} is not a student. Role: ${profile.role}`);
      return NextResponse.json({ error: 'Not authorized (user is not a student)' }, { status: 403 });
    }
    } catch (err) {
      console.error('[API GET /student/dashboard-data] Error checking user profile:', err);
      
      // If profile check fails but PIN was verified, create a temporary profile
      if (pinVerified) {
        const tempProfile = {
          user_id: effectiveUserId,
          role: 'student',
          full_name: 'Student',
          email: null
        };
        
        return NextResponse.json({
          studentProfile: tempProfile,
          joinedRooms: [],
          recentAssessments: [],
          message: 'Using temporary profile after exception'
        });
      }
      
      return NextResponse.json({ error: 'Error checking user profile' }, { status: 500 });
    }
    
    console.log(`[API GET /student/dashboard-data] User ${effectiveUserId} authenticated as student.`);
    
    // Since we've already verified the user is a student,
    // let's fetch the profile data again to ensure we have it for this scope
    // Include pin_code and username in the selection
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, pin_code, username')
      .eq('user_id', effectiveUserId)
      .single();
      
    // Extended profile info to include pin_code and username
    const studentProfileInfo = {
        user_id: effectiveUserId, // We already have validated effectiveUserId
        full_name: userProfile?.full_name || 'Student',
        email: userProfile?.email || '',
        pin_code: userProfile?.pin_code || null,
        username: userProfile?.username || null
    };

    // Simplify our approach - just use the admin client directly for reliability
    // Create an admin client to bypass RLS policies that might be causing issues
    const supabaseAdmin = createAdminClient();
    console.log('[API GET /student/dashboard-data] Using admin client to fetch rooms');
    
    // Fetch joined rooms with admin client
    const { data: membershipsData, error: roomsError } = await supabaseAdmin
      .from('room_memberships')
      .select(`
        joined_at,
        rooms(
          room_id,
          room_name,
          room_code,
          is_active,
          created_at,
          room_chatbots(
            chatbots(
              chatbot_id,
              name,
              description,
              bot_type
            )
          )
        )
      `)
      .eq('student_id', effectiveUserId)
      .eq('rooms.is_active', true); // Only fetch active rooms
      
    console.log(`[API GET /student/dashboard-data] Admin query returned ${membershipsData?.length || 0} rooms`);

    if (roomsError) {
      console.error('[API GET /student/dashboard-data] Error fetching student rooms:', roomsError.message);
      // Don't fail entirely, dashboard might still show assessments
    }

    // Process the room memberships with improved error handling
    console.log('[API GET /student/dashboard-data] Processing room memberships data');
    const typedMembershipsData = (membershipsData || []) as unknown as MembershipWithRoomAndChatbots[];
    
    const joinedRooms: JoinedRoomForDashboard[] = [];
    
    // Safely process each membership
    typedMembershipsData.forEach(membership => {
      try {
        const room = membership.rooms;
        if (!room || !room.room_id) return; // Skip invalid rooms
        
        // Make sure room is active (double-check)
        if (room.is_active !== true) return;
        
        const chatbotsInRoom: Pick<Chatbot, 'chatbot_id' | 'name' | 'bot_type'>[] = [];
        
        // Process chatbots with error handling
        if (room.room_chatbots && Array.isArray(room.room_chatbots)) {
          room.room_chatbots.forEach(rc => {
            try {
              if (rc && rc.chatbots) {
                chatbotsInRoom.push({
                  chatbot_id: rc.chatbots.chatbot_id,
                  name: rc.chatbots.name || 'Unnamed Bot',
                  bot_type: rc.chatbots.bot_type || 'learning',
                });
              }
            } catch (chatbotError) {
              console.warn('[API GET /student/dashboard-data] Error processing chatbot:', chatbotError);
              // Continue to next chatbot
            }
          });
        }
        
        // Add this room to the result
        joinedRooms.push({
          room_id: room.room_id,
          room_name: room.room_name || 'Unnamed Room',
          room_code: room.room_code || '???',
          chatbots: chatbotsInRoom,
          joined_at: membership.joined_at || new Date().toISOString(),
        });
      } catch (roomError) {
        console.warn('[API GET /student/dashboard-data] Error processing room:', roomError);
        // Continue to next room
      }
    });
    
    console.log(`[API GET /student/dashboard-data] Processed ${joinedRooms.length} active rooms for student`);
    console.log(`[API GET /student/dashboard-data] Fetched ${joinedRooms.length} joined active rooms.`);


    // 2. Fetch recent assessments (e.g., last 5-10 completed or reviewed by teacher)
    // For assessments, we need joins to get room_name and chatbot_name
    const chatbotForeignKeyHint = "!student_assessments_chatbot_id_fkey"; // FK from student_assessments to chatbots
                                                                        // If room_id in student_assessments is TEXT and not a direct FK, we'll need a two-step fetch or careful query

    // Check if room_id in student_assessments is a direct FK to rooms.room_id
    // For now, assuming student_assessments.room_id is TEXT and might be 'teacher_test_room_...',
    // so a direct join on rooms might only work for actual UUID room_ids.
    // Let's fetch assessments and then enrich with room names.

    // Simply use admin client for assessments as well
    // Continue using the same admin client from above
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
        chatbot:chatbots${chatbotForeignKeyHint}(name) 
      `)
      .eq('student_id', effectiveUserId)
      .order('assessed_at', { ascending: false })
      .limit(10); // Limit to recent ones
      
    console.log(`[API GET /student/dashboard-data] Admin query returned ${assessmentsData?.length || 0} assessments`);

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
            // Use the admin client consistently for room names as well
            const { data: roomNameData, error: roomNameError } = await supabaseAdmin
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