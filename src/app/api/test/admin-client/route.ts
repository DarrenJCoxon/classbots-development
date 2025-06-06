// src/app/api/test/admin-client/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatbotId = searchParams.get('chatbotId');
    
    const supabaseAdmin = createAdminClient();
    
    // Test 1: Can we query chatbots at all?
    const { data: allChatbots, error: allError } = await supabaseAdmin
      .from('chatbots')
      .select('chatbot_id, name, teacher_id')
      .limit(5);
    
    // Test 2: Can we query a specific chatbot?
    let specificChatbot = null;
    let specificError = null;
    if (chatbotId) {
      const result = await supabaseAdmin
        .from('chatbots')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .single();
      specificChatbot = result.data;
      specificError = result.error;
    }
    
    // Test 3: Check auth status
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
    
    return NextResponse.json({
      tests: {
        canQueryChatbots: !allError,
        chatbotsFound: allChatbots?.length || 0,
        allError: allError?.message || null,
        specificChatbot: specificChatbot,
        specificError: specificError?.message || null,
        authUser: user?.id || null,
        authError: authError?.message || null,
        serviceRoleKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabaseUrlExists: !!process.env.NEXT_PUBLIC_SUPABASE_URL
      },
      chatbots: allChatbots
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}