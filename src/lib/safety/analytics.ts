// src/lib/safety/analytics.ts
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database.types';

/**
 * Tracks the generation of a safety response for analytics
 * 
 * @param messageId The ID of the safety message
 * @param studentId The ID of the student who triggered the safety response
 * @param roomId The ID of the room where the safety message was triggered
 * @param concernType The type of concern that triggered the safety message
 * @param countryCode The country code used for the helplines
 * @param timestamp The timestamp when the safety message was generated
 */
export async function trackSafetyResponse(
  messageId: string,
  studentId: string,
  roomId: string,
  concernType: string,
  countryCode: string | null,
  timestamp: string
): Promise<void> {
  try {
    const adminClient = createAdminClient();
    
    // Log the safety message tracking to the safety_analytics table
    await adminClient.from('safety_analytics').insert({
      message_id: messageId,
      student_id: studentId,
      room_id: roomId,
      concern_type: concernType,
      country_code: countryCode || 'DEFAULT',
      created_at: timestamp,
      event_type: 'safety_message_shown'
    });
    
    console.log(`[Safety Analytics] Successfully tracked safety response ${messageId} for student ${studentId}`);
  } catch (error) {
    // Don't let analytics failure affect the main flow
    console.error('[Safety Analytics] Error tracking safety response:', error);
  }
}

/**
 * Tracks when a student clicks or interacts with a safety response
 * 
 * @param messageId The ID of the safety message
 * @param studentId The ID of the student who interacted with the safety message
 * @param interactionType The type of interaction (e.g., 'click', 'expand', 'copy', etc.)
 * @param helplineName Optional name of the specific helpline interacted with
 */
export async function trackSafetyInteraction(
  messageId: string,
  studentId: string,
  interactionType: string,
  helplineName?: string
): Promise<void> {
  try {
    const adminClient = createAdminClient();
    
    // Log the safety message interaction to the safety_analytics table
    await adminClient.from('safety_analytics').insert({
      message_id: messageId,
      student_id: studentId,
      event_type: 'safety_message_interaction',
      interaction_type: interactionType,
      helpline_name: helplineName || null,
      created_at: new Date().toISOString()
    });
    
    console.log(`[Safety Analytics] Successfully tracked ${interactionType} interaction with safety message ${messageId}`);
  } catch (error) {
    // Don't let analytics failure affect the main flow
    console.error('[Safety Analytics] Error tracking safety interaction:', error);
  }
}