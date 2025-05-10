// src/app/api/teacher/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DocumentType } from '@/types/knowledge-base.types'; // Assuming Document is your DB type

// Helper function (can be moved to a utility file)
function getFileType(fileName: string): DocumentType | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf': return 'pdf';
    case 'docx': case 'doc': return 'docx'; // doc maps to docx type for processing
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
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[API /documents GET] Not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is a teacher and owns the chatbot
    const { data: chatbot, error: chatbotOwnerError } = await supabase
      .from('chatbots')
      .select('chatbot_id')
      .eq('chatbot_id', chatbotId)
      .eq('teacher_id', user.id)
      .single();

    if (chatbotOwnerError || !chatbot) {
      console.log(`[API /documents GET] Chatbot not found or not owned by user ${user.id}. ChatbotId: ${chatbotId}`, chatbotOwnerError);
      return NextResponse.json({ error: 'Chatbot not found or not authorized' }, { status: 404 });
    }

    // Get all documents for this chatbot
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .order('created_at', { ascending: false });

    if (documentsError) {
      console.error('[API /documents GET] Error fetching documents:', documentsError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json(documents || []);

  } catch (error) {
    console.error('[API /documents GET] General Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// --- POST Handler: Upload a new document for a chatbot ---
export async function POST(request: NextRequest) {
  console.log("[API /documents POST] Document upload request received");
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const chatbotId = formData.get('chatbotId') as string | null; // Expect chatbotId in FormData

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!chatbotId) {
      return NextResponse.json({ error: 'Chatbot ID not provided in form data' }, { status: 400 });
    }
    console.log(`[API /documents POST] Processing for chatbot ID: ${chatbotId}, File: ${file.name}`);

    // Verify user owns the chatbot they are uploading to
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('chatbot_id')
      .eq('chatbot_id', chatbotId)
      .eq('teacher_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found or unauthorized for upload' }, { status: 404 });
    }

    const fileType = getFileType(file.name);
    if (!fileType) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const filePath = `${user.id}/${chatbotId}/${Date.now()}-${file.name}`; // Add timestamp for uniqueness
    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('documents') // Your storage bucket name
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false // Consider if upsert is needed, usually false for new unique uploads
      });

    if (uploadError) {
      console.error("[API /documents POST] Storage upload error:", uploadError);
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 });
    }

    const { data: documentRecord, error: documentInsertError } = await supabase
      .from('documents')
      .insert({
        chatbot_id: chatbotId,
        file_name: file.name,
        file_path: filePath,
        file_type: fileType,
        file_size: file.size,
        status: 'uploaded' // Initial status
      })
      .select()
      .single();

    if (documentInsertError) {
      console.error("[API /documents POST] Document insert error:", documentInsertError);
      await supabase.storage.from('documents').remove([filePath]); // Cleanup storage
      return NextResponse.json({ error: `Failed to create document record: ${documentInsertError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      document: documentRecord,
      message: 'Document uploaded successfully. Processing will begin shortly.'
    }, { status: 201 });

  } catch (error) {
    console.error('[API /documents POST] General Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload document' },
      { status: 500 }
    );
  }
}


// --- DELETE Handler: Delete a specific document ---
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
  }
  console.log(`[API /documents DELETE] Request for documentId: ${documentId}`);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Important: Verify the teacher owns the chatbot that this document belongs to.
    // This requires fetching the document, then its chatbot, then checking chatbot's teacher_id.
    const { data: document, error: docFetchError } = await supabase
        .from('documents')
        .select('document_id, chatbot_id, file_path') // Include file_path for storage deletion
        .eq('document_id', documentId)
        .single();

    if (docFetchError || !document) {
        console.log(`[API /documents DELETE] Document not found: ${documentId}`, docFetchError);
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { data: chatbot, error: chatbotFetchError } = await supabase
        .from('chatbots')
        .select('teacher_id')
        .eq('chatbot_id', document.chatbot_id)
        .single();
    
    if (chatbotFetchError || !chatbot || chatbot.teacher_id !== user.id) {
        console.log(`[API /documents DELETE] Unauthorized to delete document ${documentId} or chatbot not found.`);
        return NextResponse.json({ error: 'Unauthorized or chatbot not found' }, { status: 403 });
    }

    // Proceed with deletion
    // 1. Delete from storage
    if (document.file_path) {
        const { error: storageError } = await supabase.storage.from('documents').remove([document.file_path]);
        if (storageError) {
            console.error(`[API /documents DELETE] Error deleting from storage ${document.file_path}:`, storageError);
            // Decide if this is a hard failure or if you proceed to delete DB record anyway
        }
    }

    // 2. Delete from 'documents' table (and 'document_chunks' via cascade if set up)
    const { error: dbDeleteError } = await supabase
      .from('documents')
      .delete()
      .eq('document_id', documentId);

    if (dbDeleteError) {
      console.error(`[API /documents DELETE] Error deleting document record ${documentId}:`, dbDeleteError);
      return NextResponse.json({ error: 'Failed to delete document record' }, { status: 500 });
    }
    
    // TODO: Also delete associated vectors from Pinecone here (e.g., call a Pinecone utility function)
    // await deleteDocumentVectorsFromPinecone(documentId);


    return NextResponse.json({ success: true, message: 'Document deleted successfully' });

  } catch (error) {
    console.error('[API /documents DELETE] General Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete document' },
      { status: 500 }
    );
  }
}