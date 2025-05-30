-- Debug assessment creation issues

-- 1. Check if there are any assessments at all
SELECT COUNT(*) as total_assessments FROM student_assessments;

-- 2. Check recent chat messages that should trigger assessments
SELECT 
    cm.message_id,
    cm.room_id,
    cm.user_id,
    cm.role,
    cm.created_at,
    cm.metadata,
    SUBSTRING(cm.content, 1, 50) as content_preview
FROM chat_messages cm
WHERE cm.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY cm.created_at DESC
LIMIT 20;

-- 3. Check if there are any assessment chatbots
SELECT 
    c.chatbot_id,
    c.name,
    c.bot_type,
    c.teacher_id,
    c.assessment_criteria_text IS NOT NULL as has_criteria
FROM chatbots c
WHERE c.bot_type = 'assessment';

-- 4. Check room-chatbot associations for assessment bots
SELECT 
    rc.room_id,
    rc.chatbot_id,
    r.room_name,
    c.name as chatbot_name,
    c.bot_type
FROM room_chatbots rc
JOIN rooms r ON rc.room_id = r.room_id
JOIN chatbots c ON rc.chatbot_id = c.chatbot_id
WHERE c.bot_type = 'assessment';

-- 5. Check for any errors in the database logs (if accessible)
-- This would need to be run by a database admin

-- 6. Check foreign key constraints on student_assessments
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'student_assessments'
    AND tc.constraint_type = 'FOREIGN KEY';

-- 7. Check if student_id and teacher_id exist in auth.users
SELECT 
    'auth.users' as table_name,
    COUNT(*) as user_count
FROM auth.users
UNION ALL
SELECT 
    'student_profiles' as table_name,
    COUNT(*) as user_count
FROM student_profiles
UNION ALL
SELECT 
    'teacher_profiles' as table_name,
    COUNT(*) as user_count
FROM teacher_profiles;

-- 8. Check for any recent assessment attempts by looking at metadata
SELECT 
    cm.message_id,
    cm.room_id,
    cm.user_id,
    cm.created_at,
    cm.metadata->>'chatbotId' as chatbot_id,
    cm.metadata->>'isAssessmentFeedback' as is_assessment_feedback,
    cm.metadata->>'assessmentId' as assessment_id
FROM chat_messages cm
WHERE cm.metadata IS NOT NULL
    AND cm.metadata->>'isAssessmentFeedback' = 'true'
    AND cm.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY cm.created_at DESC;