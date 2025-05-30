// src/lib/document-processing/parallel-processor.ts
import { Document, DocumentStatus } from '@/types/knowledge-base.types';
import { createAdminClient } from '@/lib/supabase/admin';
import { processDocument } from './processor';

/**
 * Process multiple documents in parallel with rate limiting
 */
export async function processDocumentsInParallel(
  documents: Document[],
  maxConcurrent: number = 3
): Promise<void> {
  console.log(`[PARALLEL-PROCESSOR] Starting parallel processing for ${documents.length} documents with max ${maxConcurrent} concurrent`);
  
  const supabase = createAdminClient();
  const queue = [...documents];
  const inProgress = new Set<string>();
  const results: { documentId: string; status: 'success' | 'error'; error?: any }[] = [];
  
  async function processNext(): Promise<void> {
    if (queue.length === 0) return;
    
    const document = queue.shift()!;
    inProgress.add(document.document_id);
    
    try {
      await processDocument(document);
      results.push({ documentId: document.document_id, status: 'success' });
    } catch (error) {
      console.error(`[PARALLEL-PROCESSOR] Error processing document ${document.document_id}:`, error);
      results.push({ documentId: document.document_id, status: 'error', error });
      
      // Update document status to error
      await supabase
        .from('documents')
        .update({
          status: 'error' as DocumentStatus,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('document_id', document.document_id);
    } finally {
      inProgress.delete(document.document_id);
    }
  }
  
  // Start initial batch
  const promises: Promise<void>[] = [];
  for (let i = 0; i < Math.min(maxConcurrent, documents.length); i++) {
    promises.push(processNext());
  }
  
  // Process remaining documents as slots become available
  while (queue.length > 0 || inProgress.size > 0) {
    await Promise.race(promises.filter(p => p !== undefined));
    
    // Start next document if queue not empty
    if (queue.length > 0 && inProgress.size < maxConcurrent) {
      promises.push(processNext());
    }
  }
  
  // Wait for all to complete
  await Promise.all(promises);
  
  console.log(`[PARALLEL-PROCESSOR] Completed processing ${documents.length} documents`);
  console.log(`[PARALLEL-PROCESSOR] Success: ${results.filter(r => r.status === 'success').length}`);
  console.log(`[PARALLEL-PROCESSOR] Errors: ${results.filter(r => r.status === 'error').length}`);
}

/**
 * Process all pending documents for a chatbot in parallel
 */
export async function processPendingDocuments(chatbotId: string): Promise<void> {
  const supabase = createAdminClient();
  
  const { data: pendingDocs, error } = await supabase
    .from('documents')
    .select('*')
    .eq('chatbot_id', chatbotId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('[PARALLEL-PROCESSOR] Error fetching pending documents:', error);
    throw error;
  }
  
  if (!pendingDocs || pendingDocs.length === 0) {
    console.log('[PARALLEL-PROCESSOR] No pending documents found');
    return;
  }
  
  await processDocumentsInParallel(pendingDocs);
}