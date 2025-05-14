// src/app/api/teacher/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DocumentType, DocumentStatus } from '@/types/knowledge-base.types'; // MODIFIED: Added DocumentStatus
import { createAdminClient } from '@/lib/supabase/admin';
import { extractContentFromUrl } from '@/lib/scraping/content-extractor'; // MODIFIED: Import new utility

// Helper function to determine file type
function getFileTypeFromFile(file: File): DocumentType | null {
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf': return 'pdf';
        case 'doc': case 'docx': return 'docx';
        case 'txt': return 'txt';
        // 'webpage' type is handled differently
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

// --- POST Handler: Upload a new document (file or URL) for a chatbot ---
export async function POST(request: NextRequest) {
  console.log("[API /documents POST] Document/URL add request received");
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const url = formData.get('url') as string | null; // MODIFIED: Get URL from form data
    const chatbotId = formData.get('chatbotId') as string | null;

    if (!chatbotId) {
        return NextResponse.json({ error: 'Chatbot ID not provided in form data' }, { status: 400 });
    }
    if (!file && !url) {
        return NextResponse.json({ error: 'No file or URL provided' }, { status: 400 });
    }
    if (file && url) {
        return NextResponse.json({ error: 'Provide either a file or a URL, not both' }, { status: 400 });
    }

    console.log(`[API /documents POST] Processing for chatbot ID: ${chatbotId}`);

    // Verify user owns the chatbot
    const { data: chatbot, error: chatbotOwnerError } = await supabase
      .from('chatbots')
      .select('chatbot_id, teacher_id')
      .eq('chatbot_id', chatbotId)
      .single();

    if (chatbotOwnerError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found for upload/add' }, { status: 404 });
    }
    if (chatbot.teacher_id !== user.id) {
        return NextResponse.json({ error: 'Not authorized to add documents to this chatbot' }, { status: 403 });
    }

    let documentRecordData;

    if (file) {
        // --- File Upload Logic (Existing) ---
        console.log(`[API /documents POST] Processing file: ${file.name}`);
        const fileType = getFileTypeFromFile(file);
        if (!fileType) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });

        const MAX_FILE_SIZE_MB = 10;
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            return NextResponse.json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.` }, { status: 413 });
        }

        const filePath = `${user.id}/${chatbotId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.\-]/g, '_')}`;
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

        const { data: dbDocument, error: documentInsertError } = await supabase
          .from('documents')
          .insert({
            chatbot_id: chatbotId,
            file_name: file.name,
            file_path: filePath,
            file_type: fileType,
            file_size: file.size,
            status: 'uploaded' as DocumentStatus,
          })
          .select()
          .single();

        if (documentInsertError) {
          console.error("[API /documents POST] Document DB insert error (file):", documentInsertError);
          await supabase.storage.from('documents').remove([filePath]);
          return NextResponse.json({ error: `Failed to create document record: ${documentInsertError.message}` }, { status: 500 });
        }
        documentRecordData = dbDocument;
        console.log(`[API /documents POST] File document record created: ${documentRecordData.document_id}`);
    } else if (url) {
        // --- URL Processing Logic (New) ---
        console.log(`[API /documents POST] Processing URL: ${url}`);
        if (!/^https?:\/\//i.test(url)) {
            return NextResponse.json({ error: 'Invalid URL format. Must start with http:// or https://' }, { status: 400 });
        }

        const extractedData = await extractContentFromUrl(url);

        if (extractedData.error || !extractedData.textContent) {
            console.error(`[API /documents POST] Error extracting content from URL ${url}:`, extractedData.error);
            return NextResponse.json({ error: extractedData.error || 'Failed to extract content from URL. The page might be inaccessible or have no readable content.' }, { status: 400 });
        }
        
        // For webpages, file_path will store the original URL.
        // file_name will store the extracted title (or a truncated URL).
        // file_size will be the length of the extracted text.
        const fileNameForDb = extractedData.title.substring(0, 255); // Max length for file_name
        const fileSizeForDb = extractedData.textContent.length;

        const { data: dbDocument, error: documentInsertError } = await supabase
          .from('documents')
          .insert({
            chatbot_id: chatbotId,
            file_name: fileNameForDb,
            file_path: url, // Store the original URL as the "path"
            file_type: 'webpage' as DocumentType,
            file_size: fileSizeForDb,
            status: 'fetched' as DocumentStatus, // New status for successfully fetched URL content
          })
          .select()
          .single();

        if (documentInsertError) {
          console.error("[API /documents POST] Document DB insert error (URL):", documentInsertError);
          return NextResponse.json({ error: `Failed to create document record for URL: ${documentInsertError.message}` }, { status: 500 });
        }
        documentRecordData = dbDocument;
        console.log(`[API /documents POST] Webpage document record created: ${documentRecordData.document_id}`);
    } else {
        // This case should not be reached due to earlier checks, but as a safeguard:
        return NextResponse.json({ error: 'No file or URL provided (safeguard).' }, { status: 400 });
    }

    return NextResponse.json({
      document: documentRecordData,
      message: file ? 'File uploaded successfully. Processing can now be initiated.' : 'Webpage added successfully. Processing can now be initiated.'
    }, { status: 201 });

  } catch (error) {
    console.error('[API /documents POST] General Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request due to an unexpected error' },
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
    const supabase = await createServerSupabaseClient(); 
    const adminSupabase = createAdminClient(); 
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: document, error: docFetchError } = await supabase
        .from('documents')
        .select('document_id, chatbot_id, file_path, file_type') // MODIFIED: Added file_type
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
        console.log(`[API /documents DELETE] User ${user.id} unauthorized to delete document ${documentId} or chatbot not found.`);
        return NextResponse.json({ error: 'Unauthorized to delete this document or its parent chatbot not found' }, { status: 403 });
    }

    console.log(`[API /documents DELETE] Deleting document record ${documentId} from database.`);
    const { error: dbDeleteError } = await adminSupabase
      .from('documents')
      .delete()
      .eq('document_id', documentId);

    if (dbDeleteError) {
      console.error(`[API /documents DELETE] Error deleting document record ${documentId} from DB:`, dbDeleteError);
      return NextResponse.json({ error: 'Failed to delete document record from database', details: dbDeleteError.message }, { status: 500 });
    }
    console.log(`[API /documents DELETE] Document record ${documentId} deleted from database.`);

    // MODIFIED: Only delete from storage if it's not a 'webpage' type (where file_path is the URL)
    if (document.file_type !== 'webpage' && document.file_path) {
        console.log(`[API /documents DELETE] Deleting file from storage: ${document.file_path}`);
        const { error: storageError } = await adminSupabase.storage.from('documents').remove([document.file_path]);
        if (storageError) {
            console.error(`[API /documents DELETE] Error deleting file ${document.file_path} from storage:`, storageError);
        } else {
            console.log(`[API /documents DELETE] File ${document.file_path} deleted from storage.`);
        }
    } else if (document.file_type === 'webpage') {
        console.log(`[API /documents DELETE] Document type is 'webpage', skipping storage deletion for URL: ${document.file_path}`);
    }
    
    // TODO: Implement Pinecone vector deletion for document
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