-- Fix only the security definer view issue for room_memberships_admin
-- This script uses a more direct approach to address the security definer problem

-- First, check if the view exists and get its definition
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
  
  -- Log the existing view definition (for reference)
  RAISE NOTICE 'Original view definition: %', view_definition;
  
  -- Drop the view (with CASCADE to handle potential dependencies)
  DROP VIEW IF EXISTS public.room_memberships_admin CASCADE;
  
  -- Create a new view using the same definition but without SECURITY DEFINER
  EXECUTE 'CREATE VIEW public.room_memberships_admin AS ' || view_definition;
  
  RAISE NOTICE 'View room_memberships_admin has been recreated without SECURITY DEFINER.';
END $$;

-- Verify the fix
SELECT 
  table_schema, 
  table_name, 
  view_definition
FROM information_schema.views  
WHERE table_schema = 'public' 
AND table_name = 'room_memberships_admin';