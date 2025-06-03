import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
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

    // Fetch course details with modules and lessons
    const { data: course, error: courseError } = await supabase
      .from('premium_courses')
      .select(`
        *,
        premium_course_modules (
          module_id,
          title,
          description,
          module_order,
          is_preview,
          unlock_after_module,
          created_at,
          updated_at,
          premium_course_lessons (
            lesson_id,
            title,
            description,
            lesson_order,
            lesson_type,
            video_url,
            video_duration_seconds,
            video_thumbnail_url,
            video_quality_levels,
            content_data,
            is_preview,
            is_mandatory,
            estimated_duration_minutes,
            downloadable_resources,
            created_at,
            updated_at
          )
        )
      `)
      .eq('course_id', courseId)
      .eq('teacher_id', user.id) // Ensure teacher owns the course
      .single();

    if (courseError || !course) {
      console.error('Error fetching course:', courseError);
      return NextResponse.json(
        { error: 'Course not found or unauthorized' },
        { status: 404 }
      );
    }

    // Sort modules and lessons by order
    const modules = (course.premium_course_modules || [])
      .sort((a: any, b: any) => a.module_order - b.module_order)
      .map((module: any) => ({
        ...module,
        lessons: (module.premium_course_lessons || [])
          .sort((a: any, b: any) => a.lesson_order - b.lesson_order)
      }));

    // Calculate additional stats
    const totalLessons = modules.reduce((sum: number, module: any) => sum + module.lessons.length, 0);
    const totalDuration = modules.reduce((sum: number, module: any) => 
      sum + module.lessons.reduce((lessonSum: number, lesson: any) => 
        lessonSum + (lesson.estimated_duration_minutes || 0), 0
      ), 0
    );

    const courseWithDetails = {
      ...course,
      module_count: modules.length,
      lesson_count: totalLessons,
      total_duration_minutes: totalDuration
    };

    return NextResponse.json({
      course: courseWithDetails,
      modules
    });
  } catch (error) {
    console.error('Error in course details GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const body = await request.json();

    // Verify ownership
    const { data: existingCourse, error: checkError } = await supabase
      .from('premium_courses')
      .select('teacher_id')
      .eq('course_id', courseId)
      .single();

    if (checkError || !existingCourse || existingCourse.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update course
    const { data: course, error } = await supabase
      .from('premium_courses')
      .update(body)
      .eq('course_id', courseId)
      .select()
      .single();

    if (error) {
      console.error('Error updating course:', error);
      return NextResponse.json(
        { error: 'Failed to update course' },
        { status: 500 }
      );
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error in course details PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Verify ownership
    const { data: existingCourse, error: checkError } = await supabase
      .from('premium_courses')
      .select('teacher_id')
      .eq('course_id', courseId)
      .single();

    if (checkError || !existingCourse || existingCourse.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete course (cascade will handle modules and lessons)
    const { error } = await supabase
      .from('premium_courses')
      .delete()
      .eq('course_id', courseId);

    if (error) {
      console.error('Error deleting course:', error);
      return NextResponse.json(
        { error: 'Failed to delete course' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in course details DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}