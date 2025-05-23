// Debug endpoint to test chat API connectivity
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Check environment variables
    results.checks.environment = {
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not set'
    };

    // Check Supabase connection
    try {
      const supabase = createAdminClient();
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      results.checks.supabase = {
        connected: !error,
        error: error?.message || null,
        profileCount: count || 0
      };
    } catch (e) {
      results.checks.supabase = {
        connected: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // Check OpenRouter connectivity
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        }
      });
      
      results.checks.openrouter = {
        connected: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (e) {
      results.checks.openrouter = {
        connected: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      error: 'Debug check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 });
  }
}