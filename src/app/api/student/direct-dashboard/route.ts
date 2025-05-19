// src/app/api/student/direct-dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Room } from '@/types/database.types';

// Simple in-memory cache to reduce database load
interface CacheEntry {
  data: {
    profile: Record<string, unknown>;
    rooms: RoomWithChatbots[];
    isAnonymous: boolean;
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
    
    // If no memberships, return early with empty rooms
    if (!memberships || memberships.length === 0) {
      // Determine if this is a temporary user based on pin_code/username
      const isAnonymous = !profile.pin_code || !profile.username;
      
      return NextResponse.json({
        profile,
        rooms: [],
        isAnonymous
      });
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
    
    // Prepare response data
    const responseData = {
      profile,
      rooms: roomsWithChatbots,
      isAnonymous
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