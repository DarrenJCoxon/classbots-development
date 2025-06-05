// src/app/api/student/room-chatbots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // Get room ID from query params
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId'); // Allow direct access mode

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // Use admin client to ensure we can access the data regardless of auth state
    const supabaseAdmin = createAdminClient();
    
    // Get the current user ID (either from auth or from userId parameter)
    let studentId: string | null = null;
    
    if (userId) {
      // Direct access mode - trust the userId from the join process
      studentId = userId;
      console.log('[API GET /student/room-chatbots] Using direct access user ID:', studentId);
      
      // Verify the user exists in auth system (not just profiles)
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!authUser?.user) {
        console.warn('[API GET /student/room-chatbots] User ID not found in auth:', userId);
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 401 });
      }
    } 
    
    if (!studentId) {
      // Try to get authenticated user
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        studentId = user.id;
        console.log('[API GET /student/room-chatbots] Using authenticated user ID:', studentId);
      }
    }
    
    if (!studentId) {
      return NextResponse.json({ error: 'Authenticated user or valid user ID required' }, { status: 401 });
    }

    // First, verify the room exists
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('room_id, room_name, is_active')
      .eq('room_id', roomId)
      .single();

    if (roomError) {
      console.error('[API GET /student/room-chatbots] Room not found:', roomError);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if room is active
    if (!room.is_active) {
      console.warn('[API GET /student/room-chatbots] Room is inactive:', roomId);
      return NextResponse.json({ error: 'Room is inactive' }, { status: 403 });
    }
    
    // Verify student has access to this room
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('room_memberships')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('student_id', studentId)
      .single();
      
    if (membershipError || !membership) {
      console.warn('[API GET /student/room-chatbots] Student not in room:', studentId, roomId);
      return NextResponse.json({ error: 'Access denied to this room' }, { status: 403 });
    }

    // Get student-specific chatbot instances for this room
    const { data: chatbotInstances, error: instancesError } = await supabaseAdmin
      .from('student_chatbot_instances')
      .select(`
        instance_id,
        chatbot_id,
        chatbots (
          chatbot_id,
          name,
          description,
          model,
          bot_type,
          welcome_message
        )
      `)
      .eq('room_id', roomId)
      .eq('student_id', studentId);

    if (instancesError) {
      console.error('[API GET /student/room-chatbots] Error fetching student chatbot instances:', instancesError);
      return NextResponse.json({ error: 'Error fetching chatbot data' }, { status: 500 });
    }

    // If no instances exist yet, create them now
    if (!chatbotInstances || chatbotInstances.length === 0) {
      console.log('[API GET /student/room-chatbots] No chatbot instances found, creating them now');
      
      // First, get all chatbots in the room
      const { data: roomChatbots, error: rcError } = await supabaseAdmin
        .from('room_chatbots')
        .select(`
          chatbot_id,
          chatbots (
            chatbot_id,
            name,
            description,
            model,
            bot_type,
            welcome_message
          )
        `)
        .eq('room_id', roomId);

      if (rcError || !roomChatbots || roomChatbots.length === 0) {
        console.warn('[API GET /student/room-chatbots] No chatbots found for room:', roomId);
        return NextResponse.json({ chatbots: [] });
      }
      
      // Create instances for each chatbot
      const instancesData = roomChatbots.map(rc => ({
        student_id: studentId,
        chatbot_id: rc.chatbot_id,
        room_id: roomId
      }));
      
      const { data: newInstances, error: createError } = await supabaseAdmin
        .from('student_chatbot_instances')
        .upsert(instancesData, { onConflict: 'student_id,chatbot_id,room_id' })
        .select(`
          instance_id,
          chatbot_id,
          chatbots (
            chatbot_id,
            name,
            description,
            model,
            bot_type,
            welcome_message
          )
        `);
        
      if (createError) {
        console.error('[API GET /student/room-chatbots] Error creating chatbot instances:', createError);
        return NextResponse.json({ error: 'Error creating student chatbot instances' }, { status: 500 });
      }
      
      // Format the response to match the expected structure
      const formattedChatbots = (newInstances || []).map(instance => {
        const chatbot = instance.chatbots as any; // Type assertion to avoid TypeScript errors
        return {
          instance_id: instance.instance_id,
          chatbot_id: instance.chatbot_id,
          name: chatbot?.name || 'Unknown Bot',
          description: chatbot?.description || '',
          model: chatbot?.model,
          bot_type: chatbot?.bot_type,
          welcome_message: chatbot?.welcome_message
        };
      });
      
      return NextResponse.json({ 
        chatbots: formattedChatbots,
        roomName: room.room_name
      });
    }
    
    // Format the response with instances
    const formattedChatbots = chatbotInstances.map(instance => {
      const chatbot = instance.chatbots as any; // Type assertion to avoid TypeScript errors
      return {
        instance_id: instance.instance_id, 
        chatbot_id: instance.chatbot_id,
        name: chatbot?.name || 'Unknown Bot',
        description: chatbot?.description || '',
        model: chatbot?.model,
        bot_type: chatbot?.bot_type,
        welcome_message: chatbot?.welcome_message
      };
    });

    return NextResponse.json({ 
      chatbots: formattedChatbots,
      roomName: room.room_name
    });
  } catch (error) {
    console.error('[API GET /student/room-chatbots] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}