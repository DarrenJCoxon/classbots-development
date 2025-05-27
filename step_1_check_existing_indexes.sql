-- =====================================================
-- STEP 1: CHECK EXISTING INDEXES
-- =====================================================
-- Run this first to see what indexes already exist
-- This helps us understand the current state

-- 1. Check all existing indexes
SELECT 
    schemaname,
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

-- 2. Check table sizes (to understand impact)
SELECT 
    relname as tablename,
    pg_size_pretty(pg_total_relation_size('public.'||relname)) as total_size,
    n_live_tup as approximate_row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND relname IN (
    'chat_messages',
    'room_memberships',
    'documents',
    'document_chunks',
    'student_chatbot_instances',
    'rooms',
    'chatbots'
)
ORDER BY pg_total_relation_size('public.'||relname) DESC;

-- 3. Check current slow queries (if pg_stat_statements is enabled)
-- This might not work if the extension isn't installed
SELECT 
    calls,
    total_time,
    mean_time,
    query
FROM pg_stat_statements
WHERE query LIKE '%chat_messages%'
   OR query LIKE '%room_memberships%'
ORDER BY mean_time DESC
LIMIT 10;