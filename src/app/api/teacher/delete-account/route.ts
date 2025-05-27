// src/app/api/teacher/delete-account/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';

export async function DELETE(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() { /* Not needed for this operation */ },
          remove() { /* Not needed for this operation */ }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the user is a teacher
    const { data: profile, error: profileError } = await supabase
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Only teachers can delete their accounts through this endpoint' },
        { status: 403 }
      );
    }

    console.log(`[DELETE ACCOUNT] Starting deletion process for teacher: ${user.id}`);

    // Use admin client for all operations
    const supabaseAdmin = createAdminClient();

    // Step 1: Get all rooms owned by this teacher to clean up related data
    const { data: teacherRooms, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('room_id')
      .eq('teacher_id', user.id);

    if (roomsError) {
      console.error('[DELETE ACCOUNT] Error fetching teacher rooms:', roomsError);
      throw new Error('Failed to fetch teacher data for cleanup');
    }

    console.log(`[DELETE ACCOUNT] Found ${teacherRooms?.length || 0} rooms to clean up`);

    // Step 2: Delete related data (in correct order due to foreign key constraints)
    if (teacherRooms && teacherRooms.length > 0) {
      const roomIds = teacherRooms.map(room => room.room_id);

      // Delete student assessments in teacher's rooms
      const { error: assessmentsError } = await supabaseAdmin
        .from('student_assessments')
        .delete()
        .in('room_id', roomIds);

      if (assessmentsError) {
        console.warn('[DELETE ACCOUNT] Error deleting assessments:', assessmentsError);
      }

      // Delete room memberships
      const { error: membershipsError } = await supabaseAdmin
        .from('room_memberships')
        .delete()
        .in('room_id', roomIds);

      if (membershipsError) {
        console.warn('[DELETE ACCOUNT] Error deleting room memberships:', membershipsError);
      }

      // Delete room-chatbot associations
      const { error: chatbotAssocError } = await supabaseAdmin
        .from('room_chatbots')
        .delete()
        .in('room_id', roomIds);

      if (chatbotAssocError) {
        console.warn('[DELETE ACCOUNT] Error deleting room-chatbot associations:', chatbotAssocError);
      }

      // Delete the rooms themselves
      const { error: roomDeleteError } = await supabaseAdmin
        .from('rooms')
        .delete()
        .eq('teacher_id', user.id);

      if (roomDeleteError) {
        console.warn('[DELETE ACCOUNT] Error deleting rooms:', roomDeleteError);
      }
    }

    // Step 3: Delete teacher's chatbots
    const { error: chatbotsError } = await supabaseAdmin
      .from('chatbots')
      .delete()
      .eq('teacher_id', user.id);

    if (chatbotsError) {
      console.warn('[DELETE ACCOUNT] Error deleting chatbots:', chatbotsError);
    }

    // Step 4: Delete teacher's documents
    const { error: documentsError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('teacher_id', user.id);

    if (documentsError) {
      console.warn('[DELETE ACCOUNT] Error deleting documents:', documentsError);
    }

    // Step 5: Delete the teacher profile
    const { error: profileDeleteError } = await supabaseAdmin
      .from('teacher_profiles')
      .delete()
      .eq('user_id', user.id);

    if (profileDeleteError) {
      console.error('[DELETE ACCOUNT] Error deleting teacher profile:', profileDeleteError);
      throw new Error('Failed to delete teacher profile');
    }

    // Step 6: Delete the auth user (this should be last)
    const { error: userDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (userDeleteError) {
      console.error('[DELETE ACCOUNT] Error deleting auth user:', userDeleteError);
      // Profile is already deleted, so this is a partial failure
      throw new Error('Profile deleted but auth user deletion failed. Please contact support.');
    }

    console.log(`[DELETE ACCOUNT] Successfully deleted teacher account: ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted'
    });

  } catch (error) {
    console.error('[DELETE ACCOUNT] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete account' 
      },
      { status: 500 }
    );
  }
}