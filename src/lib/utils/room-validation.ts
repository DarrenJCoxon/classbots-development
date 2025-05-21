// src/lib/utils/room-validation.ts
import { createAdminClient } from '@/lib/supabase/admin';
import { ApiError, ErrorCodes } from './api-responses';
import { cache, CacheTTL, CacheTags } from './cache';

interface RoomValidationResult {
  room?: {
    room_id: string;
    room_name?: string;
    is_active: boolean;
    room_code?: string;
  };
  error?: ApiError;
}

/**
 * Validates that a room exists and is active by room code
 * @param roomCode - The room code to validate
 * @returns Promise<RoomValidationResult>
 */
export async function validateRoomByCode(roomCode: string): Promise<RoomValidationResult> {
  const cacheKey = `room-validation:code:${roomCode.toUpperCase()}`;
  
  return cache.get(
    cacheKey,
    async () => {
      try {
        const supabaseAdmin = createAdminClient();
        
        const { data: room, error: roomError } = await supabaseAdmin
          .from('rooms')
          .select('room_id, room_name, is_active, room_code')
          .eq('room_code', roomCode.toUpperCase())
          .single();

        if (roomError) {
          if (roomError.code === 'PGRST116') {
            return { error: new ApiError('Room not found', 404, ErrorCodes.ROOM_NOT_FOUND) };
          }
          return { error: new ApiError('Database error', 500, ErrorCodes.DATABASE_ERROR, roomError.message) };
        }

        if (!room) {
          return { error: new ApiError('Room not found', 404, ErrorCodes.ROOM_NOT_FOUND) };
        }

        if (!room.is_active) {
          return { error: new ApiError('Room is inactive', 403, ErrorCodes.ROOM_INACTIVE) };
        }

        return { room };
      } catch (error) {
        console.error('[Room Validation] Error:', error);
        return { error: new ApiError('Failed to validate room access', 500, ErrorCodes.DATABASE_ERROR) };
      }
    },
    {
      ttl: CacheTTL.MEDIUM, // 15 minutes - rooms don't change often
      tags: roomCode ? [CacheTags.ROOM(roomCode)] : []
    }
  );
}

/**
 * Validates that a room exists and is active by room ID
 * @param roomId - The room ID to validate
 * @returns Promise<RoomValidationResult>
 */
export async function validateRoomAccess(roomId: string): Promise<RoomValidationResult> {
  const cacheKey = `room-validation:id:${roomId}`;
  
  return cache.get(
    cacheKey,
    async () => {
      try {
        const supabaseAdmin = createAdminClient();
        
        const { data: room, error: roomError } = await supabaseAdmin
          .from('rooms')
          .select('room_id, room_name, is_active')
          .eq('room_id', roomId)
          .single();

        if (roomError) {
          if (roomError.code === 'PGRST116') {
            return { error: new ApiError('Room not found', 404, ErrorCodes.ROOM_NOT_FOUND) };
          }
          return { error: new ApiError('Database error', 500, ErrorCodes.DATABASE_ERROR, roomError.message) };
        }

        if (!room) {
          return { error: new ApiError('Room not found', 404, ErrorCodes.ROOM_NOT_FOUND) };
        }

        if (!room.is_active) {
          return { error: new ApiError('Room is inactive', 403, ErrorCodes.ROOM_INACTIVE) };
        }

        return { room };
      } catch (error) {
        console.error('[Room Validation] Error:', error);
        return { error: new ApiError('Failed to validate room access', 500, ErrorCodes.DATABASE_ERROR) };
      }
    },
    {
      ttl: CacheTTL.MEDIUM, // 15 minutes - rooms don't change often
      tags: [CacheTags.ROOM(roomId)]
    }
  );
}