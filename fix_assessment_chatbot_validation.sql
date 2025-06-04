-- Diagnostic queries to identify the assessment storage issue

-- 1. Check for orphaned room_chatbot_associations (associations pointing to non-existent chatbots)
SELECT 
    rca.room_id,
    rca.chatbot_id,
    rca.is_active,
    r.room_name,
    c.chatbot_id as chatbot_exists
FROM 
    room_chatbot_associations rca
    LEFT JOIN rooms r ON rca.room_id = r.room_id
    LEFT JOIN chatbots c ON rca.chatbot_id = c.chatbot_id
WHERE 
    c.chatbot_id IS NULL
    AND rca.is_active = true;

-- 2. Check for assessment bots that might be causing issues
SELECT 
    c.chatbot_id,
    c.name,
    c.bot_type,
    c.teacher_id,
    c.is_active,
    CASE 
        WHEN c.assessment_criteria_text IS NULL THEN 'NO CRITERIA'
        WHEN LENGTH(c.assessment_criteria_text) = 0 THEN 'EMPTY CRITERIA'
        ELSE 'HAS CRITERIA (' || LENGTH(c.assessment_criteria_text) || ' chars)'
    END as criteria_status,
    COUNT(rca.room_id) as active_room_count
FROM 
    chatbots c
    LEFT JOIN room_chatbot_associations rca ON c.chatbot_id = rca.chatbot_id AND rca.is_active = true
WHERE 
    c.bot_type = 'assessment'
GROUP BY 
    c.chatbot_id, c.name, c.bot_type, c.teacher_id, c.is_active, c.assessment_criteria_text
ORDER BY 
    c.created_at DESC;

-- 3. Check student_chatbot_instances for potential mismatches
SELECT 
    sci.instance_id,
    sci.student_id,
    sci.chatbot_id,
    sci.room_id,
    c.chatbot_id as chatbot_exists,
    c.name as chatbot_name,
    c.bot_type
FROM 
    student_chatbot_instances sci
    LEFT JOIN chatbots c ON sci.chatbot_id = c.chatbot_id
WHERE 
    c.chatbot_id IS NULL;

-- 4. Fix orphaned associations by deactivating them
UPDATE room_chatbot_associations
SET is_active = false
WHERE chatbot_id NOT IN (SELECT chatbot_id FROM chatbots)
AND is_active = true;

-- 5. Fix orphaned student instances by removing them
DELETE FROM student_chatbot_instances
WHERE chatbot_id NOT IN (SELECT chatbot_id FROM chatbots);

-- 6. Add a foreign key constraint if it doesn't exist to prevent future orphans
-- First check if the constraint exists
SELECT 
    conname
FROM 
    pg_constraint
WHERE 
    conname = 'room_chatbot_associations_chatbot_id_fkey';

-- If it doesn't exist, add it (uncomment to run)
-- ALTER TABLE room_chatbot_associations
-- ADD CONSTRAINT room_chatbot_associations_chatbot_id_fkey
-- FOREIGN KEY (chatbot_id) REFERENCES chatbots(chatbot_id) ON DELETE CASCADE;

-- 7. Check for any recent failed assessment attempts in chat_messages
SELECT 
    cm.created_at,
    cm.room_id,
    cm.user_id,
    cm.content,
    cm.metadata->>'chatbotId' as metadata_chatbot_id,
    cm.metadata->>'error' as error,
    c.chatbot_id as chatbot_exists
FROM 
    chat_messages cm
    LEFT JOIN chatbots c ON (cm.metadata->>'chatbotId')::uuid = c.chatbot_id
WHERE 
    cm.metadata->>'isAssessmentFeedback' = 'true'
    AND cm.created_at > NOW() - INTERVAL '7 days'
    AND c.chatbot_id IS NULL
ORDER BY 
    cm.created_at DESC
LIMIT 20;

-- 8. Summary report
SELECT 'Orphaned room associations' as issue, COUNT(*) as count
FROM room_chatbot_associations rca
WHERE NOT EXISTS (SELECT 1 FROM chatbots c WHERE c.chatbot_id = rca.chatbot_id)
AND rca.is_active = true

UNION ALL

SELECT 'Orphaned student instances' as issue, COUNT(*) as count
FROM student_chatbot_instances sci
WHERE NOT EXISTS (SELECT 1 FROM chatbots c WHERE c.chatbot_id = sci.chatbot_id)

UNION ALL

SELECT 'Assessment bots without criteria' as issue, COUNT(*) as count
FROM chatbots
WHERE bot_type = 'assessment' 
AND (assessment_criteria_text IS NULL OR assessment_criteria_text = '')

UNION ALL

SELECT 'Total active assessment bots' as issue, COUNT(*) as count
FROM chatbots
WHERE bot_type = 'assessment' 
AND is_active = true;