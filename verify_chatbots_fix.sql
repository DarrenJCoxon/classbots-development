-- Better verification query that handles cross-schema references
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table_name,
    af.attname AS foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f'
AND c.conrelid = 'public.chatbots'::regclass;

-- Test if we can now insert a chatbot
-- First, get a valid teacher user_id
SELECT user_id, email 
FROM teacher_profiles 
LIMIT 1;

-- Test insert (don't actually run this in production)
-- INSERT INTO chatbots (name, system_prompt, teacher_id, model, max_tokens, temperature, enable_rag, bot_type)
-- VALUES ('Test Bot', 'Test prompt', '<teacher_user_id_from_above>', 'openai/gpt-4.1-nano', 1000, 0.7, false, 'learning')
-- RETURNING chatbot_id;