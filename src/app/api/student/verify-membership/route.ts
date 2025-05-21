// src/app/api/student/verify-membership/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateRoomAccess } from '@/lib/utils/room-validation';
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from '@/lib/utils/api-responses';

export async function GET(request: NextRequest) {
  try {
    // Get parameters from query string
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId');

    // Validate required parameters
    if (!roomId || !userId) {
      return createErrorResponse(
        'Missing required parameters: roomId and userId are required', 
        400, 
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Use admin client to check membership reliably
    const supabaseAdmin = createAdminClient();

    // Verify user exists
    const { data: userCheck, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userCheck.user) {
      console.error('[API GET /verify-membership] User not found:', userId, userError);
      return createErrorResponse('User not found', 404, ErrorCodes.STUDENT_NOT_FOUND);
    }

    // Verify room exists and is active
    const roomValidation = await validateRoomAccess(roomId);
    if (roomValidation.error) {
      return handleApiError(roomValidation.error);
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
      return createErrorResponse('Error checking membership', 500, ErrorCodes.DATABASE_ERROR);
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
        return createErrorResponse('Failed to add user to room', 500, ErrorCodes.DATABASE_ERROR);
      }

      // Successfully added
      return createSuccessResponse({ 
        isMember: true, 
        message: 'User successfully added to room' 
      });
    }

    // Already a member
    return createSuccessResponse({ 
      isMember: true, 
      message: 'User is already a member of this room' 
    });
  } catch (error) {
    console.error('[API GET /verify-membership] Unexpected error:', error);
    return handleApiError(error);
  }
}