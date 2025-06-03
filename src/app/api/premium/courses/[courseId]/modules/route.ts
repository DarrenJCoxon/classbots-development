import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { CreatePremiumModuleData } from '@/types/premium-course.types';

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
    const body: CreatePremiumModuleData = await request.json();
    
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
        { error: 'Module title is required' },
        { status: 400 }
      );
    }

    // Prepare module data
    const moduleData = {
      course_id: courseId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      module_order: body.module_order || 1,
      is_preview: body.is_preview || false,
      unlock_after_module: body.unlock_after_module || null
    };

    // Create module
    const { data: module, error } = await supabase
      .from('premium_course_modules')
      .insert(moduleData)
      .select()
      .single();

    if (error) {
      console.error('Error creating module:', error);
      return NextResponse.json(
        { error: 'Failed to create module', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ module });
  } catch (error) {
    console.error('Error in modules POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}