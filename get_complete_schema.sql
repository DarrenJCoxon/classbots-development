-- Get complete schema for all relevant tables

-- 1. Chatbots table structure
SELECT 'CHATBOTS TABLE' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'chatbots'
ORDER BY ordinal_position;

-- 2. Student_assessments table structure
SELECT 'STUDENT_ASSESSMENTS TABLE' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'student_assessments'
ORDER BY ordinal_position;

-- 3. Room_chatbots table structure (already checked but including for completeness)
SELECT 'ROOM_CHATBOTS TABLE' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'room_chatbots'
ORDER BY ordinal_position;

-- 4. Student_chatbot_instances table structure
SELECT 'STUDENT_CHATBOT_INSTANCES TABLE' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'student_chatbot_instances'
ORDER BY ordinal_position;