// src/app/api/teacher/rooms/[roomId]/students/add-by-year/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// For Next.js 15.3.1, we need to use any for dynamic route params
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(request: NextRequest, { params }: any) {
  try {
    // Need to await params in Next.js 15.3+
    const awaitedParams = await params;
    const roomId = awaitedParams.roomId;
    
    const supabase = await createServerSupabaseClient();
    const supabaseAdmin = createAdminClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user owns this room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*, school_id')
      .eq('room_id', roomId)
      .eq('teacher_id', user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found or unauthorized' }, { status: 404 });
    }
    
    // Get request body
    const { year_group } = await request.json();
    
    if (!year_group) {
      return NextResponse.json({ error: 'Year group is required' }, { status: 400 });
    }
    
    console.log(`[Add by Year] Adding all ${year_group} students to room ${roomId}`);
    
    // Get all students in this year group from the same school
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('student_profiles')
      .select('user_id, full_name, first_name, surname, username')
      .eq('school_id', room.school_id)
      .eq('year_group', year_group);
      
    if (studentsError) {
      console.error('[Add by Year] Error fetching students:', studentsError);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }
    
    if (!students || students.length === 0) {
      return NextResponse.json({ 
        message: `No students found in ${year_group}`,
        added: 0,
        already_members: 0
      });
    }
    
    // Get existing memberships to avoid duplicates
    const studentIds = students.map(s => s.user_id);
    const { data: existingMemberships } = await supabaseAdmin
      .from('room_memberships')
      .select('student_id')
      .eq('room_id', roomId)
      .in('student_id', studentIds);
      
    const existingMemberIds = new Set(existingMemberships?.map(m => m.student_id) || []);
    
    // Filter out students who are already members
    const newStudents = students.filter(s => !existingMemberIds.has(s.user_id));
    
    if (newStudents.length === 0) {
      return NextResponse.json({
        message: `All ${year_group} students are already in this room`,
        added: 0,
        already_members: students.length
      });
    }
    
    // Add new students to the room
    const memberships = newStudents.map(student => ({
      room_id: roomId,
      student_id: student.user_id,
      joined_at: new Date().toISOString()
    }));
    
    const { error: insertError } = await supabaseAdmin
      .from('room_memberships')
      .insert(memberships);
      
    if (insertError) {
      console.error('[Add by Year] Error adding students:', insertError);
      return NextResponse.json({ error: 'Failed to add students to room' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully added ${newStudents.length} ${year_group} students`,
      added: newStudents.length,
      already_members: existingMemberIds.size,
      total_in_year: students.length,
      added_students: newStudents.map(s => ({
        user_id: s.user_id,
        name: s.full_name || `${s.first_name} ${s.surname}`,
        username: s.username
      }))
    });
    
  } catch (error) {
    console.error('[Add by Year] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add students by year group' },
      { status: 500 }
    );
  }
}