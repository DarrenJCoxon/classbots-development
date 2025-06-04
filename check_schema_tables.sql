-- Check what tables exist related to rooms and chatbots
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%room%' 
    OR table_name LIKE '%chatbot%' 
    OR table_name LIKE '%assessment%'
)
ORDER BY table_name;

-- Check columns in the rooms table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'rooms'
ORDER BY ordinal_position;

-- Check columns in the chatbots table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'chatbots'
ORDER BY ordinal_position;

-- Check if there's a junction table between rooms and chatbots
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND (
    (tc.table_name LIKE '%room%' AND ccu.table_name = 'chatbots')
    OR (tc.table_name = 'chatbots' AND ccu.table_name LIKE '%room%')
    OR tc.table_name = 'student_assessments'
);