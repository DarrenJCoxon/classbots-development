-- =====================================================
-- STEP 0: CHECK SYSTEM TABLE SCHEMAS
-- =====================================================
-- Run this first to understand what columns are available
-- in your PostgreSQL version

-- 1. Check pg_indexes columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'pg_catalog' 
AND table_name = 'pg_indexes'
ORDER BY ordinal_position;

-- 2. Check pg_stat_user_tables columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'pg_catalog' 
AND table_name = 'pg_stat_user_tables'
ORDER BY ordinal_position;

-- 3. Check if pg_stat_statements exists
SELECT EXISTS (
    SELECT 1 
    FROM pg_extension 
    WHERE extname = 'pg_stat_statements'
) as pg_stat_statements_installed;

-- 4. If pg_stat_statements exists, check its columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'pg_stat_statements'
ORDER BY ordinal_position;

-- 5. Simple version info
SELECT version();

-- 6. List all tables in public schema (to verify table names)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name IN (
    'chat_messages',
    'room_memberships', 
    'documents',
    'document_chunks',
    'student_chatbot_instances',
    'rooms',
    'chatbots'
)
ORDER BY table_name;