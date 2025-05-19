// src/app/api/teacher/dashboard-stats/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  console.log('\n--- [API GET /dashboard-stats] ---');
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[API STATS] Not authenticated.', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    console.log('[API STATS] User authenticated:', user.id);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[API STATS] Profile fetch failed or not found:', profileError?.message);
      return NextResponse.json({ error: `Profile fetch issue: ${profileError?.message || 'Not found'}` }, { status: 500 });
    }
    if (profile.role !== 'teacher') {
      console.warn('[API STATS] User is not a teacher. Role:', profile.role);
      return NextResponse.json({ error: 'Not authorized (not a teacher)' }, { status: 403 });
    }
    console.log('[API STATS] User is teacher. Proceeding with stats.');
    
    // Create admin client to bypass RLS policies
    const supabaseAdmin = createAdminClient();
    
    // Fetch all stats concurrently using admin client
    const [
        chatbotsResult,
        roomsResult,
        activeRoomsResult,
        pendingConcernsResult
    ] = await Promise.all([
        supabaseAdmin
            .from('chatbots')
            .select('chatbot_id', { count: 'exact', head: true })
            .eq('teacher_id', user.id),
        supabaseAdmin
            .from('rooms')
            .select('room_id', { count: 'exact', head: true })
            .eq('teacher_id', user.id),
        supabaseAdmin
            .from('rooms')
            .select('room_id', { count: 'exact', head: true })
            .eq('teacher_id', user.id)
            .eq('is_active', true),
        supabaseAdmin
            .from('flagged_messages')
            .select('flag_id', { count: 'exact', head: true })
            .eq('teacher_id', user.id)
            .eq('status', 'pending') // Count only PENDING concerns
    ]);

    // Error handling for each query (optional, but good for debugging)
    if (chatbotsResult.error) console.error('[API STATS] Error fetching chatbots count:', chatbotsResult.error.message);
    if (roomsResult.error) console.error('[API STATS] Error fetching total rooms count:', roomsResult.error.message);
    if (activeRoomsResult.error) console.error('[API STATS] Error fetching active rooms count:', activeRoomsResult.error.message);
    if (pendingConcernsResult.error) console.error('[API STATS] Error fetching pending concerns count:', pendingConcernsResult.error.message);

    const stats = {
      totalChatbots: chatbotsResult.count || 0,
      totalRooms: roomsResult.count || 0,
      activeRooms: activeRoomsResult.count || 0,
      pendingConcerns: pendingConcernsResult.count || 0, // <<<< Use the actual count
    };
    
    console.log('[API STATS] Returning stats:', stats);
    return NextResponse.json(stats);

  } catch (error: unknown) {
    const typedError = error as Error;
    console.error('[API STATS] CATCH BLOCK Error:', typedError.message);
    return NextResponse.json({ error: typedError.message || 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}