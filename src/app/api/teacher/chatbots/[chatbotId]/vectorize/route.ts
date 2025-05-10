// src/app/api/teacher/chatbots/[chatbotId]/vectorize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { processDocument as processDocumentFile } from '@/lib/document-processing/processor';
import type { Document } from '@/types/knowledge-base.types';

export async function POST(request: NextRequest) {
  console.log("Document processing request received via POST");

  try {
    // Extract chatbotId from URL
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/');
    const chatbotId = segments[segments.indexOf('chatbots') + 1];
    
    if (!chatbotId) {
      return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
    }
    
    console.log("Processing for chatbot ID:", chatbotId);
    
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .eq('teacher_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found or unauthorized' }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json({ error: 'Invalid request body format' }, { status: 400 });
    }

    const documentId = body.documentId;

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('document_id', documentId)
      .eq('chatbot_id', chatbotId)
      .single();

    if (documentError || !document) {
      console.error("Document not found:", documentError);
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.status === 'processing') {
      return NextResponse.json({ error: 'Document is already being processed' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('document_id', documentId);

    if (updateError) {
      console.error("Error updating document status:", updateError);
      return NextResponse.json({ error: 'Failed to update document status' }, { status: 500 });
    }

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
  console.log("Document processing status GET request received");
  try {
    // Extract chatbotId from URL
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/');
    const chatbotId = segments[segments.indexOf('chatbots') + 1];
    
    if (!chatbotId) {
      return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
    }
    
    console.log("Fetching status for chatbot ID:", chatbotId);
    
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .eq('teacher_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found or unauthorized' }, { status: 404 });
    }

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('document_id', documentId)
      .eq('chatbot_id', chatbotId)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { data: allChunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('status')
      .eq('document_id', documentId);

    if (chunksError) {
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