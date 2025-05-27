-- Check if any assessments exist
SELECT COUNT(*) as assessment_count FROM student_assessments;

-- Check recent assessment attempts (last 30 minutes)
SELECT 
    sa.assessment_id,
    sa.student_id,
    sa.teacher_id,
    sa.room_id,
    sa.chatbot_id,
    sa.assessed_at,
    sa.student_input_tokens,
    sa.assistant_output_tokens
FROM student_assessments sa
WHERE sa.assessed_at >= NOW() - INTERVAL '30 minutes'
ORDER BY sa.assessed_at DESC
LIMIT 5;

-- Check if there are any recent chat messages that should have triggered assessments
SELECT 
    cm.message_id,
    cm.room_id,
    cm.student_id,
    cm.created_at,
    cm.role,
    SUBSTRING(cm.content, 1, 50) as content_preview
FROM chat_messages cm
WHERE cm.created_at >= NOW() - INTERVAL '30 minutes'
    AND cm.role = 'assistant'
ORDER BY cm.created_at DESC
LIMIT 10;
EOF < /dev/null