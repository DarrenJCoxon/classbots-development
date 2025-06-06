// src/app/api/student/room-chatbot-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get parameters from query string
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const chatbotId = searchParams.get('chatbotId');
    const userId = searchParams.get('userId');
    const instanceId = searchParams.get('instanceId');
    const isDirect = searchParams.get('direct') === 'true';

    console.log('[API GET /room-chatbot-data] Request params:', {
      roomId,
      chatbotId,
      userId,
      instanceId,
      isDirect
    });

    // Validate required parameters
    if (!roomId || !chatbotId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: roomId and chatbotId are required' 
      }, { status: 400 });
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient();
    
    // Log the admin client auth configuration to debug
    console.log('[API GET /room-chatbot-data] Admin client initialized');

    // Verify user has access to the room if userId is provided
    if (userId) {
      // First verify the user exists in the auth system (not just profiles)
      console.log('[API GET /room-chatbot-data] Verifying user in auth system:', userId);
      
      try {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (authError || !authUser?.user) {
          console.error('[API GET /room-chatbot-data] User not found in auth system:', userId, authError);
          // For direct access, we'll continue anyway as the user might not be in auth
          console.log('[API GET /room-chatbot-data] Continuing despite auth check failure for direct access');
        }
      } catch (e) {
        console.log('[API GET /room-chatbot-data] Auth check failed, continuing for direct access:', e);
      }

      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('room_memberships')
        .select('room_id')
        .eq('room_id', roomId)
        .eq('student_id', userId)
        .maybeSingle();

      if (membershipError) {
        console.error('[API GET /room-chatbot-data] Error checking membership:', membershipError);
        // Continue anyway, we'll create membership if needed
      }

      if (!membership) {
        console.log('[API GET /room-chatbot-data] User not in room, adding membership');
        // Add user to room
        const { error: insertError } = await supabaseAdmin
          .from('room_memberships')
          .insert({
            room_id: roomId,
            student_id: userId
          });

        if (insertError) {
          console.error('[API GET /room-chatbot-data] Error adding user to room:', insertError);
          // Continue anyway, try to get the data
        }
      }
    }

    // First, fetch the chatbot directly with detailed logging
    console.log('[API GET /room-chatbot-data] Fetching chatbot with ID:', chatbotId);
    
    // Validate that chatbotId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chatbotId)) {
      console.error('[API GET /room-chatbot-data] Invalid chatbot ID format:', chatbotId);
      return NextResponse.json({ error: 'Invalid chatbot ID format' }, { status: 400 });
    }
    
    // DEBUG: Test if we can query chatbots table at all
    const { data: testChatbots, error: testError } = await supabaseAdmin
      .from('chatbots')
      .select('chatbot_id, name')
      .limit(1);
    
    console.log('[API GET /room-chatbot-data] Test query result:', {
      canQueryChatbots: !testError,
      testError,
      foundRows: testChatbots?.length || 0
    });
    
    const { data: chatbot, error: chatbotError } = await supabaseAdmin
      .from('chatbots')
      .select(`
        chatbot_id, 
        name, 
        description, 
        system_prompt, 
        model, 
        max_tokens, 
        temperature, 
        enable_rag,
        bot_type, 
        assessment_criteria_text,
        welcome_message,
        linked_assessment_bot_id
      `)
      .eq('chatbot_id', chatbotId)
      .single();
    
    console.log('[API GET /room-chatbot-data] Chatbot query completed:', {
      found: !!chatbot,
      error: chatbotError,
      chatbotId: chatbotId,
      chatbotName: chatbot?.name
    });
    
    if (chatbotError || !chatbot) {
      // Let's also check if ANY chatbot exists with a similar query
      const { data: anyChatbot } = await supabaseAdmin
        .from('chatbots')
        .select('chatbot_id, name')
        .limit(1)
        .single();
      
      console.error('[API GET /room-chatbot-data] Chatbot not found. Debug info:', { 
        requestedChatbotId: chatbotId,
        error: chatbotError,
        errorMessage: chatbotError?.message,
        errorDetails: chatbotError?.details,
        errorCode: chatbotError?.code,
        canQueryChatbotsTable: !!anyChatbot,
        sampleChatbotFound: anyChatbot
      });
      
      // Return more detailed error for debugging
      return NextResponse.json({ 
        error: 'Chatbot not found',
        debug: {
          chatbotId: chatbotId,
          errorMessage: chatbotError?.message,
          canAccessTable: !!anyChatbot
        }
      }, { status: 404 });
    }
    
    // Now fetch the room data
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('room_id', roomId)
      .single();
    
    if (roomError || !room) {
      console.error('[API GET /room-chatbot-data] Room not found:', roomId, roomError);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    // Check association but don't fail for direct access
    const { data: association } = await supabaseAdmin
      .from('room_chatbots')
      .select('chatbot_id')
      .eq('room_id', roomId)
      .eq('chatbot_id', chatbotId)
      .maybeSingle();
    
    if (!association && !isDirect) {
      console.warn('[API GET /room-chatbot-data] Chatbot not associated with room');
      return NextResponse.json({ error: 'Chatbot is not associated with this room' }, { status: 404 });
    }
    
    // Get reading document if applicable
    const { data: readingDocument } = await supabaseAdmin
      .from('reading_documents')
      .select('file_url, file_name')
      .eq('chatbot_id', chatbotId)
      .maybeSingle();
    
    // Handle instance creation/retrieval
    let existingInstance = null;
    if (userId && !instanceId) {
      const { data: instance } = await supabaseAdmin
        .from('student_chatbot_instances')
        .select('*')
        .eq('student_id', userId)
        .eq('chatbot_id', chatbotId)
        .eq('room_id', roomId)
        .maybeSingle();
      existingInstance = instance;
    } else if (instanceId) {
      const { data: instance } = await supabaseAdmin
        .from('student_chatbot_instances')
        .select('*')
        .eq('instance_id', instanceId)
        .single();
      existingInstance = instance;
    }


    // Create instance if needed
    if (userId && !existingInstance && !instanceId) {
      const { data: newInstance } = await supabaseAdmin
        .from('student_chatbot_instances')
        .insert({
          student_id: userId,
          chatbot_id: chatbotId,
          room_id: roomId,
          is_active: true
        })
        .select()
        .single();
      
      existingInstance = newInstance;
    }

    // Build response with caching
    const response = NextResponse.json({
      room: {
        room_id: room.room_id,
        room_name: room.room_name,
        room_code: room.room_code,
        teacher_id: room.teacher_id,
        school_id: room.school_id,
        is_active: room.is_active,
        created_at: room.created_at,
        updated_at: room.updated_at,
        room_chatbots: [{
          chatbots: chatbot
        }]
      },
      chatbot: chatbot,
      instanceId: existingInstance?.instance_id || instanceId,
      readingDocument: (chatbot.bot_type === 'reading_room' || chatbot.bot_type === 'viewing_room') ? readingDocument : null
    });
    
    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=60');
    
    return response;
  } catch (error) {
    console.error('[API GET /room-chatbot-data] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}