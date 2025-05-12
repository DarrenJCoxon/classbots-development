// src/app/api/teacher/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DocumentType } from '@/types/knowledge-base.types'; // Use DocumentType only
import { createAdminClient } from '@/lib/supabase/admin'; // For potential cascade deletes or privileged ops if needed

// Helper function to determine file type
function getFileTypeFromFile(file: File): DocumentType | null {
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf': return 'pdf';
        case 'doc': case 'docx': return 'docx';
        case 'txt': return 'txt';
        default: return null;
    }
}

// --- GET Handler: Fetch documents for a specific chatbot ---
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chatbotId = searchParams.get('chatbotId');

  if (!chatbotId) {
    return NextResponse.json({ error: 'Chatbot ID is required as a query parameter' }, { status: 400 });
  }
  console.log(`[API /documents GET] Request for chatbotId: ${chatbotId}`);

  try {
    const supabase = await createServerSupabaseClient(); // User-context client
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[API /documents GET] Not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is a teacher and owns the chatbot
    const { data: chatbot, error: chatbotOwnerError } = await supabase
      .from('chatbots')
      .select('chatbot_id, teacher_id') // Select teacher_id for ownership check
      .eq('chatbot_id', chatbotId)
      .single(); // Use single to ensure it exists

    if (chatbotOwnerError || !chatbot) {
      console.log(`[API /documents GET] Chatbot not found for ID: ${chatbotId}`, chatbotOwnerError);
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }
    if (chatbot.teacher_id !== user.id) {
        console.log(`[API /documents GET] User ${user.id} does not own chatbot ${chatbotId}. Owner: ${chatbot.teacher_id}`);
        return NextResponse.json({ error: 'Not authorized to access documents for this chatbot' }, { status: 403 });
    }

    // Get all documents for this chatbot
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .order('created_at', { ascending: false });

    if (documentsError) {
      console.error('[API /documents GET] Error fetching documents from DB:', documentsError);
      return NextResponse.json({ error: 'Failed to fetch documents', details: documentsError.message }, { status: 500 });
    }

    return NextResponse.json(documents || []);

  } catch (error) {
    console.error('[API /documents GET] General Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents due to an unexpected error' },
      { status: 500 }
    );
  }
}

