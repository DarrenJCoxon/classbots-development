// src/app/api/teacher/chatbots/[chatbotId]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  console.log("Document upload request received");
  
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

    // Rest of the function remains the same
    // Check if the chatbot belongs to the user
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('chatbot_id')
      .eq('chatbot_id', chatbotId)
      .eq('teacher_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found or unauthorized' }, { status: 404 });
    }

    // Get file from formData
    const formData = await request.formData();
    console.log("FormData received:", formData);
    
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log("File received:", file.name, file.type, file.size);

    // Validate file type
    const fileType = getFileType(file.name);
    if (!fileType) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Create storage path
    const filePath = `${user.id}/${chatbotId}/${file.name}`;
    
    // Get file buffer
    const buffer = await file.arrayBuffer();
    
    // Upload file to storage
    const { error: uploadError } = await supabase
      .storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 });
    }

    // Create document record
    const { data: document, error: documentError } = await supabase
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

    if (documentError) {
      console.error("Document insert error:", documentError);
      
      // Clean up uploaded file if document record creation fails
      await supabase.storage.from('documents').remove([filePath]);
      
      return NextResponse.json({ error: `Failed to create document record: ${documentError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      document: document,
      message: 'Document uploaded successfully. Processing will begin shortly.'
    });
  } catch (error) {
    console.error('Error in document upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload document' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Extract chatbotId from URL
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/');
    const chatbotId = segments[segments.indexOf('chatbots') + 1];
    
    if (!chatbotId) {
      return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
    }
    
    console.log("Fetching documents for chatbot ID:", chatbotId);
    
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if the chatbot belongs to the user
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('chatbot_id')
      .eq('chatbot_id', chatbotId)
      .eq('teacher_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found or unauthorized' }, { status: 404 });
    }

    // Get all documents for this chatbot
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .order('created_at', { ascending: false });

    if (documentsError) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json(documents || []);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// Helper function to determine file type
function getFileType(fileName: string): 'pdf' | 'docx' | 'txt' | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf': return 'pdf';
    case 'docx': case 'doc': return 'docx';
    case 'txt': return 'txt';
    default: return null;
  }
}