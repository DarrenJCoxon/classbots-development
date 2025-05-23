// src/app/api/student/document/[documentId]/route.ts
import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const supabase = await createServerSupabaseClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a student
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'student') {
      return Response.json({ error: 'Access denied - students only' }, { status: 403 });
    }

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(`
        document_id,
        chatbot_id,
        file_name,
        file_path,
        file_type,
        file_size,
        status,
        chatbots!inner(
          chatbot_id,
          name,
          room_chatbots!inner(
            room_id,
            rooms!inner(
              room_id,
              name,
              student_rooms!inner(
                student_id
              )
            )
          )
        )
      `)
      .eq('document_id', documentId)
      .eq('chatbots.room_chatbots.rooms.student_rooms.student_id', user.id)
      .single();

    if (docError || !document) {
      console.error('[Student Document Access] Document not found or no access:', docError);
      return Response.json({ 
        error: 'Document not found or access denied' 
      }, { status: 404 });
    }

    // Check if document is completed processing
    if (document.status !== 'completed') {
      return Response.json({ 
        error: 'Document is still being processed',
        status: document.status 
      }, { status: 423 }); // 423 Locked
    }

    // For webpage type documents, return the URL directly
    if (document.file_type === 'webpage') {
      return Response.json({
        document: {
          id: document.document_id,
          name: document.file_name,
          type: document.file_type,
          url: document.file_path, // For webpages, file_path is the URL
          size: document.file_size
        }
      });
    }

    // For file documents, generate a signed URL for secure access
    const supabaseAdmin = createAdminClient();
    
    try {
      console.log('[Student Document Access] Generating URL for:', document.file_path);
      console.log('[Student Document Access] Document type:', document.file_type);
      
      // If file_path is already a full URL (e.g., from external sources), return it directly
      if (document.file_path && document.file_path.startsWith('http')) {
        console.log('[Student Document Access] File path is already a URL');
        return Response.json({
          document: {
            id: document.document_id,
            name: document.file_name,
            type: 'pdf', // Ensure type is 'pdf' for PDF files
            url: document.file_path,
            size: document.file_size
          }
        });
      }
      
      // Otherwise, generate a signed URL from Supabase storage
      console.log('[Student Document Access] Attempting to generate signed URL for:', document.file_path);
      const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
        .from('documents')
        .createSignedUrl(document.file_path, 3600); // 1 hour expiry

      if (urlError || !signedUrlData) {
        console.error('[Student Document Access] Failed to create signed URL:', urlError);
        console.error('[Student Document Access] File path was:', document.file_path);
        
        // Try public URL as fallback
        console.log('[Student Document Access] Trying public URL as fallback...');
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('documents')
          .getPublicUrl(document.file_path);
          
        if (publicUrlData?.publicUrl) {
          console.log('[Student Document Access] Using public URL:', publicUrlData.publicUrl);
          return Response.json({
            document: {
              id: document.document_id,
              name: document.file_name,
              type: 'pdf', // Ensure type is 'pdf' for PDF files
              url: publicUrlData.publicUrl,
              size: document.file_size
            }
          });
        }
        
        return Response.json({ 
          error: 'Failed to generate document access URL. The document may not be properly uploaded.' 
        }, { status: 500 });
      }

      console.log('[Student Document Access] Generated signed URL successfully');
      console.log('[Student Document Access] URL:', signedUrlData.signedUrl);
      return Response.json({
        document: {
          id: document.document_id,
          name: document.file_name,
          type: 'pdf', // Ensure type is 'pdf' for PDF files
          url: signedUrlData.signedUrl,
          size: document.file_size
        }
      });

    } catch (storageError) {
      console.error('[Student Document Access] Storage error:', storageError);
      return Response.json({ 
        error: 'Failed to access document file' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Student Document Access] Unexpected error:', error);
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}