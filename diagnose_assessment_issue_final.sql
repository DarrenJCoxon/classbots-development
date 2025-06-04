-- Diagnostic queries to identify the assessment storage issue

-- 1. Check for orphaned room_chatbots (associations pointing to non-existent chatbots)
SELECT 
    rc.room_id,
    rc.chatbot_id,
    r.room_name,
    c.chatbot_id as chatbot_exists
FROM 
    room_chatbots rc
    LEFT JOIN rooms r ON rc.room_id = r.room_id
    LEFT JOIN chatbots c ON rc.chatbot_id = c.chatbot_id
WHERE 
    c.chatbot_id IS NULL;

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
    COUNT(rc.room_id) as active_room_count
FROM 
    chatbots c
    LEFT JOIN room_chatbots rc ON c.chatbot_id = rc.chatbot_id
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

-- 4. Check for any recent failed assessment attempts in chat_messages
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
ORDER BY 
    cm.created_at DESC
LIMIT 20;

-- 5. Check if there are any assessments that reference non-existent chatbots
SELECT 
    sa.assessment_id,
    sa.student_id,
    sa.chatbot_id,
    sa.created_at,
    c.chatbot_id as chatbot_exists
FROM 
    student_assessments sa
    LEFT JOIN chatbots c ON sa.chatbot_id = c.chatbot_id
WHERE 
    c.chatbot_id IS NULL;

-- 6. Summary report
SELECT 'Orphaned room chatbot associations' as issue, COUNT(*) as count
FROM room_chatbots rc
WHERE NOT EXISTS (SELECT 1 FROM chatbots c WHERE c.chatbot_id = rc.chatbot_id)

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
AND is_active = true

UNION ALL

SELECT 'Total rows in student_assessments' as issue, COUNT(*) as count
FROM student_assessments;

-- 7. CLEANUP COMMANDS (uncomment to run after reviewing the results above)
-- Delete orphaned room_chatbots entries
-- DELETE FROM room_chatbots
-- WHERE chatbot_id NOT IN (SELECT chatbot_id FROM chatbots);

-- Delete orphaned student instances
-- DELETE FROM student_chatbot_instances
-- WHERE chatbot_id NOT IN (SELECT chatbot_id FROM chatbots);