import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { CreatePremiumLessonData } from '@/types/premium-course.types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { courseId } = await params;
    const body: CreatePremiumLessonData = await request.json();
    
    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('premium_courses')
      .select('teacher_id')
      .eq('course_id', courseId)
      .single();

    if (courseError || !course || course.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found or unauthorized' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: 'Lesson title is required' },
        { status: 400 }
      );
    }

    // Verify module exists if provided
    if (body.module_id) {
      const { data: module, error: moduleError } = await supabase
        .from('premium_course_modules')
        .select('module_id')
        .eq('module_id', body.module_id)
        .eq('course_id', courseId)
        .single();

      if (moduleError || !module) {
        return NextResponse.json(
          { error: 'Module not found' },
          { status: 400 }
        );
      }
    }

    // Prepare lesson data
    const lessonData = {
      course_id: courseId,
      module_id: body.module_id || null,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      lesson_order: body.lesson_order || 1,
      lesson_type: body.lesson_type || 'video',
      video_url: body.video_url?.trim() || null,
      video_duration_seconds: body.video_duration_seconds || null,
      video_thumbnail_url: body.video_thumbnail_url?.trim() || null,
      video_quality_levels: body.video_quality_levels || null,
      content_data: body.content_data || null,
      is_preview: body.is_preview || false,
      is_mandatory: body.is_mandatory !== false, // Default to true
      estimated_duration_minutes: body.estimated_duration_minutes || null,
      downloadable_resources: body.downloadable_resources || null
    };

    // Create lesson
    const { data: lesson, error } = await supabase
      .from('premium_course_lessons')
      .insert(lessonData)
      .select()
      .single();

    if (error) {
      console.error('Error creating lesson:', error);
      return NextResponse.json(
        { error: 'Failed to create lesson', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error('Error in lessons POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}