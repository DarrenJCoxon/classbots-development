import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    console.log('[TEST INSERT] Starting chatbot insert test');
    
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        step: 'auth',
        error: authError?.message || 'No user'
      }, { status: 401 });
    }
    
    const adminClient = createAdminClient();
    
    // Test insert with minimal data
    const testData = {
      name: 'Test Bot ' + Date.now(),
      system_prompt: 'You are a helpful assistant.',
      teacher_id: user.id,
      model: 'openai/gpt-4.1-mini',
      max_tokens: 1000,
      temperature: 0.7,
      enable_rag: false,
      bot_type: 'learning' as const
    };
    
    console.log('[TEST INSERT] Attempting insert with:', testData);
    
    const { data: newBot, error: insertError } = await adminClient
      .from('chatbots')
      .insert(testData)
      .select()
      .single();
      
    if (insertError) {
      console.error('[TEST INSERT] Insert error:', insertError);
      return NextResponse.json({ 
        step: 'insert',
        testData: testData,
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      }, { status: 500 });
    }
    
    // If successful, delete it
    if (newBot) {
      await adminClient
        .from('chatbots')
        .delete()
        .eq('chatbot_id', newBot.chatbot_id);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test insert successful',
      createdBot: newBot
    });
    
  } catch (error) {
    console.error('[TEST INSERT] Unexpected error:', error);
    return NextResponse.json({ 
      step: 'unexpected',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

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