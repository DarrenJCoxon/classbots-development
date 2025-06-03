import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { CreatePremiumCourseData, PremiumCourse } from '@/types/premium-course.types';

// Helper function to generate URL-friendly slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const status = searchParams.get('status'); // published, draft, all
    
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('premium_courses')
      .select(`
        *,
        premium_course_modules (
          module_id,
          title,
          module_order,
          premium_course_lessons (
            lesson_id,
            title,
            lesson_order,
            lesson_type,
            estimated_duration_minutes
          )
        )
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    
    if (status === 'published') {
      query = query.eq('is_published', true);
    } else if (status === 'draft') {
      query = query.eq('is_published', false);
    }

    // Execute query with pagination
    const { data: courses, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching premium courses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }

    // Calculate additional stats for each course
    // @ts-ignore
    const coursesWithStats = courses?.map(course => {
      const modules = course.premium_course_modules || [];
      // @ts-ignore
      const allLessons = modules.flatMap(module => module.premium_course_lessons || []);
      
      return {
        ...course,
        module_count: modules.length,
        lesson_count: allLessons.length,
        // @ts-ignore
        total_duration_minutes: allLessons.reduce((sum, lesson) => 
          sum + (lesson.estimated_duration_minutes || 0), 0
        )
      };
    }) || [];

    return NextResponse.json({
      courses: coursesWithStats,
      total: count || 0,
      page,
      limit
    });
  } catch (error) {
    console.error('Error in premium courses GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body: CreatePremiumCourseData = await request.json();
    
    // Validate required fields
    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: 'Course title is required' },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    let slug = body.slug || generateSlug(body.title);
    
    // Ensure slug is unique
    const { data: existingCourse } = await supabase
      .from('premium_courses')
      .select('course_id')
      .eq('slug', slug)
      .single();
    
    if (existingCourse) {
      // Append timestamp to make it unique
      slug = `${slug}-${Date.now()}`;
    }

    // Prepare course data
    // @ts-ignore
    const courseData: Partial<PremiumCourse> = {
      teacher_id: user.id,
      title: body.title.trim(),
      slug,
      description: body.description?.trim() || undefined,
      short_description: body.short_description?.trim() || undefined,
      thumbnail_url: body.thumbnail_url?.trim() || undefined,
      trailer_video_url: body.trailer_video_url?.trim() || undefined,
      difficulty_level: body.difficulty_level || undefined,
      estimated_duration_hours: body.estimated_duration_hours || undefined,
      language: body.language || 'en',
      category: body.category?.trim() || undefined,
      tags: body.tags || [],
      price_type: body.price_type || 'free',
      price_amount: body.price_amount || 0,
      currency: body.currency || 'USD',
      requires_approval: body.requires_approval || false,
      max_students: body.max_students || undefined,
      meta_title: body.meta_title?.trim() || body.title.trim(),
      meta_description: body.meta_description?.trim() || body.short_description?.trim(),
      is_published: false,
      is_featured: false
    };

    // Create course
    const { data: course, error } = await supabase
      .from('premium_courses')
      .insert(courseData)
      .select()
      .single();

    if (error) {
      console.error('Error creating premium course:', error);
      return NextResponse.json(
        { error: 'Failed to create course', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error in premium courses POST:', error);
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { course_id, ...updateData } = body;

    if (!course_id) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existingCourse, error: checkError } = await supabase
      .from('premium_courses')
      .select('teacher_id')
      .eq('course_id', course_id)
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
      .update(updateData)
      .eq('course_id', course_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating premium course:', error);
      return NextResponse.json(
        { error: 'Failed to update course' },
        { status: 500 }
      );
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error in premium courses PUT:', error);
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
      return NextResponse.json(
        { error: 'Unauthorized' },
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

    // Delete course (cascade will handle related records)
    const { error } = await supabase
      .from('premium_courses')
      .delete()
      .eq('course_id', courseId);

    if (error) {
      console.error('Error deleting premium course:', error);
      return NextResponse.json(
        { error: 'Failed to delete course' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in premium courses DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}