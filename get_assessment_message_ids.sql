-- Get the exact message IDs that should be included in the assessment
-- Based on the code, it should get messages with the chatbot_id in metadata

SELECT 
    cm.message_id,
    cm.created_at,
    cm.role,
    cm.user_id,
    SUBSTRING(cm.content, 1, 50) as content_preview,
    cm.metadata->>'chatbotId' as metadata_chatbot_id
FROM 
    chat_messages cm
WHERE 
    cm.room_id = '9118ebba-6d95-4d94-9547-25575ebab39c'
    AND cm.user_id = '9b768cfe-b87b-4576-b16f-843287278188'
    AND cm.metadata->>'chatbotId' = 'a93eecf1-0289-4bdd-9986-e8d148c616bc'
    AND cm.created_at < '2025-06-04 15:16:44.902455+00'::timestamp -- Before first /assess
ORDER BY 
    cm.created_at DESC
LIMIT 20;

-- Also check how the metadata is stored
SELECT 
    message_id,
    metadata,
    jsonb_pretty(metadata) as metadata_pretty
FROM chat_messages
WHERE message_id = '8a8274fd-75cc-4143-887b-57d2eb94ca30'; -- One of the user messages