// src/app/api/student/verify-room-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidRoomCode } from '@/lib/utils/room-codes';
import { validateRoomByCode } from '@/lib/utils/room-validation';
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from '@/lib/utils/api-responses';

export async function GET(request: NextRequest) {
  try {
    // Get room code from query params
    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get('code');

    if (!roomCode) {
      return createErrorResponse('Room code is required', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const formattedCode = roomCode.toUpperCase();

    // Validate the room code format
    if (!isValidRoomCode(formattedCode)) {
      return createErrorResponse(
        'Invalid room code format. Codes should be 6 characters (letters and numbers).', 
        400, 
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Use admin client to ensure we can access the data regardless of auth state
    const supabaseAdmin = createAdminClient();

    // Verify the room exists and is active
    console.log('[API GET /verify-room-code] Looking up room code:', formattedCode);
    const roomValidation = await validateRoomByCode(formattedCode);
    if (roomValidation.error) {
      return handleApiError(roomValidation.error);
    }

    const room = roomValidation.room!;

    // Get chatbots for this room
    const { data: roomChatbots, error: chatbotError } = await supabaseAdmin
      .from('room_chatbots')
      .select('chatbot_id')
      .eq('room_id', room.room_id);

    // Return the room info and available chatbots
    return createSuccessResponse({
      room: {
        room_id: room.room_id,
        room_name: room.room_name,
        is_active: room.is_active
      },
      hasChatbots: !chatbotError && roomChatbots && roomChatbots.length > 0,
      chatbotCount: !chatbotError && roomChatbots ? roomChatbots.length : 0
    });
  } catch (error) {
    console.error('[API GET /verify-room-code] Unexpected error:', error);
    return handleApiError(error);
  }
}