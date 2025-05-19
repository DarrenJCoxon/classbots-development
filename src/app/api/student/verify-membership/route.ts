// src/app/api/student/verify-membership/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // Get parameters from query string
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId');

    // Validate required parameters
    if (!roomId || !userId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: roomId and userId are required' 
      }, { status: 400 });
    }

    // Use admin client to check membership reliably
    const supabaseAdmin = createAdminClient();

    // Verify user exists
    const { data: userCheck, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userCheck.user) {
      console.error('[API GET /verify-membership] User not found:', userId, userError);
      return NextResponse.json({ error: 'User not found', isMember: false }, { status: 404 });
    }

    // Verify room exists
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('room_id, is_active')
      .eq('room_id', roomId)
      .single();

    if (roomError || !room) {
      console.error('[API GET /verify-membership] Room not found:', roomId, roomError);
      return NextResponse.json({ error: 'Room not found', isMember: false }, { status: 404 });
    }

    if (!room.is_active) {
      return NextResponse.json({ error: 'Room is inactive', isMember: false }, { status: 403 });
    }

    // Check if user is a member of the room
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('room_memberships')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('student_id', userId)
      .maybeSingle();

    if (membershipError) {
      console.error('[API GET /verify-membership] Error checking membership:', membershipError);
      return NextResponse.json({ 
        error: 'Error checking membership', 
        isMember: false 
      }, { status: 500 });
    }

    const isMember = !!membership;

    // If not a member but the user exists and the room is active, add them
    if (!isMember) {
      console.log('[API GET /verify-membership] User not a member, adding membership');
      const { error: insertError } = await supabaseAdmin
        .from('room_memberships')
        .insert({
          room_id: roomId,
          student_id: userId
        });

      if (insertError) {
        console.error('[API GET /verify-membership] Error adding membership:', insertError);
        return NextResponse.json({ 
          error: 'Failed to add user to room', 
          isMember: false 
        }, { status: 500 });
      }

      // Successfully added
      return NextResponse.json({ 
        isMember: true, 
        message: 'User successfully added to room' 
      });
    }

    // Already a member
    return NextResponse.json({ 
      isMember: true, 
      message: 'User is already a member of this room' 
    });
  } catch (error) {
    console.error('[API GET /verify-membership] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isMember: false 
      },
      { status: 500 }
    );
  }
}