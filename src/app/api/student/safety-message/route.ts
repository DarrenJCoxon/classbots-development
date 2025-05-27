// src/app/api/student/safety-message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`[SAFETY API DIAGNOSTICS] ===== SAFETY MESSAGE API CALLED =====`);
  console.log(`[SAFETY API DIAGNOSTICS] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`[SAFETY API DIAGNOSTICS] Request URL: ${request.url}`);
  console.log(`[SAFETY API DIAGNOSTICS] Headers:`, {
    host: request.headers.get('host'),
    referer: request.headers.get('referer'),
    origin: request.headers.get('origin'),
    userAgent: request.headers.get('user-agent')?.substring(0, 100) + '...'
  });
  
  try {
    // Get parameters from query string
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const userId = searchParams.get('userId');
    const roomId = searchParams.get('roomId');
    
    console.log(`[SAFETY API DIAGNOSTICS] Query parameters:`, {
      messageId: messageId || '(not provided)',
      userId: userId || '(not provided)',
      roomId: roomId || '(not provided)',
    });

    // Different query modes:
    // 1. By messageId: Get a specific safety message
    // 2. By userId + roomId: Get the latest safety message for a user in a room

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient();
    console.log(`[SAFETY API DIAGNOSTICS] Created admin client successfully`);

    let message;
    
    if (messageId && userId) {
      // Mode 1: Get specific message by ID
      console.log(`[SAFETY API DIAGNOSTICS] Mode 1: Fetching specific safety message: ${messageId} for user ${userId}`);
      
      try {
        const { data, error } = await supabaseAdmin
          .from('chat_messages')
          .select('*')
          .eq('message_id', messageId)
          .eq('user_id', userId)
          .eq('role', 'system')
          .single();
  
        if (error) {
          console.error('[SAFETY API DIAGNOSTICS] Error fetching specific message:', error);
          console.error('[SAFETY API DIAGNOSTICS] Error details:', {
            code: error.code,
            message: error.message,
            details: error.details
          });
          return NextResponse.json({ 
            error: 'Message not found or access denied',
            details: error?.message 
          }, { status: 404 });
        }
        
        if (!data) {
          console.warn(`[SAFETY API DIAGNOSTICS] No message found with ID ${messageId} for user ${userId}`);
          return NextResponse.json({ 
            error: 'Message not found',
            details: 'No matching message found' 
          }, { status: 404 });
        }
        
        console.log(`[SAFETY API DIAGNOSTICS] Successfully found message ${messageId}`);
        message = data;
      } catch (queryError) {
        console.error('[SAFETY API DIAGNOSTICS] Exception during specific message query:', queryError);
        return NextResponse.json({ 
          error: 'Exception during message lookup',
          details: queryError instanceof Error ? queryError.message : 'Unknown error'
        }, { status: 500 });
      }
    } 
    else if (userId && roomId) {
      // Mode 2: Get latest safety message for user in room
      console.log(`[SAFETY API DIAGNOSTICS] Mode 2: Fetching latest safety message for user ${userId} in room ${roomId}`);
      
      try {
        // First check if any safety messages exist at all
        const { count, error: countError } = await supabaseAdmin
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('room_id', roomId)
          .eq('role', 'system')
          .filter('metadata->isSystemSafetyResponse', 'eq', true);
        
        if (countError) {
          console.error('[SAFETY API DIAGNOSTICS] Error counting safety messages:', countError);
        } else {
          console.log(`[SAFETY API DIAGNOSTICS] Found ${count || 0} safety messages for user ${userId} in room ${roomId}`);
        }
        
        // Now get the most recent safety message (within last 30 minutes)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        
        const { data, error } = await supabaseAdmin
          .from('chat_messages')
          .select('*')
          .eq('user_id', userId)
          .eq('room_id', roomId)
          .eq('role', 'system')
          .filter('metadata->isSystemSafetyResponse', 'eq', true)
          .gte('created_at', thirtyMinutesAgo) // Only messages from last 30 minutes
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle to avoid throwing an error if no results
  
        if (error) {
          console.error('[SAFETY API DIAGNOSTICS] Error fetching latest safety message:', error);
          console.error('[SAFETY API DIAGNOSTICS] Error details:', {
            code: error.code,
            message: error.message,
            details: error.details
          });
          return NextResponse.json({ 
            error: 'Error fetching safety message',
            details: error?.message 
          }, { status: 500 });
        }
        
        if (!data) {
          console.log(`[SAFETY API DIAGNOSTICS] No recent safety messages found for user ${userId} in room ${roomId} (checking messages from last 30 minutes)`);
        } else {
          console.log(`[SAFETY API DIAGNOSTICS] Found recent safety message ID: ${data.message_id}, created: ${data.created_at} (within last 30 minutes)`);
        }
        
        // No safety message found is a valid result (returns null)
        message = data;
      } catch (queryError) {
        console.error('[SAFETY API DIAGNOSTICS] Exception during latest message query:', queryError);
        return NextResponse.json({ 
          error: 'Exception during safety message lookup',
          details: queryError instanceof Error ? queryError.message : 'Unknown error'
        }, { status: 500 });
      }
    }
    else {
      console.warn('[SAFETY API DIAGNOSTICS] Missing required parameters');
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