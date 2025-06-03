// src/app/api/student/room-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateRoomAccess } from '@/lib/utils/room-validation';
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from '@/lib/utils/api-responses';
import { cache, CacheTTL, CacheTags } from '@/lib/utils/cache';
import type { Chatbot } from '@/types/database.types';

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

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient();

    // Verify user exists
    const { data: userCheck, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userCheck.user) {
      console.error('[API GET /student/room-data] User not found:', userId);
      return createErrorResponse('User not found', 404, ErrorCodes.STUDENT_NOT_FOUND);
    }

    // Verify room exists and is active
    const roomValidation = await validateRoomAccess(roomId);
    if (roomValidation.error) {
      return handleApiError(roomValidation.error);
    }

    // Get full room data for later use
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (roomError || !room) {
      console.error('[API GET /student/room-data] Room not found:', roomId);
      return createErrorResponse('Room not found', 404, ErrorCodes.ROOM_NOT_FOUND);
    }

    // Verify room membership or create it
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('room_memberships')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('student_id', userId)
      .maybeSingle();

    if (membershipError) {
      console.error('[API GET /student/room-data] Error checking membership:', membershipError);
    }

    if (!membership) {
      console.log('[API GET /student/room-data] User not in room, adding membership');
      const { error: insertError } = await supabaseAdmin
        .from('room_memberships')
        .insert({
          room_id: roomId,
          student_id: userId
        });

      if (insertError) {
        console.error('[API GET /student/room-data] Error adding user to room:', insertError);
        // Continue anyway to return room data
      }
    }

    // Get both chatbots and courses for the room (with caching)
    const cacheKey = `room-data-full:${roomId}:${userId}`;
    const roomData = await cache.get(
      cacheKey,
      async () => {
        const { data: roomChatbots, error: chatbotsRelationError } = await supabaseAdmin
          .from('room_chatbots')
          .select('chatbot_id')
          .eq('room_id', roomId);

        if (chatbotsRelationError) {
          throw new Error(`Error fetching room chatbots: ${chatbotsRelationError.message}`);
        }

        // We need to get student-specific chatbot instances instead of just regular chatbots
        let chatbots: any[] = []; // Use any type to accommodate instance_id
        if (roomChatbots && roomChatbots.length > 0) {
          // First, let's check for student-specific instances
          const chatbotIds = roomChatbots.map(rc => rc.chatbot_id);
          
          // Check if student has instances for these chatbots
          const { data: chatbotInstances, error: instancesError } = await supabaseAdmin
            .from('student_chatbot_instances')
            .select(`
              instance_id,
              chatbot_id,
              chatbots (
                chatbot_id,
                name,
                description,
                model,
                bot_type,
                welcome_message
              )
            `)
            .eq('room_id', roomId)
            .eq('student_id', userId)
            .in('chatbot_id', chatbotIds);
            
          if (instancesError) {
            console.error('[API GET /student/room-data] Error fetching student chatbot instances:', instancesError);
          }
          
          // If instances already exist, use them
          if (chatbotInstances && chatbotInstances.length > 0) {
            console.log(`[API GET /student/room-data] Found ${chatbotInstances.length} existing instances for student ${userId}`);
            
            // Format the chatbots with instances
            chatbots = chatbotInstances.map(instance => {
              const chatbot = instance.chatbots as any; // Type assertion to avoid TypeScript errors
              return {
                instance_id: instance.instance_id,
                chatbot_id: instance.chatbot_id,
                name: chatbot?.name || 'Unknown Bot',
                description: chatbot?.description || '',
                model: chatbot?.model,
                bot_type: chatbot?.bot_type,
                welcome_message: chatbot?.welcome_message
              };
            });
          } else {
            // Need to create instances
            console.log(`[API GET /student/room-data] No instances found, getting chatbot details and creating instances`);
            
            // Get the chatbot details first
            const { data: chatbotsData, error: chatbotsError } = await supabaseAdmin
              .from('chatbots')
              .select('*')
              .in('chatbot_id', chatbotIds);
      
            if (chatbotsError) {
              console.error('[API GET /student/room-data] Error fetching chatbot details:', chatbotsError);
              throw new Error(`Error fetching chatbot details: ${chatbotsError.message}`);
            }
            
            if (chatbotsData && chatbotsData.length > 0) {
              // Create instances for each chatbot
              const instancesData = chatbotsData.map(chatbot => ({
                student_id: userId,
                chatbot_id: chatbot.chatbot_id,
                room_id: roomId
              }));
              
              const { data: newInstances, error: createError } = await supabaseAdmin
                .from('student_chatbot_instances')
                .upsert(instancesData, { onConflict: 'student_id,chatbot_id,room_id' })
                .select(`
                  instance_id,
                  chatbot_id,
                  chatbots (
                    chatbot_id,
                    name,
                    description,
                    model,
                    bot_type,
                    welcome_message
                  )
                `);
                
              if (createError) {
                console.error('[API GET /student/room-data] Error creating chatbot instances:', createError);
                throw new Error(`Error creating chatbot instances: ${createError.message}`);
              } else if (newInstances) {
                console.log(`[API GET /student/room-data] Created ${newInstances.length} new instances for student ${userId}`);
                
                // Format the chatbots with instances
                chatbots = newInstances.map(instance => {
                  const chatbot = instance.chatbots as any; // Type assertion to avoid TypeScript errors
                  return {
                    instance_id: instance.instance_id,
                    chatbot_id: instance.chatbot_id,
                    name: chatbot?.name || 'Unknown Bot',
                    description: chatbot?.description || '',
                    model: chatbot?.model,
                    bot_type: chatbot?.bot_type,
                    welcome_message: chatbot?.welcome_message
                  };
                });
              }
            }
          }
        }

        // Get courses for the room
        const { data: roomCourses, error: coursesRelationError } = await supabaseAdmin
          .from('room_courses')
          .select(`
            course_id,
            courses (
              course_id,
              title,
              description,
              subject,
              is_published,
              course_lessons (
                lesson_id,
                title,
                lesson_order
              )
            )
          `)
          .eq('room_id', roomId);

        if (coursesRelationError) {
          console.error('[API GET /student/room-data] Error fetching room courses:', coursesRelationError);
        }

        // Filter to only published courses and format them
        const courses = roomCourses?.map(rc => rc.courses).filter((course: any) => 
          course && course.is_published
        ) || [];

        return { chatbots, courses };
      },
      {
        ttl: CacheTTL.VERY_SHORT, // 1 minute - student instances can change
        tags: [
          CacheTags.ROOM_CHATBOTS(roomId), 
          CacheTags.STUDENT(userId),
          CacheTags.ROOM(roomId)
        ]
      }
    );

    // Return room, chatbots, and courses data
    return createSuccessResponse({
      room: {
        ...room,
        room_chatbots: []
      },
      chatbots: roomData.chatbots,
      courses: roomData.courses
    });
  } catch (error) {
    console.error('[API GET /student/room-data] General error:', error);
    return handleApiError(error);
  }
}