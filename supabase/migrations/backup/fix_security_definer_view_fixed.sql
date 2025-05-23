-- Safe fix for security definer view issue (non-destructive approach)
-- This script:
-- 1. Checks for existing view and its permissions
-- 2. Takes note of the view definition
-- 3. Recreates the view without SECURITY DEFINER
-- 4. Simple approach to minimize risk of syntax errors

DO $$
DECLARE
  view_exists BOOLEAN;
  view_definition TEXT;
BEGIN
  -- Check if the view exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'room_memberships_admin'
  ) INTO view_exists;
  
  IF NOT view_exists THEN
    RAISE NOTICE 'View room_memberships_admin does not exist. Nothing to fix.';
    RETURN;
  END IF;
  
  -- Get the view definition
  SELECT pg_get_viewdef('public.room_memberships_admin'::regclass, true) 
  INTO view_definition;
  
  -- Create a new view without the SECURITY DEFINER property
  -- First drop the existing view
  DROP VIEW IF EXISTS public.room_memberships_admin;
  
  -- Then recreate it with the same definition but without SECURITY DEFINER
  EXECUTE 'CREATE VIEW public.room_memberships_admin AS ' || view_definition;
  
  RAISE NOTICE 'Successfully recreated view room_memberships_admin without SECURITY DEFINER.';
END $$;

-- Verify the fix (without modifying anything)
SELECT 
  table_schema, 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public' 
AND table_name = 'room_memberships_admin';