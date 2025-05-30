-- Check current table structure
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'profiles_old', 'teacher_profiles', 'student_profiles')
ORDER BY table_name;

-- Check columns in teacher_profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'teacher_profiles'
ORDER BY ordinal_position;

-- Check columns in student_profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'student_profiles'
ORDER BY ordinal_position;

-- Check if profiles table exists or if it's a view
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'profiles';

-- If profiles is missing, create a view to maintain compatibility
CREATE OR REPLACE VIEW public.profiles AS
SELECT 
    sp.user_id,
    sp.email,
    sp.full_name,
    'student'::text as role,
    sp.school_id,
    sp.country_code,
    sp.pin_code,
    sp.username,
    sp.last_pin_change,
    sp.pin_change_by,
    sp.created_at,
    sp.updated_at
FROM student_profiles sp
UNION ALL
SELECT 
    tp.user_id,
    tp.email,
    tp.full_name,
    'teacher'::text as role,
    NULL as school_id,
    tp.country_code,
    NULL as pin_code,
    NULL as username,
    NULL as last_pin_change,
    NULL as pin_change_by,
    tp.created_at,
    tp.updated_at
FROM teacher_profiles tp;