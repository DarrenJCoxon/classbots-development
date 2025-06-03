import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { PremiumLessonNote } from '@/types/premium-course.types';

// GET - Fetch all notes for a lesson
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
    
    // Verify user has access to this lesson (either teacher or enrolled student)
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

    // Check if user is teacher or enrolled student
    const isTeacher = (lesson.premium_courses as any).teacher_id === user.id;
    let hasAccess = isTeacher;

    if (!isTeacher) {
      // Check if student is enrolled
      const { data: enrollment } = await supabase
        .from('premium_course_enrollments')
        .select('enrollment_id')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single();
      
      hasAccess = !!enrollment;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch notes - teachers see all notes, students see only their own
    let notesQuery = supabase
      .from('premium_lesson_notes')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false });

    if (!isTeacher) {
      notesQuery = notesQuery.eq('student_id', user.id);
    }

    const { data: notes, error: notesError } = await notesQuery;

    if (notesError) {
      console.error('Error fetching notes:', notesError);
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notes: notes || [],
      isTeacher
    });

  } catch (error) {
    console.error('Error in notes GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new note
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
    
    // Validate required fields
    if (!body.content || !body.content.trim()) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this lesson (teacher or enrolled student)
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
    let enrollment = null;

    if (isTeacher) {
      // Teachers don't need enrollment - create a dummy enrollment record or handle differently
      // For now, we'll allow teacher notes but they won't be linked to an enrollment
    } else {
      // Check if student is enrolled
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('premium_course_enrollments')
        .select('enrollment_id')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single();

      if (enrollmentError || !enrollmentData) {
        return NextResponse.json({ error: 'Access denied - not enrolled' }, { status: 403 });
      }
      
      enrollment = enrollmentData;
    }

    if (!isTeacher && !enrollment) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create note
    const noteData = {
      lesson_id: lessonId,
      enrollment_id: enrollment ? enrollment.enrollment_id : null,
      note_content: body.content.trim(),
      video_timestamp: body.video_timestamp || null
    };

    const { data: note, error } = await supabase
      .from('premium_lesson_notes')
      .insert(noteData)
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      );
    }

    // Update notes count in progress
    await supabase.rpc('increment_notes_count', {
      p_lesson_id: lessonId,
      p_student_id: user.id
    });

    return NextResponse.json({
      success: true,
      note
    });

  } catch (error) {
    console.error('Error in notes POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}