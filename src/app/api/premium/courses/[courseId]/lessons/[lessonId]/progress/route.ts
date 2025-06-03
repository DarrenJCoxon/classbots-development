import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET - Fetch progress for a lesson
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
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId'); // For teachers viewing student progress
    
    // Verify access
    const { data: lesson, error: lessonError } = await supabase
      .from('premium_course_lessons')
      .select(`
        lesson_id,
        course_id,
        premium_courses (
          teacher_id
        )
      `)
      .eq('lesson_id', lessonId)
      .eq('course_id', courseId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const isTeacher = (lesson.premium_courses as any).teacher_id === user.id;
    const targetStudentId = studentId || user.id;

    // If requesting someone else's progress, must be teacher
    if (studentId && studentId !== user.id && !isTeacher) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get enrollment for progress tracking
    let targetEnrollment = null;
    
    if (isTeacher && studentId) {
      // Teacher viewing specific student's progress
      const { data: enrollment } = await supabase
        .from('premium_course_enrollments')
        .select('enrollment_id')
        .eq('course_id', courseId)
        .eq('student_id', studentId)
        .eq('status', 'active')
        .single();
      
      targetEnrollment = enrollment;
    } else if (!isTeacher) {
      // Student viewing their own progress
      const { data: enrollment } = await supabase
        .from('premium_course_enrollments')
        .select('enrollment_id')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single();
      
      if (!enrollment) {
        return NextResponse.json({ error: 'Access denied - not enrolled' }, { status: 403 });
      }
      
      targetEnrollment = enrollment;
    } else {
      // Teacher viewing their own progress - teachers don't have enrollment records
      return NextResponse.json({
        success: true,
        progress: null,
        message: 'Teachers do not have progress records'
      });
    }

    if (!targetEnrollment) {
      return NextResponse.json({
        success: true,
        progress: null,
        message: 'No enrollment found'
      });
    }

    // Fetch progress using enrollment_id
    const { data: progress, error: progressError } = await supabase
      .from('premium_lesson_progress')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('enrollment_id', targetEnrollment.enrollment_id)
      .single();

    // If no progress exists, create initial record
    if (progressError && progressError.code === 'PGRST116') {
      const initialProgress = {
        lesson_id: lessonId,
        enrollment_id: targetEnrollment.enrollment_id,
        is_completed: false,
        progress_percentage: 0,
        watch_time_seconds: 0,
        video_position_seconds: 0,
        playback_speed: 1.0,
        rewatch_count: 0,
        notes_count: 0,
        questions_asked: 0,
        started_at: new Date().toISOString(),
        last_accessed: new Date().toISOString()
      };

      const { data: newProgress, error: createError } = await supabase
        .from('premium_lesson_progress')
        .insert(initialProgress)
        .select()
        .single();

      if (!createError) {
        return NextResponse.json({
          success: true,
          progress: newProgress
        });
      }
    }

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      progress
    });

  } catch (error) {
    console.error('Error in progress GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update progress
export async function POST(
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
    
    // Verify enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('premium_course_enrollments')
      .select('enrollment_id')
      .eq('course_id', courseId)
      .eq('student_id', user.id)
      .eq('status', 'active')
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update progress
    const updateData: any = {
      last_accessed: new Date().toISOString()
    };

    if (body.progress_percentage !== undefined) {
      updateData.progress_percentage = Math.max(0, Math.min(100, body.progress_percentage));
    }
    if (body.watch_time_seconds !== undefined) {
      updateData.watch_time_seconds = Math.max(0, body.watch_time_seconds);
    }
    if (body.video_position_seconds !== undefined) {
      updateData.video_position_seconds = Math.max(0, body.video_position_seconds);
    }
    if (body.video_segments_watched !== undefined) {
      updateData.video_segments_watched = body.video_segments_watched;
    }
    if (body.playback_speed !== undefined) {
      updateData.playback_speed = body.playback_speed;
    }
    if (body.is_completed !== undefined) {
      updateData.is_completed = body.is_completed;
      if (body.is_completed && !body.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
    }

    const { data: progress, error } = await supabase
      .from('premium_lesson_progress')
      .upsert({
        lesson_id: lessonId,
        enrollment_id: enrollment.enrollment_id,
        ...updateData
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating progress:', error);
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      progress
    });

  } catch (error) {
    console.error('Error in progress POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}