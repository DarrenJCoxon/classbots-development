-- Apply profile views fix
-- Run this script in your Supabase SQL editor

-- First check if the views already exist
SELECT 
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('teacher_profiles', 'student_profiles');

-- Check if year_group column exists in profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name = 'year_group';

-- Apply the migrations
-- Note: You should run the migration files in order:
-- 1. 20250130000000_create_profile_views.sql
-- 2. 20250130000001_add_year_group_to_profiles.sql

-- After applying migrations, test the views:
-- Test teacher_profiles view
SELECT COUNT(*) as teacher_count FROM teacher_profiles;

-- Test student_profiles view  
SELECT COUNT(*) as student_count FROM student_profiles;

-- Test a sample query similar to what the API uses
SELECT 
    sp.user_id,
    sp.full_name,
    sp.username,
    sp.year_group,
    sp.display_name
FROM student_profiles sp
LIMIT 5;

-- Check if RLS is working properly
-- This should return true if RLS is enabled
SELECT relrowsecurity 
FROM pg_class 
WHERE relname = 'profiles' 
AND relnamespace = 'public'::regnamespace;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY policyname;