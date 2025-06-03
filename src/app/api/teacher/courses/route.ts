import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Course, CourseWithDetails } from '@/types/database.types';

export async function GET(request: NextRequest) {
  console.log('Courses API: GET request started');
  try {
    const supabase = await createServerSupabaseClient();
    console.log('Courses API: Supabase client created');
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error in courses GET:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      );
    }

    // Fetch teacher's courses with lesson counts
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        course_lessons (
          lesson_id,
          title,
          lesson_order
        )
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }

    // Get enrollment counts for all courses
    const courseIds = courses?.map(c => c.course_id) || [];
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('course_id')
      .in('course_id', courseIds);

    // Calculate stats for each course
    const coursesWithStats: CourseWithDetails[] = courses?.map(course => {
      const enrollmentCount = enrollments?.filter(e => e.course_id === course.course_id).length || 0;
      return {
        ...course,
        lesson_count: course.course_lessons?.length || 0,
        student_count: enrollmentCount
      };
    }) || [];

    return NextResponse.json({ courses: coursesWithStats });
  } catch (error) {
    console.error('Error in courses GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('Courses API: POST request started');
  try {
    const supabase = await createServerSupabaseClient();
    console.log('Courses API: Supabase client created for POST');
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error in courses GET:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log('Courses API: Request body:', body);
    const { title, description, subject, year_group, thumbnail_url } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Course title is required' },
        { status: 400 }
      );
    }

    // Create new course
    const insertData = {
      teacher_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      subject: subject?.trim() || null,
      year_group: year_group?.trim() || null,
      thumbnail_url: thumbnail_url?.trim() || null,
      is_published: false,
      is_active: true
    };
    console.log('Courses API: Inserting course data:', insertData);
    
    const { data: course, error } = await supabase
      .from('courses')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating course:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json(
        { error: 'Failed to create course', details: error.message, code: error.code },
        { status: 500 }
      );
    }
    
    console.log('Courses API: Course created successfully:', course);

    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error in courses POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error in courses GET:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { course_id, title, description, subject, year_group, thumbnail_url, is_published } = body;

    // Validate required fields
    if (!course_id) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existingCourse, error: checkError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('course_id', course_id)
      .single();

    if (checkError || !existingCourse || existingCourse.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found or unauthorized' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Partial<Course> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (subject !== undefined) updateData.subject = subject?.trim() || null;
    if (year_group !== undefined) updateData.year_group = year_group?.trim() || null;
    if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url?.trim() || null;
    if (is_published !== undefined) updateData.is_published = is_published;

    // Update course
    const { data: course, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('course_id', course_id)
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
    console.error('Error in courses PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error in courses GET:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      );
    }

    // Get course ID from query params
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existingCourse, error: checkError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('course_id', courseId)
      .single();

    if (checkError || !existingCourse || existingCourse.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete course (cascade will handle related records)
    const { error } = await supabase
      .from('courses')
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
    console.error('Error in courses DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}