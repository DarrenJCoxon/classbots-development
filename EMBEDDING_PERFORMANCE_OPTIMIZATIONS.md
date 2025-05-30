# Embedding Performance Optimizations

## Changes Made

### 1. Increased Batch Sizes
- **OpenAI Embeddings**: Increased from 20 to 100 per batch
  - OpenAI supports up to 2048 embeddings per request
  - This reduces the number of API calls by 80%
- **Pinecone Uploads**: Increased from 25 to 100 vectors per batch
  - Pinecone can handle up to 100 vectors per upsert
  - This reduces the number of Pinecone API calls by 75%

### 2. Reduced Artificial Delays
- **OpenAI Batch Delay**: Reduced from 500ms to 100ms between batches
- **Pinecone Batch Delay**: Reduced from 500ms to 100ms between batches
- **Only add delays when necessary**: No delay after the last batch

### 3. Optimized Retry Logic
- **Max Retries**: Reduced from 3 to 2 for faster failure detection
- **Retry Delay**: Changed from exponential backoff (1s, 2s, 4s) to fixed 500ms
- This can save up to 6 seconds per failed batch

## Expected Performance Improvements

For a typical document with 100 chunks:
- **Before**: ~11-15 seconds (including artificial delays)
- **After**: ~3-5 seconds (80% improvement)

## Additional Optimizations Available

### 1. Batch Database Operations (processor-optimized.ts)
Created an optimized version that:
- Batch inserts all chunks at once
- Batch updates all chunk statuses at once
- Processes embeddings and uploads in a streaming fashion

### 2. Parallel Document Processing
The optimized processor includes a helper function to process multiple documents in parallel:
```typescript
processDocumentsInParallel(documents, maxConcurrent = 3)
```

### 3. Consider Switching to Larger Embedding Model
If you need better quality embeddings and have the budget:
- `text-embedding-3-large` provides better quality
- Same API, just change the model name

### 4. Implement Progress Tracking
Instead of polling every 5 seconds:
- Use WebSockets or Server-Sent Events
- Provide real-time progress updates
- Show per-chunk progress, not just document level

### 5. Add Caching
- Cache extracted text for documents that are re-processed
- Cache embeddings for common text chunks
- Use Redis or similar for fast lookups

### 6. Queue System for Production
For true scalability:
- Use BullMQ, AWS SQS, or similar
- Process documents asynchronously
- Enable horizontal scaling
- Better error recovery

## How to Use the Optimized Processor

1. Import the optimized processor:
```typescript
import { processDocumentOptimized } from '@/lib/document-processing/processor-optimized';
```

2. Use it instead of the regular processor:
```typescript
await processDocumentOptimized(documentId, chatbotId, content, contentType);
```

3. For multiple documents:
```typescript
await processDocumentsInParallel(documents, 3); // Process 3 at a time
```

## Monitoring Performance

Add these logs to track performance:
```typescript
const startTime = Date.now();
// ... processing ...
const duration = Date.now() - startTime;
console.log(`Document processed in ${duration}ms`);
```

## Rate Limits to Consider

### OpenAI Embeddings
- Rate limit: 3,000 RPM (requests per minute)
- Token limit: 1,000,000 TPM (tokens per minute)
- With 100 embeddings per batch, you can process 300,000 embeddings per minute

### Pinecone
- Write throughput: Varies by plan
- Free tier: Limited to 100 vectors/second
- Paid tiers: Much higher limits

With these optimizations, the embedding process should be 60-80% faster for most documents.