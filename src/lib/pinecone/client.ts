// src/lib/pinecone/client.ts
import { Pinecone } from '@pinecone-database/pinecone';

// More robust way to check environment variables
const getPineconeConfig = () => {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME || 'classbots-knowledge';
  
  if (!apiKey) {
    console.error('PINECONE_API_KEY is not defined in environment variables');
  }
  
  console.log("Pinecone Configuration:");
  console.log(`- API Key exists: ${!!apiKey}`);
  console.log(`- Index Name: ${indexName}`);
  
  return { apiKey, indexName };
};

// Create client with proper error handling
let pineconeClient: Pinecone | null = null;
let indexClient: ReturnType<Pinecone['index']> | null = null;

try {
  const { apiKey, indexName } = getPineconeConfig();
  
  if (apiKey) {
    pineconeClient = new Pinecone({
      apiKey,
    });
    
    // Get the index for our embeddings
    indexClient = pineconeClient.index(indexName);
    console.log("Pinecone client initialized successfully");
  } else {
    console.error("Failed to initialize Pinecone client: Missing API key");
  }
} catch (error) {
  console.error("Error initializing Pinecone client:", error);
}

export const pinecone = pineconeClient;
export const index = indexClient;