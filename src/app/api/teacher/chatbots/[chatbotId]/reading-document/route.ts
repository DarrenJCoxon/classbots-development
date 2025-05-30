// src/app/api/teacher/chatbots/[chatbotId]/reading-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseVideoUrl, validateVideoUrl, formatVideoMetadata } from '@/lib/utils/video-utils';
import { fetchYouTubeTranscript, formatTranscriptForKnowledgeBase } from '@/lib/youtube/transcript';
import { processDocument } from '@/lib/document-processing/processor';
import { Document as KnowledgeDocument } from '@/types/knowledge-base.types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { chatbotId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the chatbot exists and belongs to the teacher
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('chatbot_id, teacher_id, bot_type')
      .eq('chatbot_id', chatbotId)
      .eq('teacher_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    if (chatbot.bot_type !== 'reading_room' && chatbot.bot_type !== 'viewing_room') {
      return NextResponse.json({ error: 'This chatbot is not a Reading Room or Viewing Room bot' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type');
    
    // Handle video URL submission
    if (contentType?.includes('application/json')) {
      const body = await request.json();
      const { videoUrl } = body;
      
      if (!videoUrl) {
        return NextResponse.json({ error: 'No video URL provided' }, { status: 400 });
      }
      
      // Validate video URL
      const validation = validateVideoUrl(videoUrl);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      
      // Parse video information
      const videoInfo = parseVideoUrl(videoUrl);
      const videoMetadata = formatVideoMetadata(videoInfo);
      
      // Check if there's an existing reading document
      const { data: existingDoc } = await supabase
        .from('reading_documents')
        .select('id, file_path')
        .eq('chatbot_id', chatbotId)
        .single();
      
      if (existingDoc) {
        // If switching from PDF to video, delete the old PDF file
        if (existingDoc.file_path) {
          await supabase.storage
            .from('documents')
            .remove([existingDoc.file_path]);
        }
        
        // Update the existing record for video
        const { error: updateError } = await supabase
          .from('reading_documents')
          .update({
            content_type: 'video',
            file_name: videoMetadata.originalUrl,
            file_path: null,
            file_url: null,
            file_size: 0,
            video_url: videoInfo.originalUrl,
            video_platform: videoInfo.platform,
            video_id: videoInfo.videoId,
            video_metadata: videoMetadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDoc.id);
        
        if (updateError) {
          console.error('Database update error:', updateError);
          return NextResponse.json({ error: updateError.message || 'Failed to update reading document' }, { status: 500 });
        }
      } else {
        // Create new reading document record for video
        const { error: dbError } = await supabase
          .from('reading_documents')
          .insert({
            chatbot_id: chatbotId,
            content_type: 'video',
            file_name: videoMetadata.originalUrl,
            file_path: null,
            file_url: null,
            file_size: 0,
            video_url: videoInfo.originalUrl,
            video_platform: videoInfo.platform,
            video_id: videoInfo.videoId,
            video_metadata: videoMetadata
          });
        
        if (dbError) {
          console.error('Database insert error:', dbError);
          return NextResponse.json({ error: dbError.message || 'Failed to save reading document' }, { status: 500 });
        }
      }
      
      // For viewing_room bots, fetch and add transcript to knowledge base
      if (chatbot.bot_type === 'viewing_room' && videoInfo.platform === 'youtube' && videoInfo.videoId) {
        try {
          console.log('[Viewing Room] Fetching YouTube transcript for video:', videoInfo.videoId);
          
          // Fetch YouTube transcript
          const transcript = await fetchYouTubeTranscript(videoInfo.videoId);
          
          if (transcript) {
            // Format transcript for knowledge base
            const formattedTranscript = formatTranscriptForKnowledgeBase(transcript);
            
            // Save transcript as a text file in storage
            const transcriptFileName = `transcript_${videoInfo.videoId}_${Date.now()}.txt`;
            const transcriptPath = `${chatbotId}/${transcriptFileName}`;
            
            // Upload transcript to storage
            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(transcriptPath, new Blob([formattedTranscript], { type: 'text/plain' }), {
                contentType: 'text/plain',
                upsert: false
              });
            
            if (uploadError) {
              console.error('[Viewing Room] Error uploading transcript:', uploadError);
              throw uploadError;
            }
            
            // Create a document record for the transcript
            const { data: transcriptDoc, error: docError } = await supabase
              .from('documents')
              .insert({
                chatbot_id: chatbotId,
                file_name: `Video Transcript: ${transcript.title || videoInfo.videoId}`,
                file_type: 'text',
                file_size: formattedTranscript.length,
                file_path: transcriptPath,
                status: 'uploaded',
                original_url: videoInfo.originalUrl
              })
              .select()
              .single();
            
            if (docError) {
              console.error('[Viewing Room] Error creating transcript document:', docError);
            } else if (transcriptDoc) {
              console.log('[Viewing Room] Created transcript document:', transcriptDoc.id);
              
              // Process the transcript for embeddings
              try {
                // Process the document to generate embeddings
                await processDocument(transcriptDoc as KnowledgeDocument);
                
                // Update document status to completed
                await supabase
                  .from('documents')
                  .update({ status: 'completed' })
                  .eq('id', transcriptDoc.id);
                  
                console.log('[Viewing Room] Successfully processed transcript embeddings');
              } catch (processError) {
                console.error('[Viewing Room] Error processing transcript:', processError);
                
                // Update document status to error
                await supabase
                  .from('documents')
                  .update({ 
                    status: 'error',
                    error_message: processError instanceof Error ? processError.message : 'Failed to process transcript'
                  })
                  .eq('id', transcriptDoc.id);
              }
            }
          } else {
            console.log('[Viewing Room] No transcript available for video:', videoInfo.videoId);
          }
        } catch (error) {
          console.error('[Viewing Room] Error fetching/processing transcript:', error);
          // Don't fail the whole request if transcript fetching fails
          // The video URL is still saved and usable
        }
      }
      
      return NextResponse.json({
        message: 'Video reading document saved successfully',
        document: {
          content_type: 'video',
          video_url: videoInfo.originalUrl,
          video_platform: videoInfo.platform,
          video_id: videoInfo.videoId,
          embed_url: videoInfo.embedUrl
        }
      });
    }
    
    // Handle PDF file upload (existing logic)
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type (PDF only for reading documents)
    const validTypes = ['application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF files are allowed for reading documents' }, { status: 400 });
    }

    // Check file size (max 20MB for reading documents)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 20MB' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    // Generate unique filename - use a flat structure to avoid path issues
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${chatbotId}_${timestamp}_${safeFileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Check if it's a bucket not found error
      if (uploadError.message?.includes('bucket')) {
        return NextResponse.json({ error: 'Storage bucket not configured. Please ensure the "documents" bucket exists.' }, { status: 500 });
      }
      return NextResponse.json({ error: uploadError.message || 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // First check if there's an existing reading document
    const { data: existingDoc } = await supabase
      .from('reading_documents')
      .select('id, file_path')
      .eq('chatbot_id', chatbotId)
      .single();

    if (existingDoc) {
      // Delete the old file from storage
      if (existingDoc.file_path) {
        await supabase.storage
          .from('documents')
          .remove([existingDoc.file_path]);
      }

      // Update the existing record for PDF
      const { error: updateError } = await supabase
        .from('reading_documents')
        .update({
          content_type: 'pdf',
          file_name: file.name,
          file_path: fileName,
          file_url: publicUrl,
          file_size: file.size,
          video_url: null,
          video_platform: null,
          video_id: null,
          video_metadata: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDoc.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        // Try to clean up uploaded file
        await supabase.storage.from('documents').remove([fileName]);
        return NextResponse.json({ error: updateError.message || 'Failed to update reading document' }, { status: 500 });
      }
    } else {
      // Create new reading document record for PDF
      const { error: dbError } = await supabase
        .from('reading_documents')
        .insert({
          chatbot_id: chatbotId,
          content_type: 'pdf',
          file_name: file.name,
          file_path: fileName,
          file_url: publicUrl,
          file_size: file.size
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Try to clean up uploaded file
        await supabase.storage.from('documents').remove([fileName]);
        return NextResponse.json({ error: dbError.message || 'Failed to save reading document' }, { status: 500 });
      }
    }

    return NextResponse.json({
      message: 'Reading document uploaded successfully',
      document: {
        content_type: 'pdf',
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size
      }
    });

  } catch (error) {
    console.error('Error uploading reading document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred while uploading the reading document' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { chatbotId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get reading document for this chatbot
    const { data: document, error } = await supabase
      .from('reading_documents')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching reading document:', error);
      return NextResponse.json({ error: 'Failed to fetch reading document' }, { status: 500 });
    }

    return NextResponse.json({ document });

  } catch (error) {
    console.error('Error fetching reading document:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the reading document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { chatbotId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the document to delete
    const { data: document, error: fetchError } = await supabase
      .from('reading_documents')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Reading document not found' }, { status: 404 });
    }

    // Delete from storage
    if (document.file_path) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);
      
      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('reading_documents')
      .delete()
      .eq('id', document.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete reading document' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Reading document deleted successfully' });

  } catch (error) {
    console.error('Error deleting reading document:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting the reading document' },
      { status: 500 }
    );
  }
}