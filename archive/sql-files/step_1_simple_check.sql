-- =====================================================
-- STEP 1 SIMPLE: BASIC CHECKS (Version Independent)
-- =====================================================

-- 1. Check existing indexes (this should always work)
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'chat_messages',
    'room_memberships',
    'documents',
    'document_chunks',
    'student_chatbot_instances',
    'rooms',
    'chatbots'
)
ORDER BY tablename, indexname;

-- 2. Count rows in critical tables
SELECT 'chat_messages' as table_name, COUNT(*) as row_count FROM chat_messages
UNION ALL
SELECT 'room_memberships', COUNT(*) FROM room_memberships
UNION ALL
SELECT 'documents', COUNT(*) FROM documents
UNION ALL
SELECT 'document_chunks', COUNT(*) FROM document_chunks
UNION ALL
SELECT 'student_chatbot_instances', COUNT(*) FROM student_chatbot_instances
UNION ALL
SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'chatbots', COUNT(*) FROM chatbots
ORDER BY row_count DESC;

-- 3. Check primary keys (these are automatically indexed)
SELECT 
    tc.table_name,
    tc.constraint_name,
    STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as key_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
AND tc.constraint_type = 'PRIMARY KEY'
AND tc.table_name IN (
    'chat_messages',
    'room_memberships',
    'documents',
    'document_chunks',
    'student_chatbot_instances',
    'rooms',
    'chatbots'
)
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- 4. Sample query to test current performance
-- Replace 'test-room-id' with an actual room_id from your database
EXPLAIN (ANALYZE, BUFFERS)
SELECT message_id, content, created_at, user_id 
FROM chat_messages 
WHERE room_id = 'test-room-id'  -- CHANGE THIS to a real room_id
ORDER BY created_at DESC 
LIMIT 50;