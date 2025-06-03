-- Check current RLS policies and table structure for student_profiles
-- Run this in your Supabase SQL editor to see the current state

-- 1. Check if RLS is enabled on student_profiles
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'student_profiles' 
AND schemaname = 'public';

-- 1b. Additional RLS info from pg_class
SELECT 
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'student_profiles' 
AND n.nspname = 'public';

-- 2. Show all current policies on student_profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'student_profiles' 
AND schemaname = 'public'
ORDER BY policyname;

-- 3. Check table structure and constraints
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'student_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check foreign key constraints
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='student_profiles'
AND tc.table_schema = 'public';

-- 5. Check indexes on student_profiles
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'student_profiles'
AND schemaname = 'public';

-- 6. For comparison, also check teacher_profiles policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'teacher_profiles' 
AND schemaname = 'public'
ORDER BY policyname;

-- 7. Check if there are any conflicting policies or permissions
SELECT 
    grantee,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'student_profiles'
AND table_schema = 'public';

-- 8. Check the current user's role and permissions (this will show what role the query is running as)
SELECT current_user, session_user, current_setting('role');