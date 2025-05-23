-- Fix security issues identified by Supabase linter
-- This script addresses:
-- 1. RLS disabled for student_assessments which has policies
-- 2. Security definer view for room_memberships_admin
-- 3. RLS disabled for document_chunks

-- ============================================================
-- 1. Enable RLS for student_assessments table
-- ============================================================
-- This fixes the policy_exists_rls_disabled and rls_disabled_in_public errors
ALTER TABLE IF EXISTS public.student_assessments ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled and policies exist
DO $$
BEGIN
  RAISE NOTICE 'Verifying RLS for student_assessments:';
  
  -- Check if RLS is enabled
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'student_assessments'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '- RLS is now enabled for student_assessments';
  ELSE
    RAISE WARNING '- Failed to enable RLS for student_assessments';
  END IF;
  
  -- List policies
  RAISE NOTICE 'Policies for student_assessments:';
  PERFORM format('- %s', policyname)
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'student_assessments';
END $$;

-- ============================================================
-- 2. Fix security definer view for room_memberships_admin
-- ============================================================
-- Create a new version of the view WITHOUT security definer
DO $$
DECLARE
  view_definition TEXT;
BEGIN
  -- Get current view definition (without the security definer part)
  SELECT pg_get_viewdef('public.room_memberships_admin'::regclass, true) 
  INTO view_definition;
  
  -- Log current view definition
  RAISE NOTICE 'Current view definition: %', view_definition;
  
  -- Drop the view
  EXECUTE 'DROP VIEW IF EXISTS public.room_memberships_admin CASCADE';
  
  -- Recreate the view without SECURITY DEFINER
  -- We remove any SECURITY DEFINER clauses and simply create the view with the same query
  EXECUTE 'CREATE VIEW public.room_memberships_admin AS ' || view_definition;
  
  RAISE NOTICE 'View room_memberships_admin recreated without SECURITY DEFINER';
END $$;

-- ============================================================
-- 3. Enable RLS for document_chunks table
-- ============================================================
ALTER TABLE IF EXISTS public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Create a default policy for document_chunks if none exists
-- This allows only teachers to access document chunks related to their chatbots
DO $$
BEGIN
  -- Only create policy if it doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'document_chunks'
  ) THEN
    -- Create a policy that joins to chatbots to check ownership
    EXECUTE '
    CREATE POLICY document_chunks_teachers_select ON public.document_chunks
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 
        FROM public.chatbots 
        WHERE chatbots.chatbot_id = document_chunks.chatbot_id
        AND chatbots.teacher_id = auth.uid()
      )
    )';
    
    RAISE NOTICE 'Created teacher select policy for document_chunks';
  ELSE
    RAISE NOTICE 'Policies already exist for document_chunks, not creating default policy';
  END IF;
END $$;

-- Verify all fixes were applied
SELECT
  'student_assessments' as table_name,
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_assessments') as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_assessments') as policy_count
UNION ALL
SELECT
  'document_chunks' as table_name,
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_chunks') as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_chunks') as policy_count
UNION ALL
SELECT
  'room_memberships_admin' as table_name,
  NULL as rls_enabled,
  (SELECT CASE WHEN security_type = 'invoker' THEN 1 ELSE 0 END
   FROM pg_views WHERE schemaname = 'public' AND viewname = 'room_memberships_admin') as is_invoker_security;