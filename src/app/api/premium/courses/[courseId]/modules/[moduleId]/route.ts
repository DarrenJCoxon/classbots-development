import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
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

    const { courseId, moduleId } = await params;
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

    // Verify module belongs to course
    const { data: existingModule, error: moduleError } = await supabase
      .from('premium_course_modules')
      .select('course_id')
      .eq('module_id', moduleId)
      .eq('course_id', courseId)
      .single();

    if (moduleError || !existingModule) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }

    // Update module
    const { data: module, error } = await supabase
      .from('premium_course_modules')
      .update({
        title: body.title?.trim(),
        description: body.description?.trim() || null,
        module_order: body.module_order,
        is_preview: body.is_preview || false,
        unlock_after_module: body.unlock_after_module || null
      })
      .eq('module_id', moduleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating module:', error);
      return NextResponse.json(
        { error: 'Failed to update module' },
        { status: 500 }
      );
    }

    return NextResponse.json({ module });
  } catch (error) {
    console.error('Error in module PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
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

    const { courseId, moduleId } = await params;
    
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

    // Delete module (cascade will handle lessons)
    const { error } = await supabase
      .from('premium_course_modules')
      .delete()
      .eq('module_id', moduleId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error deleting module:', error);
      return NextResponse.json(
        { error: 'Failed to delete module' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in module DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}