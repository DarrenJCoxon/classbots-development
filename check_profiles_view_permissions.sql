-- Check if RLS is enabled on the profiles view
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Check RLS policies on profiles view (if it's treated as a table)
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Check permissions on the profiles view
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY grantee, privilege_type;

-- Check if the view is using SECURITY DEFINER
SELECT 
    n.nspname as schema_name,
    c.relname as view_name,
    pg_get_viewdef(c.oid) as view_definition,
    c.relowner::regrole as owner,
    CASE 
        WHEN c.relkind = 'v' THEN 'regular view'
        WHEN c.relkind = 'm' THEN 'materialized view'
    END as view_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
AND c.relname = 'profiles'
AND c.relkind IN ('v', 'm');

-- Test query to see if we can actually select from profiles
SELECT COUNT(*) as total_profiles FROM public.profiles;
SELECT COUNT(*) as teacher_count FROM public.profiles WHERE role = 'teacher';
SELECT COUNT(*) as student_count FROM public.profiles WHERE role = 'student';