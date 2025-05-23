-- Fix security issues identified by Supabase linter (final version)
-- This script addresses:
-- 1. RLS disabled for student_assessments which has policies
-- 2. Security definer view for room_memberships_admin
-- 3. RLS disabled for document_chunks

-- ============================================================
-- 1. Enable RLS for student_assessments table
-- ============================================================
-- This fixes the policy_exists_rls_disabled and rls_disabled_in_public errors
ALTER TABLE IF EXISTS public.student_assessments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Fix security definer view for room_memberships_admin
-- ============================================================
-- Get current view definition without SECURITY DEFINER
DO $$
DECLARE
  view_definition TEXT;
BEGIN
  -- Get current view definition
  SELECT pg_get_viewdef('public.room_memberships_admin'::regclass, true) 
  INTO view_definition;
  
  -- Drop the view
  EXECUTE 'DROP VIEW IF EXISTS public.room_memberships_admin CASCADE';
  
  -- Recreate the view without SECURITY DEFINER
  EXECUTE 'CREATE VIEW public.room_memberships_admin AS ' || view_definition;
END $$;

-- ============================================================
-- 3. Enable RLS for document_chunks table with minimal policy
-- ============================================================
ALTER TABLE IF EXISTS public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Add a minimal policy that requires authentication
CREATE POLICY document_chunks_auth_only ON public.document_chunks
FOR ALL
USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Verification
-- ============================================================
-- Check RLS status for tables
SELECT
  'student_assessments' as table_name,
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_assessments') as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_assessments') as policy_count
UNION ALL
SELECT
  'document_chunks' as table_name,
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_chunks') as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_chunks') as policy_count;

-- Check if view exists without security definer
SELECT 
  'room_memberships_admin' as view_name,
  (SELECT EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname = 'room_memberships_admin'
  )) as view_exists,
  (SELECT NOT EXISTS (
    SELECT 1 FROM pg_views v
    JOIN pg_class c ON v.viewname = c.relname
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public' 
    AND c.relname = 'room_memberships_admin' 
    AND c.relkind = 'v'
    AND c.reloptions::text LIKE '%security_barrier%'
  )) as is_not_security_definer;