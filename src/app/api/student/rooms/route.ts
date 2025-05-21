// src/app/api/student/rooms/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cache, CacheTTL, CacheTags } from '@/lib/utils/cache';
import { createSuccessResponse, handleApiError } from '@/lib/utils/api-responses';

// Define proper interfaces for the exact Supabase query structure
interface ChatbotData {
  chatbot_id: string;
  name: string;
  description: string | null;
}

interface RoomChatbotRelation {
  chatbots: ChatbotData;
}

interface RoomData {
  room_id: string;
  room_name: string;
  room_code: string;
  is_active: boolean;
  created_at: string;
  room_chatbots: RoomChatbotRelation[] | null;
}

interface MembershipData {
  joined_at: string;
  rooms: RoomData | null;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is a student
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'student') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Use cache for student rooms data
    const cacheKey = `student-rooms:${user.id}`;
    const rooms = await cache.get(
      cacheKey,
      async () => {
        // Fetch rooms the student has joined with chatbot info - MODIFIED QUERY
        const { data: membershipData, error } = await supabase
          .from('room_memberships')
          .select(`
            joined_at,
            rooms!inner(
              room_id,
              room_name,
              room_code,
              is_active,
              created_at,
              room_chatbots(
                chatbots(
                  chatbot_id,
                  name,
                  description
                )
              )
            )
          `)
          .eq('student_id', user.id);

        if (error) {
          throw error;
        }

        // Use unknown first, then cast to our type
        const typedMembershipData = membershipData as unknown as MembershipData[];

        // Transform the data to match expected format
        const roomsData = typedMembershipData?.map(membership => {
          const room = membership.rooms;
          if (!room) return null;
          
          // Extract chatbots from room_chatbots
          const chatbots: ChatbotData[] = [];
          if (room.room_chatbots && room.room_chatbots.length > 0) {
            room.room_chatbots.forEach((rc: RoomChatbotRelation) => {
              if (rc.chatbots) {
                chatbots.push(rc.chatbots);
              }
            });
          }
          
          return {
            ...room,
            joined_at: membership.joined_at,
            chatbots
          };
        }).filter((room): room is NonNullable<typeof room> => room !== null);

        return roomsData || [];
      },
      {
        ttl: CacheTTL.SHORT, // 5 minutes - student rooms don't change frequently
        tags: [CacheTags.STUDENT_ROOMS(user.id), CacheTags.STUDENT(user.id)]
      }
    );

    return createSuccessResponse(rooms);
  } catch (error) {
    console.error('Error fetching student rooms:', error);
    return handleApiError(error);
  }
}