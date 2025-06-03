import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { CourseLesson } from '@/types/database.types';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
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

    const { courseId } = await context.params;

    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('course_id', courseId)
      .single();

    if (courseError || !course || course.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found or unauthorized' },
        { status: 404 }
      );
    }

    // Fetch lessons
    const { data: lessons, error } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('lesson_order', { ascending: true });

    if (error) {
      console.error('Error fetching lessons:', error);
      return NextResponse.json(
        { error: 'Failed to fetch lessons' },
        { status: 500 }
      );
    }

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error('Error in lessons GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
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

    const { courseId } = await context.params;

    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('course_id', courseId)
      .single();

    if (courseError || !course || course.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found or unauthorized' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, description, video_url, video_platform, video_duration, lesson_order } = body;

    // Validate required fields
    if (!title || !title.trim() || !video_url || !video_platform) {
      return NextResponse.json(
        { error: 'Title, video URL, and platform are required' },
        { status: 400 }
      );
    }

    // Get the next lesson order if not provided
    let finalLessonOrder = lesson_order;
    if (finalLessonOrder === undefined || finalLessonOrder === null) {
      const { data: existingLessons } = await supabase
        .from('course_lessons')
        .select('lesson_order')
        .eq('course_id', courseId)
        .order('lesson_order', { ascending: false })
        .limit(1);
      
      finalLessonOrder = existingLessons && existingLessons.length > 0 
        ? existingLessons[0].lesson_order + 1 
        : 1;
    }

    // Create new lesson
    const { data: lesson, error } = await supabase
      .from('course_lessons')
      .insert({
        course_id: courseId,
        title: title.trim(),
        description: description?.trim() || null,
        video_url: video_url.trim(),
        video_platform,
        video_duration: video_duration || null,
        lesson_order: finalLessonOrder,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lesson:', error);
      return NextResponse.json(
        { error: 'Failed to create lesson' },
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
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

    const { courseId } = await context.params;

    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('course_id', courseId)
      .single();

    if (courseError || !course || course.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found or unauthorized' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { lesson_id, title, description, video_url, video_platform, video_duration, lesson_order, is_active } = body;

    // Validate required fields
    if (!lesson_id) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    // Verify lesson belongs to course
    const { data: existingLesson, error: checkError } = await supabase
      .from('course_lessons')
      .select('course_id')
      .eq('lesson_id', lesson_id)
      .single();

    if (checkError || !existingLesson || existingLesson.course_id !== courseId) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Partial<CourseLesson> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (video_url !== undefined) updateData.video_url = video_url.trim();
    if (video_platform !== undefined) updateData.video_platform = video_platform;
    if (video_duration !== undefined) updateData.video_duration = video_duration;
    if (lesson_order !== undefined) updateData.lesson_order = lesson_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Update lesson
    const { data: lesson, error } = await supabase
      .from('course_lessons')
      .update(updateData)
      .eq('lesson_id', lesson_id)
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
    console.error('Error in lessons PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
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

    const { courseId } = await context.params;

    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('course_id', courseId)
      .single();

    if (courseError || !course || course.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get lesson ID from query params
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    // Verify lesson belongs to course
    const { data: existingLesson, error: checkError } = await supabase
      .from('course_lessons')
      .select('course_id, lesson_order')
      .eq('lesson_id', lessonId)
      .single();

    if (checkError || !existingLesson || existingLesson.course_id !== courseId) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Delete lesson
    const { error } = await supabase
      .from('course_lessons')
      .delete()
      .eq('lesson_id', lessonId);

    if (error) {
      console.error('Error deleting lesson:', error);
      return NextResponse.json(
        { error: 'Failed to delete lesson' },
        { status: 500 }
      );
    }

    // Reorder remaining lessons
    await supabase.rpc('reorder_lessons_after_delete', {
      p_course_id: courseId,
      p_deleted_order: existingLesson.lesson_order
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in lessons DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}