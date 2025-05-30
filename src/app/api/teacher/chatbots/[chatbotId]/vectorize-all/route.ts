// src/app/api/teacher/chatbots/[chatbotId]/vectorize-all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processDocument } from '@/lib/document-processing/processor';
import { processDocumentsFast } from '@/lib/document-processing/fast-processor';
import type { Document } from '@/types/knowledge-base.types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log("[API vectorize-all POST] Batch document processing request received");

  try {
    // Extract chatbotId from URL
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/');
    const chatbotId = segments[segments.indexOf('chatbots') + 1];
    
    if (!chatbotId) {
      return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
    }
    
    console.log("[API vectorize-all POST] Processing for chatbot ID:", chatbotId);
    
    // Get both standard and admin clients
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use admin client to verify chatbot ownership
    console.log(`[API vectorize-all POST] Verifying chatbot ownership: chatbotId=${chatbotId}, userId=${user.id}`);
    const { data: chatbot, error: chatbotError } = await adminSupabase
      .from('chatbots')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .single();

    if (chatbotError) {
      console.error(`[API vectorize-all POST] Error finding chatbot: ${chatbotError.message}`);
      return NextResponse.json({ error: `Chatbot not found: ${chatbotError.message}` }, { status: 404 });
    }
    
    if (!chatbot) {
      console.error(`[API vectorize-all POST] Chatbot not found with ID: ${chatbotId}`);
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }
    
    // Check if user owns the chatbot
    if (chatbot.teacher_id !== user.id) {
      console.error(`[API vectorize-all POST] Authorization error: User ${user.id} is not the owner of chatbot ${chatbotId}. Owner: ${chatbot.teacher_id}`);
      return NextResponse.json({ error: 'Not authorized to process documents for this chatbot' }, { status: 403 });
    }
    
    console.log(`[API vectorize-all POST] Authorization successful for user ${user.id} on chatbot ${chatbotId}`);

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("[API vectorize-all POST] Error parsing request body:", parseError);
      return NextResponse.json({ error: 'Invalid request body format' }, { status: 400 });
    }

    const { documentIds, fastMode = false } = body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      console.error("[API vectorize-all POST] Missing or invalid documentIds in request body");
      return NextResponse.json({ error: 'Document IDs array is required' }, { status: 400 });
    }

    console.log(`[API vectorize-all POST] Processing ${documentIds.length} documents in ${fastMode ? 'FAST' : 'standard'} mode`);
    
    // Get all documents
    const { data: documents, error: documentsError } = await adminSupabase
      .from('documents')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .in('document_id', documentIds);

    if (documentsError) {
      console.error(`[API vectorize-all POST] Error finding documents: ${documentsError.message}`);
      return NextResponse.json({ error: `Documents not found: ${documentsError.message}` }, { status: 404 });
    }
    
    if (!documents || documents.length === 0) {
      console.error(`[API vectorize-all POST] No documents found with provided IDs`);
      return NextResponse.json({ error: 'No documents found' }, { status: 404 });
    }

    // Filter out documents that are already processing or completed
    const documentsToProcess = documents.filter(doc => 
      doc.status === 'pending' || doc.status === 'error'
    );

    if (documentsToProcess.length === 0) {
      return NextResponse.json({ 
        message: 'No documents need processing',
        stats: {
          total: documents.length,
          alreadyProcessing: documents.filter(d => d.status === 'processing').length,
          completed: documents.filter(d => d.status === 'completed').length
        }
      });
    }

    console.log(`[API vectorize-all POST] ${documentsToProcess.length} documents need processing`);
    
    // Update all documents to processing status
    const documentIdsToProcess = documentsToProcess.map(d => d.document_id);
    await adminSupabase
      .from('documents')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .in('document_id', documentIdsToProcess);

    // Process in the background
    if (fastMode) {
      processDocumentsFast(documentsToProcess as Document[], 5)
        .catch(error => console.error(`Background FAST batch processing error:`, error));
    } else {
      // Process sequentially in standard mode
      (async () => {
        for (const doc of documentsToProcess) {
          try {
            await processDocument(doc as Document);
            console.log(`[API vectorize-all POST] Processed document ${doc.document_id}`);
          } catch (error) {
            console.error(`[API vectorize-all POST] Error processing document ${doc.document_id}:`, error);
          }
        }
      })().catch(error => console.error(`Background standard batch processing error:`, error));
    }

    return NextResponse.json({ 
      message: `Started processing ${documentsToProcess.length} documents`,
      mode: fastMode ? 'fast' : 'standard',
      documentsQueued: documentsToProcess.length,
      stats: {
        total: documents.length,
        processing: documentsToProcess.length,
        skipped: documents.length - documentsToProcess.length
      }
    });
  } catch (error) {
    console.error('Error in batch document processing endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error during batch processing' },
      { status: 500 }
    );
  }
}