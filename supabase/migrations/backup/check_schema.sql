-- Check profiles table structure
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Check room_memberships table structure
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'room_memberships';

-- Check chat_messages table structure
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'chat_messages';

-- Check student_chatbot_instances table structure
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'student_chatbot_instances';

-- Check auth.uid() type
SELECT pg_typeof(auth.uid());