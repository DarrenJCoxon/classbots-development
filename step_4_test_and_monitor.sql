-- =====================================================
-- STEP 4: TEST AND MONITOR
-- =====================================================
-- Run these queries after creating each index to verify improvement

-- 1. Check index usage (run this after the app has been used for a bit)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    idx_tup_read as rows_read_via_index,
    idx_tup_fetch as rows_fetched_via_index
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- 2. Check for unused indexes (after a day of usage)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan = 0
AND indexname LIKE 'idx_%';

-- 3. Monitor table bloat after index creation
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size('public.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size('public.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('chat_messages', 'room_memberships')
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- 4. Analyze tables after index creation (important!)
ANALYZE chat_messages;
ANALYZE room_memberships;

-- 5. Check for slow queries on these tables
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    min_time,
    max_time
FROM pg_stat_statements
WHERE (query LIKE '%chat_messages%' OR query LIKE '%room_memberships%')
AND query NOT LIKE '%pg_stat%'
ORDER BY mean_time DESC
LIMIT 20;