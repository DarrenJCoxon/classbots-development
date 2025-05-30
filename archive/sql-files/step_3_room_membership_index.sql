-- =====================================================
-- STEP 3: ROOM MEMBERSHIP INDEX
-- =====================================================
-- This index is critical for authorization checks
-- Every API call checks if a user belongs to a room

-- First, analyze current performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM room_memberships
WHERE room_id = 'any_room_id'
AND student_id = 'any_student_id'
AND is_active = true;

-- Create the index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_memberships_room_student
ON room_memberships(room_id, student_id);

-- Also create an index for finding all active rooms for a student
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_memberships_student_active
ON room_memberships(student_id, is_active)
WHERE is_active = true;

-- Verify indexes were created
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'room_memberships'
AND indexname LIKE 'idx_room_memberships%';

-- Test the performance improvement
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM room_memberships
WHERE room_id = 'any_room_id'
AND student_id = 'any_student_id'
AND is_active = true;

-- Test finding all rooms for a student
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM room_memberships
WHERE student_id = 'any_student_id'
AND is_active = true;