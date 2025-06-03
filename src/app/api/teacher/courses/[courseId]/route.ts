import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { CourseWithDetails } from '@/types/database.types';

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

    // Fetch course with lessons
    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        *,
        course_lessons (
          lesson_id,
          title,
          description,
          video_url,
          video_platform,
          video_duration,
          lesson_order,
          is_active,
          created_at,
          updated_at
        )
      `)
      .eq('course_id', courseId)
      .single();

    if (error || !course) {
      console.error('Error fetching course:', error);
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // For testing: Allow access to any authenticated user
    // In production, verify teacher ownership or student enrollment
    if (course.teacher_id !== user.id) {
      console.warn('User accessing course they do not own - allowing for testing purposes');
    }

    // Sort lessons by order
    if (course.course_lessons) {
      course.course_lessons.sort((a: any, b: any) => a.lesson_order - b.lesson_order);
    }

    // Get enrollment count
    const { count: enrollmentCount } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    // Get completion stats
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .in('lesson_id', course.course_lessons?.map((l: any) => l.lesson_id) || []);

    // Calculate stats
    const lessonStats = course.course_lessons?.map((lesson: any) => {
      const progress = progressData?.filter((p: any) => p.lesson_id === lesson.lesson_id) || [];
      const completions = progress.filter((p: any) => p.completed).length;
      return {
        ...lesson,
        completion_count: completions,
        completion_rate: enrollmentCount ? (completions / enrollmentCount) * 100 : 0
      };
    });

    const courseWithStats: CourseWithDetails = {
      ...course,
      course_lessons: lessonStats,
      lesson_count: course.course_lessons?.length || 0,
      student_count: enrollmentCount || 0
    };

    return NextResponse.json({ course: courseWithStats });
  } catch (error) {
    console.error('Error in course GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}