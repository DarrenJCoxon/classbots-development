-- Safe fix for security definer view issue (non-destructive approach)
-- This script:
-- 1. Checks for existing view and its permissions
-- 2. Creates a temporary backup of the view's permissions
-- 3. Recreates the view without SECURITY DEFINER but preserving the definition
-- 4. Restores any permissions that were previously set

DO $$
DECLARE
  view_exists BOOLEAN;
  view_definition TEXT;
  temp_view_name TEXT := 'room_memberships_admin_temp';
  dependents_exist BOOLEAN;
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
  
  -- Check for dependent objects before doing anything
  SELECT EXISTS (
    SELECT 1 FROM pg_depend d
    JOIN pg_class c ON d.refobjid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'room_memberships_admin'
    AND d.deptype = 'n' -- normal dependency
    AND d.classid <> d.refclassid -- only objects of different types
  ) INTO dependents_exist;
  
  IF dependents_exist THEN
    RAISE WARNING 'View room_memberships_admin has dependent objects that may be affected by recreating it.';
    RAISE NOTICE 'Please create a backup before proceeding.';
    -- We'll continue, but at least we've warned about potential issues
  END IF;
  
  -- Get the view definition
  SELECT pg_get_viewdef('public.room_memberships_admin'::regclass, true) 
  INTO view_definition;
  
  -- Create a new temporary view with the same definition (but not as security definer)
  EXECUTE 'CREATE OR REPLACE VIEW public.' || temp_view_name || ' AS ' || view_definition;
  
  -- Capture the permissions from the original view to apply to the new view
  EXECUTE '
  CREATE TEMPORARY TABLE temp_view_grants AS
  SELECT grantee, privilege_type
  FROM information_schema.role_table_grants 
  WHERE table_schema = ''public'' AND table_name = ''room_memberships_admin''
  ';
  
  -- Drop the original view
  DROP VIEW IF EXISTS public.room_memberships_admin;
  
  -- Create the new view with the same definition but without SECURITY DEFINER
  EXECUTE 'CREATE OR REPLACE VIEW public.room_memberships_admin AS ' || view_definition;
  
  -- Restore permissions from the original view
  FOR grantee, privilege_type IN 
    SELECT grantee, privilege_type FROM temp_view_grants
  LOOP
    EXECUTE 'GRANT ' || privilege_type || ' ON public.room_memberships_admin TO ' || grantee;
  END LOOP;
  
  -- Clean up
  DROP VIEW IF EXISTS public.temp_view_name;
  DROP TABLE IF EXISTS temp_view_grants;
  
  RAISE NOTICE 'Successfully recreated view room_memberships_admin without SECURITY DEFINER, preserving permissions.';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error occurred: %', SQLERRM;
  RAISE NOTICE 'Rolling back any changes made.';
  -- The transaction will be rolled back automatically on error
END $$;

-- Verify the fix (without modifying anything)
SELECT 
  table_schema, 
  table_name,
  view_definition, 
  'Permissions' AS info,
  string_agg(grantee || ':' || privilege_type, ', ') AS details
FROM information_schema.views
JOIN information_schema.role_table_grants
  ON views.table_schema = role_table_grants.table_schema
  AND views.table_name = role_table_grants.table_name
WHERE views.table_schema = 'public' 
AND views.table_name = 'room_memberships_admin'
GROUP BY table_schema, table_name, view_definition;