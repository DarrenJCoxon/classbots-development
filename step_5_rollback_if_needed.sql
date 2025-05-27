-- =====================================================
-- STEP 5: ROLLBACK SCRIPT (IF NEEDED)
-- =====================================================
-- Use this ONLY if something goes wrong

-- Drop indexes one by one (not all at once)
-- Uncomment the index you want to drop

-- DROP INDEX CONCURRENTLY IF EXISTS idx_chat_messages_room_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_room_memberships_room_student;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_room_memberships_student_active;

-- After dropping, vacuum the table to reclaim space
-- VACUUM ANALYZE chat_messages;
-- VACUUM ANALYZE room_memberships;