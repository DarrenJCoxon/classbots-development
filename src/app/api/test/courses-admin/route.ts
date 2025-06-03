import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Parse request body
    const body = await request.json();
    console.log('Admin test - Creating course:', body);
    
    // Create course bypassing RLS
    const { data: course, error } = await supabaseAdmin
      .from('courses')
      .insert({
        teacher_id: body.teacher_id || '622e771d-41fc-4213-bdfc-02dcc6b2e806',
        title: body.title || 'Test Course',
        description: body.description || 'Test Description',
        is_published: false,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('Admin test - Error creating course:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
    
    console.log('Admin test - Course created successfully:', course);
    return NextResponse.json({ course });
  } catch (error) {
    console.error('Admin test - Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}