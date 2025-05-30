-- Check current view definitions
-- This will show us why these views are using SECURITY DEFINER

-- 1. Check room_memberships_admin view
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'room_memberships_admin';

-- 2. Check profiles view
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'profiles';

-- 3. Check if these views are actually needed or if they can be replaced
-- First, let's see what depends on these views
SELECT DISTINCT
    dependent_ns.nspname AS dependent_schema,
    dependent_view.relname AS dependent_view,
    source_ns.nspname AS source_schema,
    source_table.relname AS source_table
FROM pg_depend 
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid 
JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
JOIN pg_namespace source_ns ON source_table.relnamespace = source_ns.oid
WHERE 
    source_ns.nspname = 'public'
    AND source_table.relname IN ('room_memberships_admin', 'profiles')
    AND source_table.relkind = 'v';

-- 4. Check what these views are selecting from
-- This helps us understand if we can replace them with regular views
SELECT 
    v.schemaname,
    v.viewname,
    v.definition,
    obj_description(c.oid, 'pg_class') as comment
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = v.schemaname
WHERE v.schemaname = 'public' 
AND v.viewname IN ('room_memberships_admin', 'profiles');