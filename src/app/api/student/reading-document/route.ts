// API endpoint to fetch reading document for a Reading Room chatbot
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatbotId = searchParams.get('chatbotId');
    const userId = searchParams.get('userId');

    console.log('[API /student/reading-document] Request received:', {
      chatbotId,
      userId,
      url: request.url
    });

    if (!chatbotId) {
      console.error('[API /student/reading-document] Missing chatbot ID');
      return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
    }

    console.log('[API /student/reading-document] Fetching document for chatbot:', chatbotId);

    // Use admin client for direct access scenarios
    const adminSupabase = createAdminClient();

    // First, verify this is a Reading Room bot
    const { data: chatbot, error: chatbotError } = await adminSupabase
      .from('chatbots')
      .select('chatbot_id, name, bot_type')
      .eq('chatbot_id', chatbotId)
      .single();

    if (chatbotError || !chatbot) {
      console.error('[API /student/reading-document] Chatbot not found:', chatbotError);
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    if (chatbot.bot_type !== 'reading_room' && chatbot.bot_type !== 'viewing_room') {
      return NextResponse.json({ error: 'Not a Reading Room or Viewing Room bot' }, { status: 400 });
    }

    // Get the reading document for this chatbot
    const { data: readingDoc, error: docError } = await adminSupabase
      .from('reading_documents')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .single();

    if (docError) {
      console.error('[API /student/reading-document] Database error:', docError);
      return NextResponse.json({ 
        error: 'Database error fetching document',
        details: docError.message
      }, { status: 500 });
    }
    
    if (!readingDoc) {
      console.log('[API /student/reading-document] No reading document found for chatbot');
      return NextResponse.json({ 
        error: 'No reading document uploaded yet',
        document: null 
      }, { status: 404 });
    }

    // Handle different content types
    let documentUrl: string | null = null;
    let contentType = readingDoc.content_type || 'pdf'; // Default to PDF for backward compatibility
    
    if (contentType === 'video') {
      // For videos, use the video_url directly
      documentUrl = readingDoc.video_url;
    } else {
      // For PDFs, use the stored file_url or construct it
      documentUrl = readingDoc.file_url;
      
      if (!documentUrl && readingDoc.file_path) {
        // Fallback: construct the URL if not stored
        const { data: publicUrlData } = adminSupabase
          .storage
          .from('documents')
          .getPublicUrl(readingDoc.file_path);
        
        documentUrl = publicUrlData.publicUrl;
      }
    }

    console.log('[API /student/reading-document] Returning document:', { contentType, documentUrl });

    return NextResponse.json({
      document: {
        document_id: readingDoc.id,
        content_type: contentType,
        file_name: readingDoc.file_name,
        file_url: documentUrl, // This will be either PDF URL or video URL
        video_platform: readingDoc.video_platform,
        video_id: readingDoc.video_id,
        video_metadata: readingDoc.video_metadata,
        uploaded_at: readingDoc.created_at
      }
    });

  } catch (error) {
    console.error('[API /student/reading-document] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reading document' },
      { status: 500 }
    );
  }
}