// --- POST Handler: Upload a new document for a chatbot ---
export async function POST(request: NextRequest) {
  console.log("[API /documents POST] Document upload request received");
  try {
    const supabase = await createServerSupabaseClient(); // User-context client
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const chatbotId = formData.get('chatbotId') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!chatbotId) return NextResponse.json({ error: 'Chatbot ID not provided in form data' }, { status: 400 });
    
    console.log(`[API /documents POST] Processing for chatbot ID: ${chatbotId}, File: ${file.name}`);

    // Verify user owns the chatbot
    const { data: chatbot, error: chatbotOwnerError } = await supabase
      .from('chatbots')
      .select('chatbot_id, teacher_id')
      .eq('chatbot_id', chatbotId)
      .single();

    if (chatbotOwnerError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found for upload' }, { status: 404 });
    }
    if (chatbot.teacher_id !== user.id) {
        return NextResponse.json({ error: 'Not authorized to upload documents to this chatbot' }, { status: 403 });
    }

    const fileType = getFileTypeFromFile(file);
    if (!fileType) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    
    // Max file size check (e.g., 10MB)
    const MAX_FILE_SIZE_MB = 10;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return NextResponse.json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.` }, { status: 413 });
    }


    const filePath = `${user.id}/${chatbotId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.\-]/g, '_')}`; // Sanitize file name slightly
    const buffer = await file.arrayBuffer();

    console.log(`[API /documents POST] Uploading to storage path: ${filePath}`);
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("[API /documents POST] Storage upload error:", uploadError);
      return NextResponse.json({ error: `Failed to upload file to storage: ${uploadError.message}` }, { status: 500 });
    }
    console.log(`[API /documents POST] File uploaded to storage successfully.`);

    const { data: documentRecord, error: documentInsertError } = await supabase
      .from('documents')
      .insert({
        chatbot_id: chatbotId,
        file_name: file.name,
        file_path: filePath,
        file_type: fileType,
        file_size: file.size,
        status: 'uploaded'
      })
      .select()
      .single();

    if (documentInsertError) {
      console.error("[API /documents POST] Document DB insert error:", documentInsertError);
      // Attempt to clean up storage if DB insert fails
      console.log(`[API /documents POST] Attempting to remove orphaned file from storage: ${filePath}`);
      await supabase.storage.from('documents').remove([filePath]);
      return NextResponse.json({ error: `Failed to create document record in database: ${documentInsertError.message}` }, { status: 500 });
    }
    console.log(`[API /documents POST] Document record created in DB: ${documentRecord.document_id}`);

    return NextResponse.json({
      document: documentRecord,
      message: 'Document uploaded successfully. Processing can now be initiated.'
    }, { status: 201 });

  } catch (error) {
    console.error('[API /documents POST] General Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload document due to an unexpected error' },
      { status: 500 }
    );
  }
}


// --- DELETE Handler: Delete a specific document ---
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return NextResponse.json({ error: 'Document ID is required as a query parameter' }, { status: 400 });
  }
  console.log(`[API /documents DELETE] Request for documentId: ${documentId}`);

  try {
    const supabase = await createServerSupabaseClient(); // User-context for initial checks
    const adminSupabase = createAdminClient(); // Admin client for actual deletion to ensure cascades work if RLS is restrictive
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch the document to get its chatbot_id and file_path, and to verify ownership indirectly
    const { data: document, error: docFetchError } = await supabase
        .from('documents')
        .select('document_id, chatbot_id, file_path')
        .eq('document_id', documentId)
        .single();

    if (docFetchError || !document) {
        console.log(`[API /documents DELETE] Document not found: ${documentId}`, docFetchError);
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify the user (teacher) owns the chatbot associated with this document
    const { data: chatbot, error: chatbotFetchError } = await supabase
        .from('chatbots')
        .select('teacher_id')
        .eq('chatbot_id', document.chatbot_id)
        .single();
    
    if (chatbotFetchError || !chatbot || chatbot.teacher_id !== user.id) {
        console.log(`[API /documents DELETE] User ${user.id} unauthorized to delete document ${documentId} or chatbot not found.`);
        return NextResponse.json({ error: 'Unauthorized to delete this document or its parent chatbot not found' }, { status: 403 });
    }

    // Proceed with deletion using admin client for broader permissions if needed for cascade
    // 1. Delete from 'documents' table (and 'document_chunks' via cascade if RLS on chunks allows or if admin client bypasses)
    // For cascading deletes to work reliably, ensure your foreign key constraint from document_chunks to documents has ON DELETE CASCADE.
    console.log(`[API /documents DELETE] Deleting document record ${documentId} from database.`);
    const { error: dbDeleteError } = await adminSupabase // Using admin for delete operation
      .from('documents')
      .delete()
      .eq('document_id', documentId);

    if (dbDeleteError) {
      console.error(`[API /documents DELETE] Error deleting document record ${documentId} from DB:`, dbDeleteError);
      return NextResponse.json({ error: 'Failed to delete document record from database', details: dbDeleteError.message }, { status: 500 });
    }
    console.log(`[API /documents DELETE] Document record ${documentId} deleted from database.`);

    // 2. Delete from storage
    if (document.file_path) {
        console.log(`[API /documents DELETE] Deleting file from storage: ${document.file_path}`);
        const { error: storageError } = await adminSupabase.storage.from('documents').remove([document.file_path]); // Use admin for storage ops too
        if (storageError) {
            console.error(`[API /documents DELETE] Error deleting file ${document.file_path} from storage:`, storageError);
            // Log this but don't necessarily fail the whole operation if DB record was deleted.
            // The document is effectively gone from the app's perspective. Orphaned storage files can be cleaned up later.
        } else {
            console.log(`[API /documents DELETE] File ${document.file_path} deleted from storage.`);
        }
    }
    
    // 3. TODO: Delete associated vectors from Pinecone (this requires a separate utility call)
    // import { deleteDocumentVectors } from '@/lib/pinecone/utils';
    // await deleteDocumentVectors(documentId).catch(pineconeError => {
    //    console.error(`[API /documents DELETE] Error deleting vectors from Pinecone for document ${documentId}:`, pineconeError);
    // });
    console.log(`[API /documents DELETE] TODO: Implement Pinecone vector deletion for document ${documentId}.`);


    return NextResponse.json({ success: true, message: 'Document deleted successfully' });

  } catch (error) {
    console.error('[API /documents DELETE] General Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete document due to an unexpected error' },
      { status: 500 }
    );
  }
}