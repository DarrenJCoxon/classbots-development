-- Investigate Security Definer Views
-- This script helps understand why these views use SECURITY DEFINER
-- and what impact removing it might have

-- 1. Get detailed information about the views
SELECT 
    n.nspname as schema_name,
    c.relname as view_name,
    c.relowner::regrole as owner,
    c.relacl as access_privileges,
    obj_description(c.oid, 'pg_class') as comment,
    CASE 
        WHEN c.relkind = 'v' THEN 'VIEW'
        WHEN c.relkind = 'm' THEN 'MATERIALIZED VIEW'
    END as type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
AND c.relname IN ('room_memberships_admin', 'profiles')
AND c.relkind IN ('v', 'm');

-- 2. Check the actual view definitions
SELECT 
    '--- VIEW: ' || viewname || ' ---' as info,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('room_memberships_admin', 'profiles')
ORDER BY viewname;

-- 3. Check what tables these views reference
WITH view_dependencies AS (
    SELECT DISTINCT
        v.schemaname AS view_schema,
        v.viewname AS view_name,
        n2.nspname AS referenced_schema,
        c2.relname AS referenced_table,
        c2.relkind AS referenced_type
    FROM pg_views v
    JOIN pg_depend d ON d.objid = (
        SELECT c.oid 
        FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = v.schemaname AND c.relname = v.viewname
    )
    JOIN pg_class c2 ON c2.oid = d.refobjid
    JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
    WHERE v.schemaname = 'public' 
    AND v.viewname IN ('room_memberships_admin', 'profiles')
    AND d.deptype = 'n'
    AND c2.relkind IN ('r', 'v', 'm') -- tables, views, materialized views
)
SELECT * FROM view_dependencies
ORDER BY view_name, referenced_table;

-- 4. Check if these views are used by any functions or other views
SELECT DISTINCT
    pronamespace::regnamespace AS function_schema,
    proname AS function_name,
    'FUNCTION' as object_type
FROM pg_proc
WHERE prosrc LIKE '%room_memberships_admin%' 
   OR prosrc LIKE '%profiles%'
UNION ALL
SELECT DISTINCT
    schemaname,
    viewname,
    'VIEW' as object_type
FROM pg_views
WHERE definition LIKE '%room_memberships_admin%' 
   OR definition LIKE '%profiles%'
ORDER BY object_type, function_name;

-- 5. Check RLS policies on underlying tables
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
WHERE schemaname = 'public'
AND tablename IN (
    'room_memberships', 
    'students', 
    'teachers',
    'teacher_profiles',
    'student_room_associations'
)
ORDER BY tablename, policyname;

-- 6. Check if we're using auth schema functions in these views
SELECT 
    viewname,
    CASE 
        WHEN definition LIKE '%auth.%' THEN 'Uses auth functions'
        ELSE 'No auth functions'
    END as auth_usage,
    CASE
        WHEN definition LIKE '%auth.uid()%' THEN 'Uses auth.uid()'
        WHEN definition LIKE '%auth.role()%' THEN 'Uses auth.role()'
        WHEN definition LIKE '%auth.jwt()%' THEN 'Uses auth.jwt()'
        ELSE 'No specific auth function'
    END as auth_function
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('room_memberships_admin', 'profiles');

-- 7. Summary of findings
SELECT 
    '=== SUMMARY ===' as info
UNION ALL
SELECT 
    'Total views with SECURITY DEFINER: ' || COUNT(*)::text
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = v.schemaname
WHERE v.schemaname = 'public' 
AND v.viewname IN ('room_memberships_admin', 'profiles');