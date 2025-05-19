// src/app/api/student/safety-message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // Get parameters from query string
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const userId = searchParams.get('userId');
    const roomId = searchParams.get('roomId');

    // Different query modes:
    // 1. By messageId: Get a specific safety message
    // 2. By userId + roomId: Get the latest safety message for a user in a room

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient();

    let message;
    
    if (messageId && userId) {
      // Mode 1: Get specific message by ID
      console.log(`[Safety Message API] Fetching specific safety message: ${messageId} for user ${userId}`);
      
      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('role', 'system')
        .single();

      if (error || !data) {
        console.error('[Safety Message API] Error fetching message:', error);
        return NextResponse.json({ 
          error: 'Message not found or access denied',
          details: error?.message 
        }, { status: 404 });
      }
      
      message = data;
    } 
    else if (userId && roomId) {
      // Mode 2: Get latest safety message for user in room
      console.log(`[Safety Message API] Fetching latest safety message for user ${userId} in room ${roomId}`);
      
      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('room_id', roomId)
        .eq('role', 'system')
        .filter('metadata->isSystemSafetyResponse', 'eq', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid throwing an error if no results

      if (error) {
        console.error('[Safety Message API] Error fetching safety message:', error);
        return NextResponse.json({ 
          error: 'Error fetching safety message',
          details: error?.message 
        }, { status: 500 });
      }
      
      // No safety message found is a valid result (returns null)
      message = data;
    }
    else {
      return NextResponse.json({ 
        error: 'Missing required parameters: either messageId+userId OR userId+roomId are required' 
      }, { status: 400 });
    }

    // If no message found, return empty result (not an error)
    if (!message) {
      console.log('[Safety Message API] No safety message found');
      return NextResponse.json({ 
        message: null,
        found: false
      });
    }

    // Make sure this is a safety message by checking metadata
    if (!message.metadata?.isSystemSafetyResponse) {
      console.warn('[Safety Message API] Requested message is not a safety message:', message.message_id);
      return NextResponse.json({ message: null, found: false, reason: 'Not a safety message' });
    }

    // Extract key information for debugging - more detailed logging
    console.log('[Safety Message API] Successfully retrieved safety message:', {
      messageId: message.message_id,
      content: message.content.substring(0, 100) + '...', // Show start of content
      // Country code info
      countryCode: message.metadata?.countryCode,
      effectiveCountryCode: message.metadata?.effectiveCountryCode,
      displayCountryCode: message.metadata?.displayCountryCode,
      rawCountryCode: message.metadata?.rawCountryCode,
      // Helpline info
      helplines: message.metadata?.helplines,
      helplineCount: message.metadata?.helplineCount || 
                    (message.metadata?.helplines ? message.metadata.helplines.split(',').length : 0),
      // Check for critical markers in content
      hasHelplineMarkers: message.content.includes('===== MANDATORY HELPLINES') && 
                         message.content.includes('===== END OF MANDATORY HELPLINES'),
      // Version info                   
      safetyMessageVersion: message.metadata?.safetyMessageVersion || '1.0'
    });

    // Make sure the message metadata includes all country code information
    // This normalizes different versions of safety messages
    const enhancedMessage = {
      ...message,
      metadata: {
        ...message.metadata,
        // Ensure all country code fields are present and consistent
        isSystemSafetyResponse: true, // Always ensure this flag is set
        rawCountryCode: message.metadata?.rawCountryCode || message.metadata?.countryCode || null,
        countryCode: message.metadata?.countryCode || null,
        effectiveCountryCode: message.metadata?.effectiveCountryCode || message.metadata?.countryCode || 'DEFAULT',
        // Ensure the displayCountryCode is set correctly for UI
        displayCountryCode: 
          message.metadata?.displayCountryCode || 
          message.metadata?.effectiveCountryCode || 
          message.metadata?.countryCode || 
          'DEFAULT',
        // Add version info if not present
        safetyMessageVersion: message.metadata?.safetyMessageVersion || '2.1'
      }
    };
    
    // Log the enhanced message's country code information
    console.log('[Safety Message API] Enhanced message country codes:', {
      original: {
        countryCode: message.metadata?.countryCode,
        effectiveCountryCode: message.metadata?.effectiveCountryCode,
        displayCountryCode: message.metadata?.displayCountryCode
      },
      enhanced: {
        rawCountryCode: enhancedMessage.metadata.rawCountryCode,
        countryCode: enhancedMessage.metadata.countryCode,
        effectiveCountryCode: enhancedMessage.metadata.effectiveCountryCode,
        displayCountryCode: enhancedMessage.metadata.displayCountryCode,
        version: enhancedMessage.metadata.safetyMessageVersion
      }
    });

    return NextResponse.json({ 
      message: enhancedMessage,
      found: true 
    });
  } catch (error) {
    console.error('[Safety Message API] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown server error' },
      { status: 500 }
    );
  }
}