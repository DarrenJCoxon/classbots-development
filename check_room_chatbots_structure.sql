-- Check the exact structure of room_chatbots table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'room_chatbots'
ORDER BY ordinal_position;