// src/app/api/homepage-chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET handler for homepage chat data
 * This is a simplified endpoint that only returns the most recent messages for the homepage
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const chatbotId = searchParams.get('chatbotId');
    
    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }
    
    // Get current user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Use admin client to bypass RLS policies completely
    const supabaseAdmin = createAdminClient();
    
    // Get profile for role check
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
      
    if (profileError) {
      console.error('[Homepage Chat API] Profile error:', profileError);
      return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 });
    }
    
    // For students, verify room membership
    if (profile.role === 'student') {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('room_memberships')
        .select('room_id')
        .eq('room_id', roomId)
        .eq('student_id', user.id)
        .maybeSingle();
        
      if (membershipError) {
        console.error('[Homepage Chat API] Membership check error:', membershipError);
      }
      
      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });
      }
    }
    
    // Query for messages
    let query = supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .or(`user_id.eq.${user.id},role.eq.assistant,role.eq.system`);
      
    if (chatbotId) {
      query = query.filter('metadata->>chatbotId', 'eq', chatbotId);
    }
    
    // Limit to most recent 20 messages
    const { data: messages, error: messagesError } = await query
      .order('created_at', { ascending: true })
      .limit(20);
      
    if (messagesError) {
      console.error('[Homepage Chat API] Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
    
    return NextResponse.json(messages || []);
  } catch (error) {
    console.error('[Homepage Chat API] Unhandled error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown server error' },
      { status: 500 }
    );
  }
}