// src/app/api/teacher/student-chats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ChatMessage as DatabaseChatMessage } from '@/types/database.types';

interface Conversation {
  chatbot_id: string | null;
  chatbot_name: string;
  started_at: string;
  messages: DatabaseChatMessage[];
}

interface ChatbotInfoFromDB {
  chatbot_id: string;
  name: string;
}

interface RoomChatbotResponseFromDB {
  chatbot_id: string;
  chatbots: ChatbotInfoFromDB;
}

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters instead of path parameters
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const studentId = searchParams.get('studentId');
    const chatbotIdFilter = searchParams.get('chatbotId');

    console.log("Fetching chats for student:", studentId, "in room:", roomId);

    if (!roomId || !studentId) {
      return NextResponse.json({ error: 'Room ID and Student ID are required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('teacher_id', user.id)
      .single();

    if (roomError || !room) {
      console.error("Room fetch error or unauthorized:", roomError);
      return NextResponse.json({ error: 'Room not found or unauthorized' }, { status: 404 });
    }

    // Use admin client to bypass RLS policies
    const supabaseAdmin = createAdminClient();
    
    // Check membership using admin client to avoid RLS recursion
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('room_memberships')
      .select('student_id')
      .eq('room_id', roomId)
      .eq('student_id', studentId)
      .single();

    if (membershipError || !membership) {
      console.error("Membership fetch error or not a member:", membershipError);
      return NextResponse.json({ error: 'Student is not a member of this room' }, { status: 404 });
    }

    // Use admin client for chat messages query too
    let query = supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', studentId)
      .order('created_at', { ascending: true });

    if (chatbotIdFilter) {
      query = query.filter('metadata->>chatbotId', 'eq', chatbotIdFilter);
    }

    const { data: messagesData, error: messagesError } = await query;

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json({ error: 'Failed to fetch chat messages' }, { status: 500 });
    }

    const allMessages: DatabaseChatMessage[] = (messagesData as DatabaseChatMessage[] | null) || [];

    const { data: roomChatbotsDataRaw, error: chatbotsError } = await supabase
      .from('room_chatbots')
      .select(`
        chatbot_id,
        chatbots:chatbots!inner(
          chatbot_id,
          name
        )
      `)
      .eq('room_id', roomId);

    if (chatbotsError) {
      console.error("Error fetching room chatbots:", chatbotsError);
    }

    const availableChatbots: Array<{ chatbot_id: string; name: string }> = [];
    if (roomChatbotsDataRaw && roomChatbotsDataRaw.length > 0) {
      const typedRoomChatbots = roomChatbotsDataRaw as unknown as RoomChatbotResponseFromDB[];
      typedRoomChatbots.forEach(item => {
        if (item.chatbots && typeof item.chatbots === 'object') {
          availableChatbots.push({
            chatbot_id: item.chatbots.chatbot_id,
            name: item.chatbots.name
          });
        }
      });
    }

    const conversations: Conversation[] = [];
    let currentConversation: Conversation | null = null;
    let currentChatbotIdForConversation: string | null = null;

    for (const message of allMessages) {
      const msgChatbotId = message.metadata?.chatbotId || null;

      if (currentConversation === null || msgChatbotId !== currentChatbotIdForConversation) {
        if (currentConversation) {
          conversations.push(currentConversation);
        }
        const matchingChatbot = availableChatbots.find(c => c.chatbot_id === msgChatbotId);
        currentChatbotIdForConversation = msgChatbotId;
        currentConversation = {
          chatbot_id: msgChatbotId,
          chatbot_name: matchingChatbot ? matchingChatbot.name : (msgChatbotId ? 'Unknown Chatbot' : 'General Chat'),
          started_at: message.created_at,
          messages: [message],
        };
      } else {
        currentConversation.messages.push(message);
      }
    }

    if (currentConversation) {
      conversations.push(currentConversation);
    }

    return NextResponse.json({
      conversations,
      chatbots: availableChatbots,
      pagination: { hasMore: false }
    });

  } catch (error) {
    console.error('Error fetching student chats:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch student chats' },
      { status: 500 }
    );
  }
}