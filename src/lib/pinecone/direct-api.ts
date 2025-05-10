// src/lib/pinecone/direct-api.ts
/**
 * This file implements direct fetch-based API calls to Pinecone
 * to bypass any issues with the Pinecone SDK
 */

// Use node-fetch for compatibility
import fetch from 'node-fetch';

interface PineconeVector {
  id: string;
  values: number[];
  metadata?: Record<string, unknown>;
}

interface PineconeResponse {
  status: number;
  statusText: string;
  data?: unknown;
  error?: string;
}

// Add specific interface for query response
interface PineconeQueryResponse extends PineconeResponse {
  data?: {
    matches?: Array<{
      id: string;
      score: number;
      metadata: Record<string, unknown>;
    }>;
  };
}

/**
 * Make a direct API call to Pinecone with detailed logging
 */
async function callPineconeAPI(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: unknown
): Promise<PineconeResponse> {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME || 'classbots-knowledge';
  
  if (!apiKey) {
    console.error('PINECONE_API_KEY is missing');
    return {
      status: 401,
      statusText: 'Unauthorized',
      error: 'API key is missing'
    };
  }
  
  const url = `https://api.pinecone.io/v1/indexes/${indexName}${endpoint}`;
  
  console.log(`Making ${method} request to Pinecone: ${url}`);
  
  try {
    // Make the API call with fetch
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    console.log(`Pinecone API response status: ${response.status} ${response.statusText}`);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return {
        status: response.status,
        statusText: response.statusText,
        data
      };
    } else {
      // Handle HTML or other non-JSON responses
      const text = await response.text();
      console.error('Received non-JSON response from Pinecone:');
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error(`Content-Type: ${contentType}`);
      console.error(`Response (first 200 chars): ${text.substring(0, 200)}`);
      
      if (text.includes('<!DOCTYPE')) {
        // Parse out any error message from HTML
        const titleMatch = text.match(/<title>([^<]+)<\/title>/);
        const messageMatch = text.match(/<p>([^<]+)<\/p>/);
        
        const errorTitle = titleMatch ? titleMatch[1] : 'Unknown error';
        const errorMessage = messageMatch ? messageMatch[1] : text.substring(0, 100);
        
        return {
          status: response.status,
          statusText: response.statusText,
          error: `HTML response: ${errorTitle} - ${errorMessage}`
        };
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        error: `Non-JSON response: ${text.substring(0, 100)}`
      };
    }
  } catch (error) {
    console.error('Error making Pinecone API call:', error);
    return {
      status: 500,
      statusText: 'Internal Error',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Upsert vectors directly to Pinecone
 */
export async function directUpsertVectors(vectors: PineconeVector[]): Promise<boolean> {
  try {
    // Split vectors into smaller batches
    const batchSize = 20;
    let allSuccessful = true;
    
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      console.log(`Upserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(vectors.length/batchSize)}`);
      
      const result = await callPineconeAPI('/vectors/upsert', 'POST', {
        vectors: batch
      });
      
      if (result.status >= 400 || result.error) {
        console.error(`Error upserting batch: ${result.error || result.statusText}`);
        allSuccessful = false;
        
        // Try single vector upserts as fallback
        console.log('Attempting individual vector upserts as fallback...');
        
        for (const vector of batch) {
          const singleResult = await callPineconeAPI('/vectors/upsert', 'POST', {
            vectors: [vector]
          });
          
          if (singleResult.status >= 400 || singleResult.error) {
            console.error(`Failed to upsert vector ${vector.id}: ${singleResult.error || singleResult.statusText}`);
          } else {
            console.log(`Successfully upserted vector ${vector.id}`);
          }
        }
      } else {
        console.log(`Successfully upserted batch ${Math.floor(i/batchSize) + 1}`);
      }
      
      // Add a delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return allSuccessful;
  } catch (error) {
    console.error('Error in directUpsertVectors:', error);
    return false;
  }
}

/**
 * Query vectors directly from Pinecone
 */
export async function directQueryVectors(
  queryVector: number[],
  chatbotId: string,
  topK: number = 5
) {
  try {
    // Query vectors directly from Pinecone
    const result = await callPineconeAPI('/query', 'POST', {
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter: {
        chatbotId: { $eq: chatbotId }
      }
    }) as PineconeQueryResponse;
    
    if (result.status >= 400 || result.error) {
      console.error(`Error querying vectors: ${result.error || result.statusText}`);
      return [];
    }
    
    // Now TypeScript knows that result.data?.matches exists
    return result.data?.matches || [];
  } catch (error) {
    console.error('Error in directQueryVectors:', error);
    return [];
  }
}

/**
 * Delete vectors for a specific document directly from Pinecone
 */
export async function directDeleteDocumentVectors(documentId: string): Promise<boolean> {
  try {
    const result = await callPineconeAPI('/vectors/delete', 'POST', {
      filter: {
        documentId: { $eq: documentId }
      }
    });
    
    if (result.status >= 400 || result.error) {
      console.error(`Error deleting document vectors: ${result.error || result.statusText}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in directDeleteDocumentVectors:', error);
    return false;
  }
}

/**
 * Check Pinecone API connectivity and report detailed status
 */
export async function checkPineconeStatus(): Promise<{
  isConnected: boolean;
  details: string;
  stats?: unknown;
}> {
  try {
    const result = await callPineconeAPI('/describe_index_stats');
    
    if (result.status >= 400 || result.error) {
      return {
        isConnected: false,
        details: result.error || `API error: ${result.status} ${result.statusText}`
      };
    }
    
    return {
      isConnected: true,
      details: 'Successfully connected to Pinecone',
      stats: result.data
    };
  } catch (error) {
    return {
      isConnected: false,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}