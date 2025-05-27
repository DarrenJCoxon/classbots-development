-- =====================================================
-- ADD ONLY THE MISSING INDEXES
-- =====================================================
-- Based on analysis, you already have most indexes!
-- Just need these for document processing performance

-- 1. For finding documents by chatbot (used in knowledge base page)
CREATE INDEX IF NOT EXISTS idx_documents_chatbot_id 
ON documents(chatbot_id);

-- 2. For finding documents by chatbot and status (used in processing)
CREATE INDEX IF NOT EXISTS idx_documents_chatbot_status 
ON documents(chatbot_id, status);

-- 3. For finding all chunks of a document
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id 
ON document_chunks(document_id);

-- 4. For processing chunks by status
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_status 
ON document_chunks(document_id, status);

-- Verify they were created
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('documents', 'document_chunks')
ORDER BY tablename, indexname;