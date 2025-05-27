-- =====================================================
-- STEP 2: CREATE THE MOST CRITICAL INDEX
-- =====================================================
-- This is THE most important index for chat performance
-- It affects every single chat message load

-- First, let's analyze the query pattern
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM chat_messages 
WHERE room_id = 'any_room_id_here' 
ORDER BY created_at DESC 
LIMIT 50;

-- Create the index (will take longer on large tables)
-- CONCURRENTLY means users can still use the table while index builds
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_room_created
ON chat_messages(room_id, created_at DESC);

-- Verify the index was created
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'chat_messages'
AND indexname = 'idx_chat_messages_room_created';

-- Test the performance improvement
-- Run the same query again and compare the execution time
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM chat_messages 
WHERE room_id = 'any_room_id_here' 
ORDER BY created_at DESC 
LIMIT 50;

-- Check if the index is being used
SELECT 
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_chat_messages_room_created';