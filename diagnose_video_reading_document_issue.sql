-- Diagnostic SQL to identify why video reading documents are causing 500 errors
-- Run this in Supabase SQL Editor

-- 1. Check if there are any viewing room bots with video documents
SELECT 
    c.chatbot_id,
    c.name AS chatbot_name,
    c.bot_type,
    rd.id AS reading_doc_id,
    rd.content_type,
    rd.file_name,
    rd.video_url,
    rd.video_platform,
    rd.video_id,
    rd.created_at
FROM 
    public.chatbots c
LEFT JOIN 
    public.reading_documents rd ON c.chatbot_id = rd.chatbot_id
WHERE 
    c.bot_type = 'viewing_room'
ORDER BY 
    c.created_at DESC;

-- 2. Check if there are any reading documents with content_type = 'video'
SELECT 
    id,
    chatbot_id,
    content_type,
    file_name,
    video_url,
    video_platform,
    video_id,
    CASE 
        WHEN video_metadata IS NULL THEN 'NULL'
        ELSE jsonb_pretty(video_metadata)
    END AS video_metadata_formatted,
    created_at
FROM 
    public.reading_documents
WHERE 
    content_type = 'video'
    OR video_url IS NOT NULL
ORDER BY 
    created_at DESC;

-- 3. Check constraints on the table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'public.reading_documents'::regclass
ORDER BY conname;

-- 4. Check for any reading documents that might violate constraints
SELECT 
    id,
    chatbot_id,
    content_type,
    file_path,
    video_url,
    CASE 
        WHEN content_type = 'pdf' AND file_path IS NULL THEN 'ERROR: PDF without file_path'
        WHEN content_type = 'video' AND video_url IS NULL THEN 'ERROR: Video without video_url'
        ELSE 'OK'
    END AS constraint_check
FROM 
    public.reading_documents
WHERE 
    (content_type = 'pdf' AND file_path IS NULL)
    OR (content_type = 'video' AND video_url IS NULL);

-- 5. Test a specific chatbot (replace with actual viewing room chatbot_id if you have one)
-- This simulates what the API is trying to do
SELECT 
    *
FROM 
    public.reading_documents
WHERE 
    chatbot_id = '2f0b34d5-2011-4885-8f3e-ad591ef0e375'  -- Replace with actual viewing room bot ID
LIMIT 1;