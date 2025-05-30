-- Quick script to check document processing status

-- 1. Show all documents and their current status
SELECT 
    d.document_id,
    d.chatbot_id,
    d.file_name,
    d.file_type,
    d.status,
    d.created_at,
    d.updated_at,
    d.error_message,
    c.name as chatbot_name,
    CASE 
        WHEN d.status = 'processing' THEN 
            CONCAT(ROUND(EXTRACT(EPOCH FROM (NOW() - d.updated_at))/60, 1), ' minutes')
        ELSE NULL
    END as processing_time
FROM documents d
LEFT JOIN chatbots c ON d.chatbot_id = c.chatbot_id
ORDER BY d.created_at DESC
LIMIT 20;

-- 2. Show only documents that are currently processing
SELECT 
    document_id,
    file_name,
    status,
    updated_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - updated_at))/60, 1) as minutes_processing
FROM documents
WHERE status = 'processing'
ORDER BY updated_at ASC;

-- 3. Count documents by status
SELECT 
    status,
    COUNT(*) as count
FROM documents
GROUP BY status
ORDER BY count DESC;