-- =============================================
-- Performance Indexes for Scale Optimization
-- Created: 2025-05-21
-- Purpose: Add critical indexes for frequent lookups
-- =============================================

-- Most critical indexes for scaling based on API usage analysis

-- 1. Room lookups by code (very frequent for student joins)
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code) WHERE is_active = true;

-- 2. Room lookups by ID (frequent for all room operations)  
CREATE INDEX IF NOT EXISTS idx_rooms_room_id_active ON rooms(room_id) WHERE is_active = true;

-- 3. Room memberships by student (frequent for permission checks)
CREATE INDEX IF NOT EXISTS idx_room_memberships_student ON room_memberships(student_id, room_id);

-- 4. Room memberships by room (frequent for room operations)
CREATE INDEX IF NOT EXISTS idx_room_memberships_room ON room_memberships(room_id, student_id);

-- 5. Chat messages by room (frequent for message fetching)
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);

-- 6. Chat messages by user and room (frequent for user-specific operations)
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_room ON chat_messages(user_id, room_id, created_at DESC);

-- 7. Teacher room ownership lookups (frequent for teacher operations)
CREATE INDEX IF NOT EXISTS idx_rooms_teacher ON rooms(teacher_id) WHERE is_active = true;

-- 8. Profiles by user_id (frequent for user operations)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 9. Safety notifications by user (frequent for safety system)
CREATE INDEX IF NOT EXISTS idx_safety_notifications_user ON safety_notifications(user_id, created_at DESC) WHERE is_delivered = false;

-- 10. Student chatbot instances (frequent for chat operations)
CREATE INDEX IF NOT EXISTS idx_student_chatbot_instances_student_room ON student_chatbot_instances(student_id, room_id);

-- Add comments for monitoring
COMMENT ON INDEX idx_rooms_room_code IS 'Performance: Fast room lookup by code for student joins';
COMMENT ON INDEX idx_room_memberships_student IS 'Performance: Fast permission checks for students'; 
COMMENT ON INDEX idx_chat_messages_room_created IS 'Performance: Fast message history retrieval';
COMMENT ON INDEX idx_safety_notifications_user IS 'Performance: Fast safety notification delivery';

-- Analyze tables to update statistics after adding indexes
ANALYZE rooms;
ANALYZE room_memberships; 
ANALYZE chat_messages;
ANALYZE profiles;
ANALYZE safety_notifications;
ANALYZE student_chatbot_instances;