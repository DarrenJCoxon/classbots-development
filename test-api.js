// test-api.js
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Load environment variables (if using dotenv)
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testAPIs() {
  console.log("=== Testing API Connections ===");
  
  // 1. Test OpenAI connection
  console.log("\nTesting OpenAI API...");
  console.log("API Key:", process.env.OPENAI_API_KEY ? "Exists (first 5 chars: " + process.env.OPENAI_API_KEY.substring(0, 5) + "...)" : "Missing");
  
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "Hello world",
      encoding_format: "float",
    });
    
    console.log("✅ OpenAI API working!");
    console.log("Embedding dimensions:", embeddingResponse.data[0].embedding.length);
  } catch (error) {
    console.log("❌ OpenAI API error:", error.message);
    if (error.message.includes("<!DOCTYPE")) {
      console.log("HTML Response detected - first 200 chars:", error.message.substring(0, 200));
    }
  }
  
  // 2. Test Pinecone connection
  console.log("\nTesting Pinecone API...");
  console.log("API Key:", process.env.PINECONE_API_KEY ? "Exists (first 5 chars: " + process.env.PINECONE_API_KEY.substring(0, 5) + "...)" : "Missing");
  console.log("Index Name:", process.env.PINECONE_INDEX_NAME);
  
  try {
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    const index = pc.index(process.env.PINECONE_INDEX_NAME);
    
    // Just fetch stats to test connection
    const stats = await index.describeIndexStats();
    
    console.log("✅ Pinecone API working!");
    console.log("Index stats:", stats);
  } catch (error) {
    console.log("❌ Pinecone API error:", error.message);
    if (error.message.includes("<!DOCTYPE")) {
      console.log("HTML Response detected - first 200 chars:", error.message.substring(0, 200));
    }
  }
}

// Run tests
testAPIs().catch(console.error);