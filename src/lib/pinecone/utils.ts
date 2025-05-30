// src/lib/pinecone/utils.ts
import { index, pinecone } from './client';
import { RecordMetadata } from '@pinecone-database/pinecone';

interface ChunkMetadata extends RecordMetadata {
  chatbotId: string;
  documentId: string;
  chunkId: string;
  text: string;
  fileName: string;
  fileType: string;
}

/**
 * Upsert vectors into Pinecone with enhanced error handling
 * @param vectors Array of vectors with their IDs and metadata
 */
export async function upsertVectors(
  vectors: { 
    id: string, 
    values: number[], 
    metadata: ChunkMetadata 
  }[]
) {
  // Validate that Pinecone is initialized
  if (!index || !pinecone) {
    console.error('Pinecone client not initialized. Check your API key and environment variables.');
    throw new Error('Pinecone client not initialized. Check API key and environment variables.');
  }

  try {
    // Increased batch size for better performance
    // Pinecone can handle up to 100 vectors per batch
    const batchSize = 100;
    
    console.log(`Upserting ${vectors.length} vectors in batches of ${batchSize}`);
    
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      console.log(`Upserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(vectors.length/batchSize)}`);
      
      try {
        // Add retries for resilience
        let retries = 0;
        const maxRetries = 2; // Reduced from 3 to 2 for faster failure
        let success = false;
        
        while (!success && retries < maxRetries) {
          try {
            await index.upsert(batch);
            success = true;
            console.log(`Successfully upserted batch ${Math.floor(i/batchSize) + 1}`);
          } catch (retryError) {
            retries++;
            console.warn(`Retry ${retries}/${maxRetries} failed:`, retryError);
            
            // Print detailed error information
            if (retryError instanceof Error) {
              console.warn('Error message:', retryError.message);
              
              // Log the first part of HTML responses for debugging
              if (retryError.message.includes('<!DOCTYPE')) {
                const htmlStart = retryError.message.substring(0, 200);
                console.warn('HTML error detected in response:', htmlStart);
                
                // Check for specific error signatures
                if (retryError.message.includes('401') || 
                    retryError.message.includes('unauthorized') || 
                    retryError.message.includes('authentication')) {
                  console.error('AUTHENTICATION ERROR: Check your Pinecone API key');
                }
              }
            }
            
            if (retries < maxRetries) {
              // Fixed delay of 500ms instead of exponential backoff
              const delay = 500;
              console.log(`Waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        if (!success) {
          throw new Error(`Failed to upsert batch after ${maxRetries} retries`);
        }
      } catch (batchError) {
        console.error(`Error upserting batch ${Math.floor(i/batchSize) + 1}:`, batchError);
        
        // Try upserting one by one as a fallback with additional retry logic
        console.log("Trying to upsert vectors one by one...");
        for (const vector of batch) {
          try {
            let individualRetries = 0;
            const maxIndividualRetries = 2;
            
            while (individualRetries < maxIndividualRetries) {
              try {
                await index.upsert([vector]);
                break; // Success, exit retry loop
              } catch (singleRetryError) {
                individualRetries++;
                console.warn(`Individual vector retry ${individualRetries}/${maxIndividualRetries} failed:`, singleRetryError);
                
                if (individualRetries >= maxIndividualRetries) {
                  console.error(`Failed to upsert vector ${vector.id} after ${maxIndividualRetries} retries`);
                } else {
                  // Wait before retry
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
            }
          } catch (singleError) {
            console.error(`Failed to upsert vector ${vector.id}:`, singleError);
          }
        }
      }
      
      // Reduced delay from 500ms to 100ms for better performance
      // Only add delay if there are more batches
      if (i + batchSize < vectors.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Completed upserting vectors to Pinecone`);
    return true;
  } catch (error) {
    console.error('Error in upsertVectors:', error);
    
    // Provide more detailed error information
    if (error instanceof Error) {
      if (error.message.includes('<!DOCTYPE')) {
        console.error('Received HTML response instead of JSON. This typically indicates:');
        console.error('1. Authentication failure (check your API key)');
        console.error('2. Network proxy interference');
        console.error('3. Service endpoint issues');
        
        // Extract status code if present in HTML
        const statusMatch = error.message.match(/<title>(\d+)[^<]*<\/title>/);
        if (statusMatch && statusMatch[1]) {
          console.error(`Status code found in HTML: ${statusMatch[1]}`);
        }
      }
    }
    
    throw new Error(`Failed to upsert vectors: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Rest of the functions remain the same...

export async function queryVectors(
  queryVector: number[],
  chatbotId: string,
  topK: number = 5
) {
  if (!index) {
    console.error('Pinecone client not initialized. Check your API key and environment variables.');
    return [];
  }

  try {
    const results = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter: {
        chatbotId: { $eq: chatbotId }
      }
    });
    
    return results.matches;
  } catch (error) {
    console.error('Error querying vectors:', error);
    return []; // Return empty array instead of throwing
  }
}

export async function deleteDocumentVectors(documentId: string) {
  if (!index) {
    console.error('Pinecone client not initialized. Check your API key and environment variables.');
    return;
  }

  try {
    await index.deleteMany({
      filter: {
        documentId: { $eq: documentId }
      }
    });
    console.log(`Successfully deleted vectors for document ${documentId}`);
  } catch (error) {
    console.error('Error deleting vectors:', error);
    throw new Error('Failed to delete vectors');
  }
}

export async function deleteChatbotVectors(chatbotId: string) {
  if (!index) {
    console.error('Pinecone client not initialized. Check your API key and environment variables.');
    return;
  }

  try {
    await index.deleteMany({
      filter: {
        chatbotId: { $eq: chatbotId }
      }
    });
    console.log(`Successfully deleted all vectors for chatbot ${chatbotId}`);
  } catch (error) {
    console.error('Error deleting chatbot vectors:', error);
    throw new Error('Failed to delete chatbot vectors');
  }
}