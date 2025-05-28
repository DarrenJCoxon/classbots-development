-- 1. Check what tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'profiles_old', 'teacher_profiles', 'student_profiles')
ORDER BY table_name;

-- 2. Check what views exist
SELECT 
    table_name as view_name,
    view_definition
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'profiles_old', 'teacher_profiles', 'student_profiles');

-- 3. Check columns in any existing profiles table
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Check columns in teacher_profiles
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'teacher_profiles'
ORDER BY ordinal_position;

-- 5. Check columns in student_profiles  
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'student_profiles'
ORDER BY ordinal_position;

-- 6. Check if profiles_old exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles_old'
ORDER BY ordinal_position;

-- 7. Check foreign key constraints that reference profiles
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name IN ('profiles', 'profiles_old', 'teacher_profiles', 'student_profiles');

-- 8. Check indexes on profile tables
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'profiles_old', 'teacher_profiles', 'student_profiles')
ORDER BY tablename, indexname;