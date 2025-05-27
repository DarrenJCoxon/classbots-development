// src/app/api/teacher/chatbots/[chatbotId]/vectorize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processDocument as processDocumentFile } from '@/lib/document-processing/processor';
import type { Document } from '@/types/knowledge-base.types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log("[API vectorize POST] Document processing request received");

  try {
    // Extract chatbotId from URL
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/');
    const chatbotId = segments[segments.indexOf('chatbots') + 1];
    
    if (!chatbotId) {
      return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
    }
    
    console.log("[API vectorize POST] Processing for chatbot ID:", chatbotId);
    
    // Get both standard and admin clients
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use admin client to verify chatbot ownership
    console.log(`[API vectorize POST] Verifying chatbot ownership: chatbotId=${chatbotId}, userId=${user.id}`);
    const { data: chatbot, error: chatbotError } = await adminSupabase
      .from('chatbots')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .single();

    if (chatbotError) {
      console.error(`[API vectorize POST] Error finding chatbot: ${chatbotError.message}`);
      return NextResponse.json({ error: `Chatbot not found: ${chatbotError.message}` }, { status: 404 });
    }
    
    if (!chatbot) {
      console.error(`[API vectorize POST] Chatbot not found with ID: ${chatbotId}`);
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }
    
    // Check if user owns the chatbot
    if (chatbot.teacher_id !== user.id) {
      console.error(`[API vectorize POST] Authorization error: User ${user.id} is not the owner of chatbot ${chatbotId}. Owner: ${chatbot.teacher_id}`);
      return NextResponse.json({ error: 'Not authorized to process documents for this chatbot' }, { status: 403 });
    }
    
    console.log(`[API vectorize POST] Authorization successful for user ${user.id} on chatbot ${chatbotId}`);

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("[API vectorize POST] Error parsing request body:", parseError);
      return NextResponse.json({ error: 'Invalid request body format' }, { status: 400 });
    }

    const documentId = body.documentId;

    if (!documentId) {
      console.error("[API vectorize POST] Missing documentId in request body");
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    console.log(`[API vectorize POST] Looking up document: ${documentId} for chatbot: ${chatbotId}`);
    
    // Use admin client to get document
    const { data: document, error: documentError } = await adminSupabase
      .from('documents')
      .select('*')
      .eq('document_id', documentId)
      .eq('chatbot_id', chatbotId)
      .single();

    if (documentError) {
      console.error(`[API vectorize POST] Error finding document: ${documentError.message}`);
      return NextResponse.json({ error: `Document not found: ${documentError.message}` }, { status: 404 });
    }
    
    if (!document) {
      console.error(`[API vectorize POST] Document not found with ID: ${documentId}`);
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if document is stuck in processing state (more than 10 minutes)
    if (document.status === 'processing') {
      const updatedAt = new Date(document.updated_at);
      const minutesSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60);
      
      if (minutesSinceUpdate > 10) {
        console.log(`[API vectorize POST] Document ${documentId} appears stuck (processing for ${minutesSinceUpdate.toFixed(1)} minutes). Resetting...`);
        // Reset to pending so it can be reprocessed
        await adminSupabase
          .from('documents')
          .update({
            status: 'pending',
            updated_at: new Date().toISOString(),
            error_message: null
          })
          .eq('document_id', documentId);
      } else {
        console.log(`[API vectorize POST] Document ${documentId} is already being processed (${minutesSinceUpdate.toFixed(1)} minutes ago)`);
        return NextResponse.json({ 
          error: 'Document is already being processed. Please wait a few minutes and try again.',
          minutesSinceUpdate: minutesSinceUpdate.toFixed(1)
        }, { status: 400 });
      }
    }

    console.log(`[API vectorize POST] Updating document ${documentId} status to 'processing'`);
    
    // Use admin client to update document status
    const { error: updateError } = await adminSupabase
      .from('documents')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('document_id', documentId);

    if (updateError) {
      console.error(`[API vectorize POST] Error updating document status: ${updateError.message}`);
      return NextResponse.json({ error: 'Failed to update document status' }, { status: 500 });
    }
    
    console.log(`[API vectorize POST] Document ${documentId} status updated successfully`);

    // Process in the background using the imported function
    processDocumentFile(document as Document)
      .catch(error => console.error(`Background processing error for doc ${document.document_id}:`, error));

    return NextResponse.json({ message: 'Document processing started' });
  } catch (error) {
    console.error('Error in document processing endpoint (POST):', error);
    return NextResponse.json(
      { error: 'Internal server error during POST' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log("[API vectorize GET] Document processing status request received");
  try {
    // Extract chatbotId from URL
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/');
    const chatbotId = segments[segments.indexOf('chatbots') + 1];
    
    if (!chatbotId) {
      return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
    }
    
    console.log("[API vectorize GET] Fetching status for chatbot ID:", chatbotId);
    
    // Get both standard and admin clients
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      console.error("[API vectorize GET] Missing documentId parameter");
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Use admin client to verify chatbot ownership
    console.log(`[API vectorize GET] Verifying chatbot ownership: chatbotId=${chatbotId}, userId=${user.id}`);
    const { data: chatbot, error: chatbotError } = await adminSupabase
      .from('chatbots')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .single();

    if (chatbotError) {
      console.error(`[API vectorize GET] Error finding chatbot: ${chatbotError.message}`);
      return NextResponse.json({ error: `Chatbot not found: ${chatbotError.message}` }, { status: 404 });
    }
    
    if (!chatbot) {
      console.error(`[API vectorize GET] Chatbot not found with ID: ${chatbotId}`);
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }
    
    // Check if user owns the chatbot
    if (chatbot.teacher_id !== user.id) {
      console.error(`[API vectorize GET] Authorization error: User ${user.id} is not the owner of chatbot ${chatbotId}. Owner: ${chatbot.teacher_id}`);
      return NextResponse.json({ error: 'Not authorized to access documents for this chatbot' }, { status: 403 });
    }

    console.log(`[API vectorize GET] Looking up document: ${documentId} for chatbot: ${chatbotId}`);
    
    // Use admin client to get document
    const { data: document, error: documentError } = await adminSupabase
      .from('documents')
      .select('*')
      .eq('document_id', documentId)
      .eq('chatbot_id', chatbotId)
      .single();

    if (documentError) {
      console.error(`[API vectorize GET] Error finding document: ${documentError.message}`);
      return NextResponse.json({ error: `Document not found: ${documentError.message}` }, { status: 404 });
    }
    
    if (!document) {
      console.error(`[API vectorize GET] Document not found with ID: ${documentId}`);
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    console.log(`[API vectorize GET] Fetching document chunks for document: ${documentId}`);
    
    // Use admin client to fetch chunks
    const { data: allChunks, error: chunksError } = await adminSupabase
      .from('document_chunks')
      .select('status')
      .eq('document_id', documentId);

    if (chunksError) {
      console.error(`[API vectorize GET] Error fetching document chunks: ${chunksError.message}`);
      return NextResponse.json({ error: 'Failed to fetch document chunks' }, { status: 500 });
    }

    const totalChunks = allChunks?.length || 0;
    const processedChunks = allChunks?.filter(chunk => chunk.status === 'embedded').length || 0;
    const errorChunks = allChunks?.filter(chunk => chunk.status === 'error').length || 0;
    const percentComplete = totalChunks ? Math.round((processedChunks / totalChunks) * 100) : 0;

    console.log(`Status for doc ${documentId}: Total ${totalChunks}, Processed ${processedChunks}, Errors ${errorChunks}, Complete ${percentComplete}%`);

    return NextResponse.json({
      document,
      processingStats: {
        totalChunks,
        processedChunks,
        errorChunks,
        percentComplete
      }
    });
  } catch (error) {
    console.error('Error fetching processing status (GET):', error);
    return NextResponse.json(
      { error: 'Failed to fetch processing status' },
      { status: 500 }
    );
  }
}