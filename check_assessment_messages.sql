-- Check for ANY assessment-related messages in the last 7 days
SELECT 
    cm.created_at,
    cm.room_id,
    cm.user_id,
    cm.role,
    SUBSTRING(cm.content, 1, 100) as content_preview,
    cm.metadata->>'chatbotId' as chatbot_id,
    cm.metadata->>'isAssessmentFeedback' as is_assessment_feedback,
    cm.metadata->>'error' as error,
    cm.metadata->>'assessmentId' as assessment_id
FROM 
    chat_messages cm
WHERE 
    (cm.metadata->>'isAssessmentFeedback' = 'true'
     OR cm.content = '/assess'
     OR cm.metadata->>'assessmentId' IS NOT NULL)
    AND cm.created_at > NOW() - INTERVAL '7 days'
ORDER BY 
    cm.created_at DESC
LIMIT 50;

-- Check if there are ANY records in student_assessments at all
SELECT COUNT(*) as total_assessments,
       MIN(assessed_at) as first_assessment,
       MAX(assessed_at) as last_assessment
FROM student_assessments;

-- Look for the 4 assessment bots and their details
SELECT 
    c.chatbot_id,
    c.name,
    c.teacher_id,
    CASE 
        WHEN c.assessment_criteria_text IS NULL THEN 'NO CRITERIA'
        WHEN LENGTH(c.assessment_criteria_text) = 0 THEN 'EMPTY CRITERIA'
        ELSE 'HAS CRITERIA (' || LENGTH(c.assessment_criteria_text) || ' chars)'
    END as criteria_status,
    COUNT(rc.room_id) as room_count,
    COUNT(sci.instance_id) as instance_count
FROM 
    chatbots c
    LEFT JOIN room_chatbots rc ON c.chatbot_id = rc.chatbot_id
    LEFT JOIN student_chatbot_instances sci ON c.chatbot_id = sci.chatbot_id
WHERE 
    c.bot_type = 'assessment'
GROUP BY 
    c.chatbot_id, c.name, c.teacher_id, c.assessment_criteria_text
ORDER BY 
    c.created_at DESC;