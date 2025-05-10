// src/lib/document-processing/processor.ts
import { extractTextFromFile } from './extractor';
import { splitTextIntoChunks, estimateTokenCount } from './chunker';
import { generateEmbeddings } from '@/lib/openai/embeddings';
import { upsertVectors } from '@/lib/pinecone/utils';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Document, DocumentChunk, DocumentStatus } from '@/types/knowledge-base.types';

// Mock embedding function for fallback - using 1536 dimensions for OpenAI
function createMockEmbedding(): number[] {
  // Create a random vector - 1536 dimensions for OpenAI compatibility
  return Array(1536).fill(0).map(() => (Math.random() * 2) - 1);
}

/**
 * Process a document by extracting text, chunking, and generating embeddings
 */
export async function processDocument(document: Document): Promise<void> {
  console.log(`[PROCESSOR] Starting document processing for doc ID: ${document.document_id}, file: ${document.file_name}`);
  const supabase = await createServerSupabaseClient();

  try {
    // Update document status to processing (already done by caller, but good for robustness)
    await supabase
      .from('documents')
      .update({ status: 'processing' as DocumentStatus, updated_at: new Date().toISOString() })
      .eq('document_id', document.document_id);
    console.log(`[PROCESSOR ${document.document_id}] Status set to processing.`);

    // Download file from storage
    console.log(`[PROCESSOR ${document.document_id}] Downloading file from storage: ${document.file_path}`);
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('documents')
      .download(document.file_path);

    if (fileError || !fileData) {
      throw new Error(`Failed to download file: ${fileError?.message}`);
    }
    console.log(`[PROCESSOR ${document.document_id}] File downloaded successfully.`);

    // Extract text from file
    console.log(`[PROCESSOR ${document.document_id}] Extracting text from file type: ${document.file_type}`);
    const extractedText = await extractTextFromFile(
      Buffer.from(await fileData.arrayBuffer()),
      document.file_type
    );
    console.log(`[PROCESSOR ${document.document_id}] Extracted ${extractedText.length} characters.`);

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
    const openAIbatchSize = 20;
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
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    console.log(`[PROCESSOR ${document.document_id}] Generated ${embeddings.length} embeddings. ${usingMockEmbeddings ? '(Used MOCK embeddings for some)' : '(Used REAL embeddings)'}`);

    // Build vectors array with an initial filter to remove nulls
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
          text: chunks[i],
          fileName: document.file_name,
          fileType: document.file_type,
          isMockEmbedding: usingMockEmbeddings ? "true" : "false" // Use string to avoid type conflicts
        }
      });
    }

    if (preparedVectors.length === 0 && chunks.length > 0) {
        console.error(`[PROCESSOR ${document.document_id}] No vectors prepared for Pinecone, though chunks exist. This indicates an issue with chunk_id mapping.`);
        throw new Error("Failed to prepare vectors for Pinecone due to chunk ID mismatch.");
    }

    console.log(`[PROCESSOR ${document.document_id}] Prepared ${preparedVectors.length} vectors for Pinecone.`);

    let vectorsUpsertedSuccessfully = false;
    try {
      console.log(`[PROCESSOR ${document.document_id}] Upserting ${preparedVectors.length} vectors to Pinecone via SDK.`);
      await upsertVectors(preparedVectors);
      vectorsUpsertedSuccessfully = true;
      console.log(`[PROCESSOR ${document.document_id}] Successfully upserted vectors to Pinecone.`);
    } catch (pineconeError) {
        console.error(`[PROCESSOR ${document.document_id}] Error upserting vectors to Pinecone:`, pineconeError);
    }

    console.log(`[PROCESSOR ${document.document_id}] Updating chunk statuses in DB.`);
    for (const insertedChunk of insertedChunks) {
        const vectorAttempted = preparedVectors.find(v => v.id === insertedChunk.chunk_id);
        if (vectorAttempted) {
            await supabase
                .from('document_chunks')
                .update({
                    status: vectorsUpsertedSuccessfully ? 'embedded' : 'error',
                    embedding_id: vectorsUpsertedSuccessfully ? insertedChunk.chunk_id : null
                })
                .eq('chunk_id', insertedChunk.chunk_id);
        } else {
            await supabase
                .from('document_chunks')
                .update({ status: 'error' })
                .eq('chunk_id', insertedChunk.chunk_id);
        }
    }
    console.log(`[PROCESSOR ${document.document_id}] Chunk statuses updated.`);

    const finalDocStatus = vectorsUpsertedSuccessfully ? 'completed' : 'error';
    let finalErrorMessage = vectorsUpsertedSuccessfully ? null : 'Failed to upsert vectors to Pinecone.';
    if (usingMockEmbeddings && vectorsUpsertedSuccessfully) {
        finalErrorMessage = (finalErrorMessage ? finalErrorMessage + " " : "") + "Warning: Some or all embeddings are MOCK data.";
    }

    await supabase
      .from('documents')
      .update({
        status: finalDocStatus as DocumentStatus,
        error_message: finalErrorMessage,
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