// src/app/api/debug-assessment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Debug endpoint for assessment flow
export async function GET(request: NextRequest) {
  const supabaseAdmin = createAdminClient();
  const supabase = await createServerSupabaseClient();

  try {
    // Step 1: Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Step 2: Check if user is a teacher
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
      
    if (profileError || !profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can access this diagnostic endpoint' }, { status: 403 });
    }
    
    // Step 3: Check if we have any assessment bots
    const { data: assessmentBots, error: botError } = await supabaseAdmin
      .from('chatbots')
      .select('chatbot_id, name, bot_type')
      .eq('bot_type', 'assessment')
      .limit(50);
      
    if (botError) {
      return NextResponse.json({ 
        error: 'Error fetching assessment bots', 
        details: botError.message 
      }, { status: 500 });
    }
    
    // Step 4: Check for assessment messages (commands sent)
    // First count messages containing the assessment trigger
    const { count: assessmentCommandCount, error: commandCountError } = await supabaseAdmin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('content', '/assess')
      .eq('role', 'user');
      
    if (commandCountError) {
      return NextResponse.json({ 
        error: 'Error counting assessment commands', 
        details: commandCountError.message 
      }, { status: 500 });
    }
    
    // Step 5: Check assessment feedback messages (responses)
    const { count: feedbackMessageCount, error: feedbackCountError } = await supabaseAdmin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->>isAssessmentFeedback', 'true');
      
    if (feedbackCountError) {
      return NextResponse.json({ 
        error: 'Error counting assessment feedback messages', 
        details: feedbackCountError.message 
      }, { status: 500 });
    }
    
    // Step 6: Check student_assessments table
    const { data: recentAssessments, count: assessmentCount, error: assessmentError } = await supabaseAdmin
      .from('student_assessments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (assessmentError) {
      return NextResponse.json({ 
        error: 'Error fetching assessments', 
        details: assessmentError.message 
      }, { status: 500 });
    }
    
    // Step 7: Check RLS policies for student_assessments
    let rlsStatus = "Unknown";
    try {
      // Supabase may not have the inspect_table_policies function, so let's handle that gracefully
      try {
        const { data: policyData, error: policyError } = await supabaseAdmin
          .from('student_assessments')
          .select('*')
          .limit(1);
          
        if (policyError) {
          rlsStatus = `Policy error: ${policyError.message}`;
        } else {
          rlsStatus = "Access allowed to student_assessments table";
        }
      } catch (innerError) {
        rlsStatus = `Error checking table access: ${innerError instanceof Error ? innerError.message : String(innerError)}`;
      }
    } catch (rlsError) {
      rlsStatus = `Error checking RLS: ${rlsError instanceof Error ? rlsError.message : String(rlsError)}`;
    }
    
    // Return diagnostics data
    return NextResponse.json({
      assessmentDiagnostics: {
        assessmentBots: {
          count: assessmentBots?.length || 0,
          bots: assessmentBots || []
        },
        assessmentCommands: {
          count: assessmentCommandCount || 0
        },
        feedbackMessages: {
          count: feedbackMessageCount || 0
        },
        studentAssessments: {
          count: assessmentCount || 0,
          recent: recentAssessments || []
        },
        rlsStatus
      }
    });
  } catch (error) {
    console.error("[DEBUG Assessment] Unhandled error:", error);
    return NextResponse.json({ 
      error: 'Diagnostic error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}