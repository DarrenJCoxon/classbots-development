// src/lib/document-processing/fast-processor.ts
import { Document, DocumentStatus } from '@/types/knowledge-base.types';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractTextFromFile } from './extractor';
import { generateEmbeddings } from '@/lib/openai/embeddings';
import { upsertVectors } from '@/lib/pinecone/utils';
import { extractContentFromUrl } from '@/lib/scraping/content-extractor';

// Optimized chunk settings
const FAST_CHUNK_SIZE = 2000; // Larger chunks = fewer embeddings
const FAST_CHUNK_OVERLAP = 100; // Less overlap = faster processing
const FAST_BATCH_SIZE = 200; // OpenAI can handle up to 2048

/**
 * Fast document processor with optimizations
 */
export async function processDocumentFast(document: Document): Promise<void> {
  console.log(`[FAST-PROCESSOR] Starting optimized processing for doc: ${document.document_id}`);
  const supabase = createAdminClient();
  const startTime = Date.now();

  try {
    // Update status
    await supabase
      .from('documents')
      .update({ 
        status: 'processing' as DocumentStatus, 
        updated_at: new Date().toISOString() 
      })
      .eq('document_id', document.document_id);

    // Extract text
    let extractedText: string;
    if (document.file_type === 'webpage') {
      const webContent = await extractContentFromUrl(document.file_path);
      if (webContent.error || !webContent.textContent) {
        throw new Error(`Failed to extract web content: ${webContent.error}`);
      }
      extractedText = webContent.textContent;
    } else {
      const { data: fileData, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);
      if (error || !fileData) {
        throw new Error(`Failed to download file: ${error?.message}`);
      }
      extractedText = await extractTextFromFile(
        Buffer.from(await fileData.arrayBuffer()),
        document.file_type as any
      );
    }

    // Fast chunking with larger chunks
    const chunks = splitTextFast(extractedText, FAST_CHUNK_SIZE, FAST_CHUNK_OVERLAP);
    console.log(`[FAST-PROCESSOR] Created ${chunks.length} chunks (optimized size)`);

    if (chunks.length === 0) {
      await supabase
        .from('documents')
        .update({ 
          status: 'completed' as DocumentStatus, 
          error_message: 'No content to process',
          updated_at: new Date().toISOString() 
        })
        .eq('document_id', document.document_id);
      return;
    }

    // Store extracted text for future use (avoid re-extraction)
    await supabase
      .from('documents')
      .update({ 
        extracted_text: extractedText.substring(0, 65535) // Store first 64KB
      })
      .eq('document_id', document.document_id);

    // Create chunk records with minimal data
    const chunkRecords = chunks.map((text, index) => ({
      document_id: document.document_id,
      chunk_index: index,
      chunk_text: text,
      token_count: Math.ceil(text.length / 4),
      status: 'pending'
    }));

    const { data: insertedChunks, error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunkRecords)
      .select('chunk_id');

    if (chunksError || !insertedChunks) {
      throw new Error(`Failed to insert chunks: ${chunksError?.message}`);
    }

    // Generate embeddings in larger batches
    const embeddings: number[][] = [];
    console.log(`[FAST-PROCESSOR] Generating embeddings in batches of ${FAST_BATCH_SIZE}`);
    
    for (let i = 0; i < chunks.length; i += FAST_BATCH_SIZE) {
      const batch = chunks.slice(i, i + FAST_BATCH_SIZE);
      const batchNum = Math.floor(i / FAST_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(chunks.length / FAST_BATCH_SIZE);
      
      console.log(`[FAST-PROCESSOR] Processing batch ${batchNum}/${totalBatches}`);
      
      try {
        // Process embeddings with no delay between batches
        const batchEmbeddings = await generateEmbeddings(batch);
        embeddings.push(...batchEmbeddings);
      } catch (error) {
        console.error(`[FAST-PROCESSOR] Embedding batch ${batchNum} failed:`, error);
        throw error; // Fail fast instead of using mock embeddings
      }
    }

    // Prepare vectors
    const vectors = embeddings.map((embedding, index) => ({
      id: insertedChunks[index].chunk_id,
      values: embedding,
      metadata: {
        chatbotId: document.chatbot_id,
        documentId: document.document_id,
        chunkId: insertedChunks[index].chunk_id,
        text: chunks[index],
        fileName: document.file_name,
        fileType: document.file_type,
        isMockEmbedding: "false"
      }
    }));

    // Upsert to Pinecone (already optimized with 100 vector batches)
    console.log(`[FAST-PROCESSOR] Upserting ${vectors.length} vectors to Pinecone`);
    await upsertVectors(vectors);

    // Update all chunks as embedded in one query
    const chunkIds = insertedChunks.map(c => c.chunk_id);
    await supabase
      .from('document_chunks')
      .update({ 
        status: 'embedded',
        updated_at: new Date().toISOString()
      })
      .in('chunk_id', chunkIds);

    // Mark document as completed
    const processingTime = Date.now() - startTime;
    await supabase
      .from('documents')
      .update({
        status: 'completed' as DocumentStatus,
        updated_at: new Date().toISOString(),
        error_message: `Processed in ${Math.round(processingTime / 1000)}s`
      })
      .eq('document_id', document.document_id);

    console.log(`[FAST-PROCESSOR] Completed in ${processingTime}ms`);

  } catch (error) {
    console.error(`[FAST-PROCESSOR] Error:`, error);
    await supabase
      .from('documents')
      .update({
        status: 'error' as DocumentStatus,
        error_message: error instanceof Error ? error.message : 'Processing failed',
        updated_at: new Date().toISOString()
      })
      .eq('document_id', document.document_id);
    throw error;
  }
}

/**
 * Optimized text splitting for faster processing
 */
function splitTextFast(text: string, chunkSize: number, overlap: number): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= chunkSize) return [cleaned];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = Math.min(start + chunkSize, cleaned.length);
    
    // Find break point only if not at end
    if (end < cleaned.length) {
      // Look for sentence break
      const sentenceEnd = cleaned.lastIndexOf('. ', end);
      if (sentenceEnd > start + chunkSize * 0.8) {
        end = sentenceEnd + 1;
      } else {
        // Look for word break
        const wordEnd = cleaned.lastIndexOf(' ', end);
        if (wordEnd > start + chunkSize * 0.9) {
          end = wordEnd;
        }
      }
    }

    chunks.push(cleaned.substring(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Process multiple documents with maximum parallelism
 */
export async function processDocumentsFast(
  documents: Document[],
  maxConcurrent: number = 5 // Increased default concurrency
): Promise<void> {
  console.log(`[FAST-PROCESSOR] Processing ${documents.length} documents with ${maxConcurrent} concurrent`);
  
  // Process in parallel batches
  const results = await Promise.allSettled(
    documents.map((doc, index) => 
      new Promise(async (resolve) => {
        // Stagger starts slightly to avoid thundering herd
        await new Promise(r => setTimeout(r, index * 100));
        try {
          await processDocumentFast(doc);
          resolve({ id: doc.document_id, status: 'success' });
        } catch (error) {
          resolve({ id: doc.document_id, status: 'error', error });
        }
      })
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  console.log(`[FAST-PROCESSOR] Completed: ${successful}/${documents.length} successful`);
}