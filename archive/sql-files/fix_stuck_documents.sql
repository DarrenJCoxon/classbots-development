-- Check for documents stuck in processing state

-- 1. Find all documents in processing state
SELECT 
    document_id,
    chatbot_id,
    file_name,
    status,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_update
FROM documents
WHERE status = 'processing'
ORDER BY updated_at DESC;

-- 2. Find documents that have been processing for more than 10 minutes
-- These are likely stuck
SELECT 
    document_id,
    chatbot_id,
    file_name,
    status,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_update
FROM documents
WHERE status = 'processing'
    AND updated_at < NOW() - INTERVAL '10 minutes';

-- 3. Reset stuck documents to 'pending' status so they can be reprocessed
UPDATE documents
SET 
    status = 'pending',
    updated_at = NOW()
WHERE status = 'processing'
    AND updated_at < NOW() - INTERVAL '10 minutes'
RETURNING document_id, file_name, chatbot_id;

-- 4. Alternative: If you want to mark them as failed instead
-- UPDATE documents
-- SET 
--     status = 'error',
--     error_message = 'Processing timeout - document was stuck',
--     updated_at = NOW()
-- WHERE status = 'processing'
--     AND updated_at < NOW() - INTERVAL '10 minutes'
-- RETURNING document_id, file_name, chatbot_id;

-- 5. Check the current status of all documents for a specific chatbot
-- Replace 'YOUR_CHATBOT_ID' with the actual chatbot ID
-- SELECT 
--     document_id,
--     file_name,
--     status,
--     created_at,
--     updated_at,
--     error_message
-- FROM documents
-- WHERE chatbot_id = 'YOUR_CHATBOT_ID'
-- ORDER BY created_at DESC;