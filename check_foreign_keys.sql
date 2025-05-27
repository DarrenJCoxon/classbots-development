-- Check foreign key relationships for the tables causing issues

-- 1. Check room_student_associations foreign keys
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table,
    af.attname AS foreign_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conrelid::regclass::text = 'room_student_associations';

-- 2. Check student_assessments foreign keys
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table,
    af.attname AS foreign_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conrelid::regclass::text = 'student_assessments';

-- 3. Check flagged_messages foreign keys
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table,
    af.attname AS foreign_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conrelid::regclass::text = 'flagged_messages';

-- 4. Check if profiles_old table still exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles_old'
) as profiles_old_exists;

-- 5. Check if RLS policies exist for these joins
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('room_student_associations', 'student_assessments', 'flagged_messages', 'student_profiles', 'teacher_profiles')
ORDER BY tablename, policyname;