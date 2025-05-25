// src/app/api/teacher/students/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server'; // For initial auth and room check
import { createAdminClient } from '@/lib/supabase/admin';         // << IMPORT ADMIN CLIENT

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient(); // Standard client for user context
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[API /teacher/students] Not authenticated:', authError?.message);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    console.log('[API /teacher/students] Authenticated user:', user.id);

    // Verify teacher owns the room using the standard client (respects RLS)
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('teacher_id', user.id)
      .single();

    if (roomError || !room) {
      console.warn(`[API /teacher/students] Room not found (ID: ${roomId}) or teacher (ID: ${user.id}) not authorized:`, roomError?.message);
      return NextResponse.json({ error: 'Room not found or unauthorized' }, { status: 404 });
    }
    console.log(`[API /teacher/students] Teacher ${user.id} authorized for room ${roomId}.`);

    // Fetch memberships using the standard client (respects RLS)
    const { data: memberships, error: membershipError } = await supabase
      .from('room_memberships')
      .select('student_id, joined_at')
      .eq('room_id', roomId);

    if (membershipError) {
      console.error(`[API /teacher/students] Failed to fetch room memberships for room ${roomId}:`, membershipError.message);
      return NextResponse.json(
        { error: `Failed to fetch room memberships: ${membershipError.message}` },
        { status: 500 }
      );
    }

    if (!memberships || memberships.length === 0) {
      console.log(`[API /teacher/students] No student memberships found for room ${roomId}.`);
      return NextResponse.json([]); // No students in the room
    }

    const studentIds = memberships.map(m => m.student_id);
    console.log(`[API /teacher/students] Student IDs in room ${roomId}:`, studentIds);

    // >> MODIFICATION: Use Admin Client to fetch profiles <<
    const adminSupabase = createAdminClient(); 

    const { data: profilesData, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('user_id, full_name, email') // Select only necessary fields
      .in('user_id', studentIds);

    if (profilesError) {
      console.error(`[API /teacher/students] Admin client failed to fetch profiles for student IDs (${studentIds.join(', ')}):`, profilesError.message);
      // Fall through, error will be handled by studentData mapping if profilesData is null/empty
    } else {
        console.log('[API /teacher/students] Profiles data fetched with admin client:', profilesData);
    }
    
    const studentData = await Promise.all(
      memberships.map(async (membership) => {
        const profile = profilesData?.find(p => p.user_id === membership.student_id);
        
        let name = "Student"; 
        let email = "No email available";

        if (profile) {
          if (profile.full_name) name = profile.full_name;
          else if (profile.email) name = profile.email.split('@')[0]; // Fallback to email username if full_name is missing
          
          if (profile.email) email = profile.email;
        }
        console.log(`[API /teacher/students] Student ${membership.student_id} initial data from profiles: Name='${name}', Email='${email}'`);

        // Fallback to auth.admin.getUserById if profile info is still default,
        // AND if the admin client was available (service_role key is set)
        if ((name === "Student" || email === "No email available") && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.log(`[API /teacher/students] Profile for ${membership.student_id} still default, trying auth.admin.getUserById.`);
          try {
            // Use the adminSupabase instance for auth.admin calls too
            const { data: authUserData, error: authUserError } = await adminSupabase.auth.admin.getUserById(membership.student_id);

            if (authUserError) {
              console.warn(`[API /teacher/students] auth.admin.getUserById error for student ${membership.student_id}:`, authUserError.message);
            } else if (authUserData?.user) {
              const fetchedUser = authUserData.user;
              console.log(`[API /teacher/students] auth.admin.getUserById success for ${membership.student_id}. Email: ${fetchedUser.email}, Metadata:`, fetchedUser.user_metadata);
              if (name === "Student") { // Only overwrite if still default
                if (fetchedUser.user_metadata?.full_name) name = fetchedUser.user_metadata.full_name;
                else if (fetchedUser.user_metadata?.name) name = fetchedUser.user_metadata.name;
                else if (fetchedUser.email) name = fetchedUser.email.split('@')[0];
              }
              if (email === "No email available" && fetchedUser.email) { // Only overwrite if still default
                email = fetchedUser.email;
              }
            } else {
              console.log(`[API /teacher/students] auth.admin.getUserById for ${membership.student_id} returned no user data.`);
            }
          } catch (e) {
            console.error(`[API /teacher/students] Exception calling auth.admin.getUserById for ${membership.student_id}:`, e);
          }
        }
        
        console.log(`[API /teacher/students] Final data for student ${membership.student_id}: Name='${name}', Email='${email}'`);
        return {
          user_id: membership.student_id,
          name,
          email,
          joined_at: membership.joined_at,
        };
      })
    );

    return NextResponse.json(studentData);

  } catch (error) {
    const typedError = error as Error & { code?: string; details?: unknown };
    console.error('[API /teacher/students] CATCH BLOCK Error:', 
        typedError?.message, 
        'Code:', typedError?.code, 
        'Details:', typedError?.details
    );
    return NextResponse.json(
      { error: typedError?.message || 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, roomId } = body;

    if (!studentId || !roomId) {
      return NextResponse.json({ error: 'Student ID and Room ID are required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify teacher owns the room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('teacher_id', user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found or unauthorized' }, { status: 404 });
    }

    // Use admin client for deletion operations
    const adminSupabase = createAdminClient();

    // Delete from room_memberships
    const { error: membershipError } = await adminSupabase
      .from('room_memberships')
      .delete()
      .eq('room_id', roomId)
      .eq('student_id', studentId);

    if (membershipError) {
      console.error('[API DELETE /teacher/students] Failed to delete room membership:', membershipError);
      return NextResponse.json({ error: 'Failed to remove student from room' }, { status: 500 });
    }

    // Delete the student's profile
    const { error: profileError } = await adminSupabase
      .from('student_profiles')
      .delete()
      .eq('user_id', studentId);

    if (profileError) {
      console.error('[API DELETE /teacher/students] Failed to delete student profile:', profileError);
      // Continue anyway, as the membership is already deleted
    }

    // Delete the auth user
    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(studentId);

    if (authDeleteError) {
      console.error('[API DELETE /teacher/students] Failed to delete auth user:', authDeleteError);
      // Return success anyway as the student is removed from the room
    }

    return NextResponse.json({ success: true, message: 'Student deleted successfully' });

  } catch (error) {
    console.error('[API DELETE /teacher/students] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete student' },
      { status: 500 }
    );
  }
}