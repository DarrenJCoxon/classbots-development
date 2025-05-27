-- =====================================================
-- CHECK ALL EXISTING INDEXES
-- =====================================================
-- Run this single query to see all indexes in your database

SELECT 
    tablename as table,
    indexname as index_name,
    indexdef as definition
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