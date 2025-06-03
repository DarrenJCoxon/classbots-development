import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
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

    const { courseId, lessonId } = await params;
    
    // Fetch lesson with course details
    const { data: lesson, error: lessonError } = await supabase
      .from('premium_course_lessons')
      .select(`
        *,
        premium_course_modules (
          module_id,
          title,
          premium_courses (
            course_id,
            title,
            teacher_id
          )
        )
      `)
      .eq('lesson_id', lessonId)
      .eq('course_id', courseId)
      .single();

    if (lessonError || !lesson) {
      console.error('Lesson fetch error:', lessonError);
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Check if user owns this course
    if (lesson.premium_course_modules.premium_courses.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      lesson
    });

  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
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

    const { courseId, lessonId } = await params;
    const body = await request.json();
    
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

    // Verify lesson belongs to course
    const { data: existingLesson, error: lessonError } = await supabase
      .from('premium_course_lessons')
      .select('course_id')
      .eq('lesson_id', lessonId)
      .eq('course_id', courseId)
      .single();

    if (lessonError || !existingLesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Update lesson
    const { data: lesson, error } = await supabase
      .from('premium_course_lessons')
      .update({
        title: body.title?.trim(),
        description: body.description?.trim() || null,
        lesson_order: body.lesson_order,
        lesson_type: body.lesson_type,
        video_url: body.video_url?.trim() || null,
        video_duration_seconds: body.video_duration_seconds || null,
        video_thumbnail_url: body.video_thumbnail_url?.trim() || null,
        video_quality_levels: body.video_quality_levels || null,
        content_data: body.content_data || null,
        is_preview: body.is_preview || false,
        is_mandatory: body.is_mandatory !== false,
        estimated_duration_minutes: body.estimated_duration_minutes || null,
        downloadable_resources: body.downloadable_resources || null
      })
      .eq('lesson_id', lessonId)
      .select()
      .single();

    if (error) {
      console.error('Error updating lesson:', error);
      return NextResponse.json(
        { error: 'Failed to update lesson' },
        { status: 500 }
      );
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error('Error in lesson PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
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

    const { courseId, lessonId } = await params;
    
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

    // Delete lesson
    const { error } = await supabase
      .from('premium_course_lessons')
      .delete()
      .eq('lesson_id', lessonId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error deleting lesson:', error);
      return NextResponse.json(
        { error: 'Failed to delete lesson' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in lesson DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}