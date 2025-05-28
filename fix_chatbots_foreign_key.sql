-- Fix chatbots table foreign key constraint
-- The chatbots table is currently referencing profiles_old which is deprecated

-- 1. Drop the old foreign key constraint
ALTER TABLE public.chatbots 
DROP CONSTRAINT IF EXISTS chatbots_teacher_id_fkey;

-- 2. Add new foreign key constraint referencing auth.users
-- This matches the pattern used in student_assessments after the migration
ALTER TABLE public.chatbots 
ADD CONSTRAINT chatbots_teacher_id_fkey 
FOREIGN KEY (teacher_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 3. Verify the change
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
AND tc.table_name = 'chatbots'
AND tc.constraint_type = 'FOREIGN KEY';