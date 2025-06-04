-- Check messages in the room before the /assess command
-- This will show if there are actually messages to assess

SELECT 
    cm.created_at,
    cm.message_id,
    cm.user_id,
    cm.role,
    SUBSTRING(cm.content, 1, 100) as content_preview,
    cm.metadata->>'chatbotId' as chatbot_id
FROM 
    chat_messages cm
WHERE 
    cm.room_id = '9118ebba-6d95-4d94-9547-25575ebab39c'
    AND cm.user_id IN ('9b768cfe-b87b-4576-b16f-843287278188', '9b768cfe-b87b-4576-b16f-843287278188') -- student and bot
    AND cm.created_at >= '2025-06-04 14:00:00'::timestamp
    AND cm.created_at <= '2025-06-04 15:25:00'::timestamp
ORDER BY 
    cm.created_at DESC
LIMIT 50;