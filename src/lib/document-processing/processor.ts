// src/lib/document-processing/processor.ts
import { extractTextFromFile } from './extractor';
import { splitTextIntoChunks, estimateTokenCount } from './chunker';
import { generateEmbeddings } from '@/lib/openai/embeddings';
import { upsertVectors } from '@/lib/pinecone/utils';
import { createAdminClient } from '@/lib/supabase/admin';
import { Document, DocumentChunk, DocumentStatus, DocumentType } from '@/types/knowledge-base.types'; // MODIFIED: Added DocumentType
import { extractContentFromUrl } from '@/lib/scraping/content-extractor'; // MODIFIED: Import new utility

// Mock embedding function for fallback - using 1536 dimensions for OpenAI
function createMockEmbedding(): number[] {
  // Create a random vector - 1536 dimensions for OpenAI compatibility
  return Array(1536).fill(0).map(() => (Math.random() * 2) - 1);
}

/**
 * Process a document by extracting text, chunking, and generating embeddings
 */
export async function processDocument(document: Document): Promise<void> {
  console.log(`[PROCESSOR] Starting document processing for doc ID: ${document.document_id}, name: ${document.file_name}, type: ${document.file_type}`);
  const supabase = createAdminClient();

  try {
    // Update document status to processing
    await supabase
      .from('documents')
      .update({ status: 'processing' as DocumentStatus, updated_at: new Date().toISOString() })
      .eq('document_id', document.document_id);
    console.log(`[PROCESSOR ${document.document_id}] Status set to processing.`);

    let extractedText: string;

    // MODIFIED: Handle text extraction based on document type
    if (document.file_type === 'webpage') {
      console.log(`[PROCESSOR ${document.document_id}] Extracting content from URL: ${document.file_path}`);
      const webContent = await extractContentFromUrl(document.file_path); // file_path holds the URL
      if (webContent.error || !webContent.textContent) {
        throw new Error(`Failed to extract content from URL ${document.file_path}: ${webContent.error || 'No text content found'}`);
      }
      extractedText = webContent.textContent;
      console.log(`[PROCESSOR ${document.document_id}] Extracted ${extractedText.length} characters from URL.`);
      // Optionally, update document_size if it wasn't set correctly at creation
      if (document.file_size !== extractedText.length) {
        await supabase.from('documents').update({ file_size: extractedText.length }).eq('document_id', document.document_id);
      }
    } else {
      // Existing logic for file-based documents
      console.log(`[PROCESSOR ${document.document_id}] Downloading file from storage: ${document.file_path}`);
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('documents')
        .download(document.file_path);

      if (fileError || !fileData) {
        throw new Error(`Failed to download file ${document.file_path}: ${fileError?.message}`);
      }
      console.log(`[PROCESSOR ${document.document_id}] File downloaded successfully.`);

      console.log(`[PROCESSOR ${document.document_id}] Extracting text from file type: ${document.file_type}`);
      // We know document.file_type cannot be 'webpage' here, so direct cast is safer
      extractedText = await extractTextFromFile(
        Buffer.from(await fileData.arrayBuffer()),
        document.file_type as Exclude<DocumentType, 'webpage'> 
      );
      console.log(`[PROCESSOR ${document.document_id}] Extracted ${extractedText.length} characters from file.`);
    }

    // Split text into chunks
    console.log(`[PROCESSOR ${document.document_id}] Splitting text into chunks.`);
    const chunks = splitTextIntoChunks(extractedText);
    console.log(`[PROCESSOR ${document.document_id}] Created ${chunks.length} chunks.`);

    if (chunks.length === 0) {
        console.warn(`[PROCESSOR ${document.document_id}] No chunks generated. Document might be empty or too small.`);
        await supabase
          .from('documents')
          .update({ status: 'completed' as DocumentStatus, error_message: 'No content to process.', updated_at: new Date().toISOString() })
          .eq('document_id', document.document_id);
        return;
    }

    // Create chunk records in database
    console.log(`[PROCESSOR ${document.document_id}] Creating database records for chunks.`);
    const chunkRecords: Partial<DocumentChunk>[] = chunks.map((chunkText, index) => ({
      document_id: document.document_id,
      chunk_index: index,
      chunk_text: chunkText,
      token_count: estimateTokenCount(chunkText),
      status: 'pending'
    }));

    const { data: insertedChunks, error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunkRecords)
      .select();

    if (chunksError) {
      throw new Error(`Failed to insert chunks: ${chunksError.message}`);
    }
    if (!insertedChunks || insertedChunks.length === 0) {
        throw new Error("No chunks were inserted into the database, though chunks were generated.");
    }
    console.log(`[PROCESSOR ${document.document_id}] Inserted ${insertedChunks.length} chunk records.`);

    // SAFER APPROACH: Process chunks in smaller batches for OpenAI embeddings
    // Increased from 20 to 100 for better performance (OpenAI supports up to 2048)
    const openAIbatchSize = 100;
    let usingMockEmbeddings = false;
    let embeddings: number[][] = [];

    console.log(`[PROCESSOR ${document.document_id}] Generating embeddings in batches of ${openAIbatchSize}.`);
    for (let i = 0; i < chunks.length; i += openAIbatchSize) {
      const batchChunksText = chunks.slice(i, i + openAIbatchSize);
      console.log(`[PROCESSOR ${document.document_id}] Processing OpenAI batch ${Math.floor(i/openAIbatchSize) + 1}/${Math.ceil(chunks.length/openAIbatchSize)} (${batchChunksText.length} chunks)`);

      try {
        const batchEmbeddings = await generateEmbeddings(batchChunksText);
        embeddings = [...embeddings, ...batchEmbeddings];
      } catch (embedError) {
        console.error(`[PROCESSOR ${document.document_id}] Error generating embeddings for batch, falling back to mock:`, embedError);
        usingMockEmbeddings = true;
        const mockBatchEmbeddings = batchChunksText.map(() => createMockEmbedding());
        embeddings = [...embeddings, ...mockBatchEmbeddings];

        await supabase
          .from('documents')
          .update({
            error_message: `Warning: Using mock embeddings for some chunks. OpenAI API error: ${embedError instanceof Error ? embedError.message : String(embedError)}`
          })
          .eq('document_id', document.document_id);
      }
      if (chunks.length > openAIbatchSize) {
        // Reduced delay from 500ms to 100ms for better performance
        // OpenAI rate limits are generous for embeddings
        await new Promise(resolve => setTimeout(resolve, 100)); 
      }
    }
    console.log(`[PROCESSOR ${document.document_id}] Generated ${embeddings.length} embeddings. ${usingMockEmbeddings ? '(Used MOCK embeddings for some)' : '(Used REAL embeddings)'}`);

    // Build vectors array
    const preparedVectors = [];
    for (let i = 0; i < embeddings.length; i++) {
      const chunkId = insertedChunks[i]?.chunk_id;
      if (!chunkId) {
        console.error(`[PROCESSOR ${document.document_id}] Mismatch: No chunk_id for embedding at index ${i}. Skipping this vector.`);
        continue;
      }
      
      preparedVectors.push({
        id: chunkId,
        values: embeddings[i],
        metadata: {
          chatbotId: document.chatbot_id,
          documentId: document.document_id,
          chunkId: chunkId,
          text: chunks[i], // The actual chunk text
          fileName: document.file_name, // For webpages, this is the title or URL
          fileType: document.file_type, // Will be 'webpage' for URLs
          isMockEmbedding: usingMockEmbeddings ? "true" : "false"
        }
      });
    }

    if (preparedVectors.length === 0 && chunks.length > 0) {
        console.error(`[PROCESSOR ${document.document_id}] No vectors prepared for Pinecone, though chunks exist. This indicates an issue with chunk_id mapping.`);
        throw new Error("Failed to prepare vectors for Pinecone due to chunk ID mismatch.");
    }
    console.log(`[PROCESSOR ${document.document_id}] Prepared ${preparedVectors.length} vectors for Pinecone.`);

    let vectorsUpsertedSuccessfully = false;
    if (preparedVectors.length > 0) { // MODIFIED: Only upsert if there are vectors
        try {
          console.log(`[PROCESSOR ${document.document_id}] Upserting ${preparedVectors.length} vectors to Pinecone via SDK.`);
          await upsertVectors(preparedVectors);
          vectorsUpsertedSuccessfully = true;
          console.log(`[PROCESSOR ${document.document_id}] Successfully upserted vectors to Pinecone.`);
        } catch (pineconeError) {
            console.error(`[PROCESSOR ${document.document_id}] Error upserting vectors to Pinecone:`, pineconeError);
        }
    } else {
        console.log(`[PROCESSOR ${document.document_id}] No vectors to upsert to Pinecone.`);
        // If there were chunks but no vectors prepared, it's an error handled above.
        // If there were no chunks initially, this part is skipped.
        // If RAG is based on chunks, and no chunks, then "completed" is okay if no other error.
        if (chunks.length === 0) vectorsUpsertedSuccessfully = true; 
    }


    console.log(`[PROCESSOR ${document.document_id}] Updating chunk statuses in DB.`);
    for (const insertedChunk of insertedChunks) { // This loop will only run if chunks were inserted
        const vectorAttempted = preparedVectors.find(v => v.id === insertedChunk.chunk_id);
        const chunkStatus = vectorsUpsertedSuccessfully && vectorAttempted ? 'embedded' : 'error';
        
        await supabase
            .from('document_chunks')
            .update({
                status: chunkStatus,
                embedding_id: (chunkStatus === 'embedded' && vectorAttempted) ? insertedChunk.chunk_id : null // Set embedding_id only if successfully embedded
            })
            .eq('chunk_id', insertedChunk.chunk_id);
    }
    console.log(`[PROCESSOR ${document.document_id}] Chunk statuses updated.`);

    // Determine final document status
    const finalDocStatus = vectorsUpsertedSuccessfully ? 'completed' : 'error';
    let finalErrorMessage = vectorsUpsertedSuccessfully ? null : 'Failed to upsert vectors to Pinecone.';
    if (usingMockEmbeddings && vectorsUpsertedSuccessfully) { // If mock embeddings were used but upsert was "successful"
        finalErrorMessage = (finalErrorMessage ? finalErrorMessage + " " : "") + "Warning: Some or all embeddings are MOCK data.";
    }
    if (chunks.length === 0 && !document.error_message) { // If no chunks and no prior error, consider it completed (nothing to process)
         // Status already set to completed above for this case. Message already set.
    }


    await supabase
      .from('documents')
      .update({
        status: finalDocStatus as DocumentStatus,
        error_message: finalErrorMessage, // This might overwrite "No content to process." if an error occurs later.
        updated_at: new Date().toISOString()
      })
      .eq('document_id', document.document_id);
    console.log(`[PROCESSOR ${document.document_id}] Document final status set to ${finalDocStatus}. Processing finished.`);

  } catch (error) {
    console.error(`[PROCESSOR ${document.document_id}] Critical error during processing:`, error);
    await supabase
      .from('documents')
      .update({
        status: 'error' as DocumentStatus,
        error_message: error instanceof Error ? error.message : 'Unknown critical error during processing',
        updated_at: new Date().toISOString()
      })
      .eq('document_id', document.document_id);
    console.log(`[PROCESSOR ${document.document_id}] Document status updated to ERROR due to critical failure.`);
  }
}