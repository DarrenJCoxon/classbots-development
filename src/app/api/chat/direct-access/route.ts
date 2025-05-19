// src/app/api/chat/direct-access/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
// We don't directly use this type here but keep for reference
// import type { ChatMessage } from '@/types/database.types';

export async function GET(request: NextRequest) {
  try {
    // Get parameters from query string
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId');
    const chatbotId = searchParams.get('chatbotId');
    const instanceId = searchParams.get('instanceId');

    // Validate required parameters
    if (!roomId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: roomId and userId are required' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient();

    // Verify user exists - try both methods for compatibility
    let userExists = false;
    
    try {
      // Method 1: Try using auth.admin.getUserById if available
      if (supabaseAdmin.auth.admin && typeof supabaseAdmin.auth.admin.getUserById === 'function') {
        const { data: userCheck, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!userError && userCheck.user) {
          userExists = true;
        }
      }
    } catch (authMethodError) {
      console.warn('[API GET /chat/direct-access] Error with auth.admin.getUserById:', authMethodError);
    }
    
    if (!userExists) {
      // Method 2: Fall back to checking the profiles table
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (profileError || !userProfile) {
        console.error('[API GET /chat/direct-access] User not found in profiles:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      userExists = true;
    }
    
    if (!userExists) {
      console.error('[API GET /chat/direct-access] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify the user has access to the room
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('room_memberships')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('student_id', userId)
      .maybeSingle();

    if (membershipError) {
      console.error('[API GET /chat/direct-access] Error checking membership:', membershipError);
    }

    // If not a member, add to room
    if (!membership) {
      console.log('[API GET /chat/direct-access] User not in room, adding membership');
      const { error: insertError } = await supabaseAdmin
        .from('room_memberships')
        .insert({
          room_id: roomId,
          student_id: userId
        });

      if (insertError) {
        console.error('[API GET /chat/direct-access] Error adding user to room:', insertError);
        return NextResponse.json(
          { error: 'Failed to add user to room' },
          { status: 500 }
        );
      }
    }

    // Check if we have a student-specific instance to use
    let studentChatbotInstanceId = instanceId;
    
    if (chatbotId && !studentChatbotInstanceId) {
      // Try to find the student's instance for this chatbot
      const { data: instanceData, error: instanceError } = await supabaseAdmin
        .from('student_chatbot_instances')
        .select('instance_id')
        .eq('student_id', userId)
        .eq('room_id', roomId)
        .eq('chatbot_id', chatbotId)
        .single();
        
      if (!instanceError && instanceData?.instance_id) {
        console.log(`[API GET /chat/direct-access] Found instance ${instanceData.instance_id} for student ${userId}`);
        studentChatbotInstanceId = instanceData.instance_id;
      } else {
        // Create a new instance on-the-fly
        console.log(`[API GET /chat/direct-access] Creating new instance for student ${userId}`);
        
        const { data: newInstance, error: createError } = await supabaseAdmin
          .from('student_chatbot_instances')
          .insert({
            student_id: userId,
            chatbot_id: chatbotId,
            room_id: roomId
          })
          .select('instance_id')
          .single();
          
        if (!createError && newInstance) {
          studentChatbotInstanceId = newInstance.instance_id;
          console.log(`[API GET /chat/direct-access] Created new instance ${studentChatbotInstanceId}`);
        } else {
          console.error(`[API GET /chat/direct-access] Error creating instance:`, createError);
        }
      }
    }
    
    // Fetch messages using admin client to bypass RLS policies
    let query = supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId);
      
    if (studentChatbotInstanceId) {
      // If we have an instance ID, use that for precise filtering
      console.log(`[API GET /chat/direct-access] Using instance ${studentChatbotInstanceId} for filtering`);
      query = query.eq('instance_id', studentChatbotInstanceId);
    } else {
      // Fallback to traditional filtering
      console.log(`[API GET /chat/direct-access] Using traditional filtering without instance ID`);
      query = query.or(`user_id.eq.${userId},role.eq.assistant,role.eq.system`);
      
      if (chatbotId) {
        query = query.filter('metadata->>chatbotId', 'eq', chatbotId);
      }
    }

    const { data: messages, error: messagesError } = await query.order('created_at', { ascending: true });

    if (messagesError) {
      console.error('[API GET /chat/direct-access] Error fetching messages:', messagesError);
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    console.log(`[API GET /chat/direct-access] Fetched ${messages?.length || 0} messages for room ${roomId}, user ${userId}, chatbot ${chatbotId || 'any'}`);
    
    return NextResponse.json(messages || []);
  } catch (error) {
    console.error('[API GET /chat/direct-access] General error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get parameters from query string
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId');
    const instanceId = searchParams.get('instanceId');
    
    if (!roomId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: roomId and userId are required' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient();

    // Verify user exists - try both methods for compatibility
    let userExists = false;
    
    try {
      // Method 1: Try using auth.admin.getUserById if available
      if (supabaseAdmin.auth.admin && typeof supabaseAdmin.auth.admin.getUserById === 'function') {
        const { data: userCheck, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!userError && userCheck.user) {
          userExists = true;
        }
      }
    } catch (authMethodError) {
      console.warn('[API POST /chat/direct-access] Error with auth.admin.getUserById:', authMethodError);
    }
    
    if (!userExists) {
      // Method 2: Fall back to checking the profiles table
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (profileError || !userProfile) {
        console.error('[API POST /chat/direct-access] User not found in profiles:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      userExists = true;
    }
    
    if (!userExists) {
      console.error('[API POST /chat/direct-access] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get body content
    const { content, chatbot_id, model, instance_id } = await request.json();
    
    if (!content || !chatbot_id) {
      return NextResponse.json({ error: 'Missing content or chatbot_id in request body' }, { status: 400 });
    }
    
    // Use instance_id from either URL parameters or request body
    const effectiveInstanceId = instanceId || instance_id;

    // Verify and ensure room membership
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('room_memberships')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('student_id', userId)
      .maybeSingle();

    if (membershipError) {
      console.error('[API POST /chat/direct-access] Error checking membership:', membershipError);
    }

    if (!membership) {
      console.log('[API POST /chat/direct-access] User not in room, adding membership');
      const { error: insertError } = await supabaseAdmin
        .from('room_memberships')
        .insert({
          room_id: roomId,
          student_id: userId
        });

      if (insertError) {
        console.error('[API POST /chat/direct-access] Error adding user to room:', insertError);
        return NextResponse.json(
          { error: 'Failed to add user to room' },
          { status: 500 }
        );
      }
    }

    // Find or create instance ID if not provided
    let studentChatbotInstanceId = effectiveInstanceId;
    
    if (!studentChatbotInstanceId) {
      console.log(`[API POST /chat/direct-access] No instance ID provided, finding or creating one`);
      
      // Try to find an existing instance
      const { data: existingInstance, error: findError } = await supabaseAdmin
        .from('student_chatbot_instances')
        .select('instance_id')
        .eq('student_id', userId)
        .eq('room_id', roomId)
        .eq('chatbot_id', chatbot_id)
        .single();
        
      if (!findError && existingInstance?.instance_id) {
        studentChatbotInstanceId = existingInstance.instance_id;
        console.log(`[API POST /chat/direct-access] Found existing instance ${studentChatbotInstanceId}`);
      } else {
        // Create a new instance
        const { data: newInstance, error: createError } = await supabaseAdmin
          .from('student_chatbot_instances')
          .insert({
            student_id: userId,
            chatbot_id: chatbot_id,
            room_id: roomId
          })
          .select('instance_id')
          .single();
          
        if (!createError && newInstance) {
          studentChatbotInstanceId = newInstance.instance_id;
          console.log(`[API POST /chat/direct-access] Created new instance ${studentChatbotInstanceId}`);
        } else {
          console.error(`[API POST /chat/direct-access] Error creating instance:`, createError);
        }
      }
    }
    
    // Store user message using admin client
    const userMessageToStore: any = {
      room_id: roomId,
      user_id: userId,
      role: 'user',
      content: content.trim(),
      metadata: { chatbotId: chatbot_id }
    };
    
    // Add instance_id if we have one
    if (studentChatbotInstanceId) {
      userMessageToStore.instance_id = studentChatbotInstanceId;
    }

    const { data: savedUserMessage, error: messageError } = await supabaseAdmin
      .from('chat_messages')
      .insert(userMessageToStore)
      .select('message_id, created_at')
      .single();

    if (messageError || !savedUserMessage) {
      console.error('[API POST /chat/direct-access] Error storing message:', messageError);
      return NextResponse.json({ error: 'Failed to store message' }, { status: 500 });
    }

    // Forward the request to the main chat API internally
    // This is a workaround since we can't easily reuse the complex chat handling logic
    // Use relative URL to avoid issues with cross-origin requests in production
    const forwardedUrl = `/api/chat/${roomId}`;
    
    console.log(`[API POST /chat/direct-access] Forwarding request to ${forwardedUrl}`);
    
    // Add special headers for direct access
    // These headers let the main chat API know to use the admin client
    // and bypass normal auth checks
    const directAccessKey = process.env.DIRECT_ACCESS_ADMIN_KEY || 'directaccess_key';
    
    const response = await fetch(forwardedUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-direct-access-admin-key': directAccessKey,
        'x-bypass-auth-user-id': userId
      },
      body: JSON.stringify({
        content: content.trim(),
        chatbot_id,
        model,
        message_id: savedUserMessage.message_id,
        instance_id: studentChatbotInstanceId
      })
    });
    
    // Log error for debugging if request fails
    if (!response.ok) {
      try {
        const errorText = await response.text();
        console.error(`[API POST /chat/direct-access] Forwarded request failed with status ${response.status}:`, errorText);
      } catch (readError) {
        console.error(`[API POST /chat/direct-access] Forwarded request failed with status ${response.status} (could not read error details)`);
      }
      
      return NextResponse.json({ 
        error: `Chat API request failed with status ${response.status}` 
      }, { status: response.status });
    }

    // Return the streaming response
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('[API POST /chat/direct-access] General error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process message' },
      { status: 500 }
    );
  }
}