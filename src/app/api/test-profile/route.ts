import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    console.log('[TEST] Starting profile test');
    
    // Test 1: Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        step: 'auth',
        error: authError?.message || 'No user'
      }, { status: 401 });
    }
    
    console.log('[TEST] User authenticated:', user.id);
    
    // Test 2: Create admin client
    const adminClient = createAdminClient();
    console.log('[TEST] Admin client created');
    
    // Test 3: Query profiles view
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (profileError) {
      console.error('[TEST] Profile query error:', profileError);
      return NextResponse.json({ 
        step: 'profile_query',
        error: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint
      }, { status: 500 });
    }
    
    // Test 4: Try to query chatbots table
    const { data: chatbots, error: chatbotsError } = await adminClient
      .from('chatbots')
      .select('chatbot_id, name')
      .eq('teacher_id', user.id)
      .limit(1);
      
    if (chatbotsError) {
      console.error('[TEST] Chatbots query error:', chatbotsError);
      return NextResponse.json({ 
        step: 'chatbots_query',
        profile: profile,
        error: chatbotsError.message,
        code: chatbotsError.code,
        details: chatbotsError.details
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      profile: profile,
      chatbotsCount: chatbots?.length || 0
    });
    
  } catch (error) {
    console.error('[TEST] Unexpected error:', error);
    return NextResponse.json({ 
      step: 'unexpected',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}