-- STEP-BY-STEP FIX FOR SECURITY DEFINER VIEWS
-- Execute each step separately and verify before proceeding

-- ============================================
-- STEP 1: BACKUP CURRENT VIEW DEFINITIONS
-- ============================================
-- Run this first to save the exact current definitions including SECURITY DEFINER

-- 1a. Get the current EXACT definition of room_memberships_admin
SELECT 'CREATE OR REPLACE VIEW public.room_memberships_admin WITH (security_invoker=false) AS ' || definition || ';' as rollback_room_memberships_admin
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'room_memberships_admin';

-- 1b. Get the current EXACT definition of profiles
SELECT 'CREATE OR REPLACE VIEW public.profiles WITH (security_invoker=false) AS ' || definition || ';' as rollback_profiles
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'profiles';

-- 1c. Check what depends on these views (important for CASCADE decisions)
SELECT DISTINCT
    dependent_ns.nspname || '.' || dependent_view.relname AS dependent_object,
    'depends on' as relationship,
    source_ns.nspname || '.' || source_table.relname AS source_view
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

-- 1d. Save current permissions
SELECT 
    'GRANT ' || privilege_type || ' ON ' || table_schema || '.' || table_name || ' TO ' || grantee || ';' as permission_grant
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name IN ('room_memberships_admin', 'profiles')
ORDER BY table_name, grantee;

-- SAVE ALL OUTPUT FROM STEP 1 BEFORE PROCEEDING!

-- ============================================
-- STEP 2: TEST QUERIES (Before changes)
-- ============================================
-- Run these test queries and save the results to compare after changes

-- 2a. Test room_memberships_admin access
SELECT COUNT(*) as room_memberships_admin_count FROM public.room_memberships_admin;

-- 2b. Test profiles access
SELECT COUNT(*) as total_profiles, 
       COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teacher_count,
       COUNT(CASE WHEN role = 'student' THEN 1 END) as student_count
FROM public.profiles;

-- 2c. Check current user and permissions
SELECT current_user, current_role;

-- ============================================
-- STEP 3: FIX room_memberships_admin VIEW
-- ============================================
-- This is the simpler view, so we start here

-- 3a. Drop and recreate WITHOUT SECURITY DEFINER
BEGIN;

-- Drop the view (use CASCADE only if Step 1c showed no dependencies)
DROP VIEW IF EXISTS public.room_memberships_admin;

-- Recreate as regular view (WITHOUT SECURITY DEFINER)
CREATE VIEW public.room_memberships_admin AS
SELECT room_memberships.room_id,
    room_memberships.student_id,
    room_memberships.joined_at
FROM room_memberships;

-- Restore permissions (adjust based on Step 1d output)
GRANT SELECT ON public.room_memberships_admin TO authenticated;
GRANT SELECT ON public.room_memberships_admin TO service_role;

-- 3b. Verify the change
SELECT 
    c.relname as view_name,
    CASE 
        WHEN v.definition LIKE '%SECURITY DEFINER%' THEN 'STILL HAS SECURITY DEFINER!'
        ELSE 'Fixed - No SECURITY DEFINER'
    END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_views v ON v.viewname = c.relname AND v.schemaname = n.nspname
WHERE n.nspname = 'public'
AND c.relname = 'room_memberships_admin';

-- 3c. Test the view works
SELECT COUNT(*) as room_memberships_admin_count_after FROM public.room_memberships_admin;

-- If everything looks good:
COMMIT;

-- If there are problems:
-- ROLLBACK;
-- Then use the rollback statement from Step 1a

-- ============================================
-- STEP 4: FIX profiles VIEW
-- ============================================
-- This is more complex due to the UNION

-- 4a. Drop and recreate WITHOUT SECURITY DEFINER
BEGIN;

-- Drop the view (use CASCADE only if Step 1c showed no dependencies)
DROP VIEW IF EXISTS public.profiles;

-- Recreate as regular view (WITHOUT SECURITY DEFINER)
CREATE VIEW public.profiles AS
SELECT teacher_profiles.user_id,
    teacher_profiles.email,
    teacher_profiles.full_name,
    'teacher'::text AS role,
    teacher_profiles.created_at,
    teacher_profiles.updated_at,
    teacher_profiles.school_id,
    teacher_profiles.country_code,
    NULL::character varying(4) AS pin_code,
    NULL::character varying(50) AS username,
    NULL::timestamp with time zone AS last_pin_change,
    NULL::uuid AS pin_change_by
FROM teacher_profiles
UNION ALL
SELECT student_profiles.user_id,
    ''::text AS email,
    student_profiles.full_name,
    'student'::text AS role,
    student_profiles.created_at,
    student_profiles.updated_at,
    student_profiles.school_id,
    student_profiles.country_code,
    student_profiles.pin_code,
    student_profiles.username,
    student_profiles.last_pin_change,
    student_profiles.pin_change_by
FROM student_profiles;

-- Restore permissions (adjust based on Step 1d output)
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO service_role;

-- 4b. Verify the change
SELECT 
    c.relname as view_name,
    CASE 
        WHEN v.definition LIKE '%SECURITY DEFINER%' THEN 'STILL HAS SECURITY DEFINER!'
        ELSE 'Fixed - No SECURITY DEFINER'
    END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_views v ON v.viewname = c.relname AND v.schemaname = n.nspname
WHERE n.nspname = 'public'
AND c.relname = 'profiles';

-- 4c. Test the view works
SELECT COUNT(*) as total_profiles_after, 
       COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teacher_count_after,
       COUNT(CASE WHEN role = 'student' THEN 1 END) as student_count_after
FROM public.profiles;

-- If everything looks good:
COMMIT;

-- If there are problems:
-- ROLLBACK;
-- Then use the rollback statement from Step 1b

-- ============================================
-- STEP 5: FINAL VERIFICATION
-- ============================================

-- 5a. Confirm both views are fixed
SELECT 
    table_schema,
    table_name,
    is_insertable_into,
    is_updatable,
    CASE 
        WHEN table_name IN (
            SELECT c.relname 
            FROM pg_class c
            JOIN pg_rewrite r ON r.ev_class = c.oid
            WHERE c.relkind = 'v'
            AND r.ev_action::text LIKE '%SECURITY DEFINER%'
        ) THEN 'HAS SECURITY DEFINER'
        ELSE 'NO SECURITY DEFINER'
    END as security_status
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('room_memberships_admin', 'profiles');

-- 5b. Verify RLS is enabled on underlying tables
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN 'RLS Enabled ✓'
        ELSE 'RLS Disabled ✗'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('room_memberships', 'teacher_profiles', 'student_profiles');

-- 5c. Run the Supabase linter check again to confirm the error is gone
-- This would be done in the Supabase dashboard

-- ============================================
-- ROLLBACK PROCEDURES (if needed)
-- ============================================
-- If you need to rollback after committing:
-- 1. Use the CREATE OR REPLACE VIEW statements saved from Step 1a and 1b
-- 2. They will restore the views WITH SECURITY DEFINER as they were before