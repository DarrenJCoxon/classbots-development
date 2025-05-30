-- Check ALL foreign key constraints that reference profiles or profiles_old
SELECT
    tc.constraint_name,
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
    AND (ccu.table_name = 'profiles' OR ccu.table_name = 'profiles_old')
ORDER BY tc.table_name, tc.constraint_name;

-- Also check any table that might have student_id or teacher_id columns
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND (column_name = 'student_id' OR column_name = 'teacher_id')
    AND table_name NOT IN ('student_profiles', 'teacher_profiles')
ORDER BY table_name, column_name;