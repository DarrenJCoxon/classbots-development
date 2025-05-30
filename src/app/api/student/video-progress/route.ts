// API endpoint to track video progress
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, studentId, roomId, chatbotId, videoUrl, percentageComplete, completed } = body;

    if (!studentId || !roomId || !chatbotId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if request is from authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Use admin client for all operations to bypass RLS
    const supabaseAdmin = createAdminClient();

    // Verify the student has access to this room
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('room_memberships')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('student_id', studentId)
      .single();

    if (membershipError || !membership) {
      console.error('[video-progress] Membership check failed:', membershipError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (action === 'get') {
      // Get current progress using admin client
      const { data: progress, error } = await supabaseAdmin
        .from('student_video_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('room_id', roomId)
        .eq('chatbot_id', chatbotId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[video-progress] Error fetching progress:', error);
        return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
      }

      // If progress is complete, also fetch linked assessment bot info
      let linkedAssessmentBot = null;
      if (progress && progress.percentage_complete >= 90) {
        const { data: chatbot } = await supabaseAdmin
          .from('chatbots')
          .select('linked_assessment_bot_id')
          .eq('chatbot_id', chatbotId)
          .single();
        
        if (chatbot?.linked_assessment_bot_id) {
          const { data: assessmentBot } = await supabaseAdmin
            .from('chatbots')
            .select('chatbot_id, name')
            .eq('chatbot_id', chatbot.linked_assessment_bot_id)
            .single();
          
          linkedAssessmentBot = assessmentBot;
        }
      }

      return NextResponse.json({ 
        progress: progress || null,
        linkedAssessmentBot 
      });
    } 
    
    if (action === 'update') {
      // Update or create progress
      const progressData = {
        student_id: studentId,
        room_id: roomId,
        chatbot_id: chatbotId,
        video_url: videoUrl,
        percentage_complete: Math.min(100, percentageComplete),
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const { data: existing } = await supabaseAdmin
        .from('student_video_progress')
        .select('id')
        .eq('student_id', studentId)
        .eq('room_id', roomId)
        .eq('chatbot_id', chatbotId)
        .single();

      let result;
      if (existing) {
        // Update existing record
        result = await supabaseAdmin
          .from('student_video_progress')
          .update(progressData)
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        // Create new record
        result = await supabaseAdmin
          .from('student_video_progress')
          .insert(progressData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error updating video progress:', result.error);
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
      }

      // If video is completed and there's a linked assessment, return that info
      if (completed && percentageComplete >= 90) {
        const { data: chatbot } = await supabaseAdmin
          .from('chatbots')
          .select('linked_assessment_bot_id')
          .eq('chatbot_id', chatbotId)
          .single();

        if (chatbot?.linked_assessment_bot_id) {
          const { data: assessmentBot } = await supabaseAdmin
            .from('chatbots')
            .select('chatbot_id, name')
            .eq('chatbot_id', chatbot.linked_assessment_bot_id)
            .single();
          
          if (assessmentBot) {
            return NextResponse.json({ 
              progress: result.data,
              linkedAssessmentBot: assessmentBot
            });
          }
        }
      }

      return NextResponse.json({ progress: result.data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in video progress API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}