-- =====================================================
-- STEP 2: CREATE COMPOSITE INDEX FOR CHAT MESSAGES
-- =====================================================
-- IMPORTANT: Run each section separately!

-- SECTION A: First check if the index already exists
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'chat_messages'
AND schemaname = 'public'
ORDER BY indexname;

-- SECTION B: Analyze current performance (use a real room_id)
-- Find a room with messages first:
SELECT room_id, COUNT(*) as message_count 
FROM chat_messages 
GROUP BY room_id 
ORDER BY message_count DESC 
LIMIT 5;

-- Then use one of those room_ids here:
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM chat_messages 
WHERE room_id = 'REPLACE_WITH_REAL_ROOM_ID' 
ORDER BY created_at DESC 
LIMIT 50;

-- SECTION C: Create the index
-- ⚠️ IMPORTANT: This must be run OUTSIDE of a transaction!
-- If using pgAdmin/DBeaver: disable auto-commit or run in a new query window
-- If using psql: make sure you're not in a transaction (no BEGIN statement)

-- Option 1: Try with CONCURRENTLY (preferred - doesn't lock table)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_room_created
ON chat_messages(room_id, created_at DESC);

-- Option 2: If CONCURRENTLY fails, use regular CREATE INDEX
-- This will lock the table briefly but works in transactions
-- CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
-- ON chat_messages(room_id, created_at DESC);

-- SECTION D: Verify the index was created
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'chat_messages'
AND indexname = 'idx_chat_messages_room_created';

-- SECTION E: Test performance improvement (use same room_id as before)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM chat_messages 
WHERE room_id = 'REPLACE_WITH_REAL_ROOM_ID' 
ORDER BY created_at DESC 
LIMIT 50;

-- You should see:
-- - "Index Scan using idx_chat_messages_room_created" (using new index)
-- - No "Sort" step needed (index provides the order)
-- - Faster execution time

-- SECTION F: Drop the old single-column index if new one works
-- Only do this after confirming the new index is being used!
-- DROP INDEX IF EXISTS idx_chat_messages_room_id;