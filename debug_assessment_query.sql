-- Debug the exact query used in the chat route to find messages for assessment
-- The code uses: .eq('metadata->>chatbotId', chatbot_id)

-- First, let's see ALL messages in this conversation with their metadata
SELECT 
    cm.message_id,
    cm.created_at,
    cm.role,
    cm.user_id,
    SUBSTRING(cm.content, 1, 50) as content_preview,
    cm.metadata,
    cm.metadata->>'chatbotId' as extracted_chatbot_id,
    cm.metadata->'chatbotId' as json_chatbot_id
FROM 
    chat_messages cm
WHERE 
    cm.room_id = '9118ebba-6d95-4d94-9547-25575ebab39c'
    AND cm.created_at >= '2025-06-04 15:13:00'::timestamp
    AND cm.created_at < '2025-06-04 15:16:44.902455'::timestamp
ORDER BY 
    cm.created_at DESC;

-- Now test the exact condition used in the code
SELECT COUNT(*) as matching_messages
FROM chat_messages
WHERE 
    room_id = '9118ebba-6d95-4d94-9547-25575ebab39c'
    AND user_id = '9b768cfe-b87b-4576-b16f-843287278188'
    AND metadata->>'chatbotId' = 'a93eecf1-0289-4bdd-9986-e8d148c616bc'
    AND created_at < '2025-06-04 15:16:44.902455'::timestamp;

-- Check if there's an issue with how Supabase handles the metadata column
SELECT 
    COUNT(*) as total_messages,
    COUNT(metadata) as messages_with_metadata,
    COUNT(CASE WHEN metadata IS NOT NULL AND metadata != 'null'::jsonb THEN 1 END) as valid_metadata,
    COUNT(CASE WHEN metadata->>'chatbotId' IS NOT NULL THEN 1 END) as with_chatbot_id
FROM chat_messages
WHERE room_id = '9118ebba-6d95-4d94-9547-25575ebab39c';