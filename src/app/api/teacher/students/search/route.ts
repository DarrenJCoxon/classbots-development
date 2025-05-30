// src/app/api/teacher/students/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const supabaseAdmin = createAdminClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized - teachers only' }, { status: 403 });
    }
    
    // Get search parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase() || '';
    const roomId = searchParams.get('room_id');
    
    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }
    
    // Search for students by name or username
    const { data: students, error } = await supabaseAdmin
      .from('student_profiles')
      .select(`
        user_id,
        first_name,
        surname,
        full_name,
        username,
        school_id
      `)
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,first_name.ilike.%${query}%,surname.ilike.%${query}%`)
      .limit(20);
      
    if (error) {
      console.error('Error searching students:', error);
      return NextResponse.json({ error: 'Failed to search students' }, { status: 500 });
    }
    
    // If roomId provided, check which students are already in the room
    let existingMemberIds: string[] = [];
    if (roomId) {
      const { data: memberships } = await supabaseAdmin
        .from('room_memberships')
        .select('student_id')
        .eq('room_id', roomId);
        
      existingMemberIds = memberships?.map(m => m.student_id) || [];
    }
    
    // Format response with membership status
    const formattedStudents = students?.map(student => ({
      ...student,
      display_name: student.full_name || `${student.first_name} ${student.surname}`,
      is_member: roomId ? existingMemberIds.includes(student.user_id) : false
    })) || [];
    
    return NextResponse.json({
      students: formattedStudents,
      total: formattedStudents.length
    });
    
  } catch (error) {
    console.error('Student search error:', error);
    return NextResponse.json(
      { error: 'Failed to search students' },
      { status: 500 }
    );
  }
}