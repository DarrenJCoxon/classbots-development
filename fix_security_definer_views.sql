-- Fix security definer views by replacing them with regular views
-- This script removes the SECURITY DEFINER property which is a security risk

-- IMPORTANT: Run the check script first to understand what these views do
-- and ensure this won't break your application

BEGIN;

-- 1. Fix room_memberships_admin view
-- First, capture the current view definition
DO $$
DECLARE
    view_def TEXT;
BEGIN
    -- Get the current view definition
    SELECT definition INTO view_def
    FROM pg_views 
    WHERE schemaname = 'public' AND viewname = 'room_memberships_admin';
    
    IF view_def IS NOT NULL THEN
        -- Drop the existing view
        DROP VIEW IF EXISTS public.room_memberships_admin CASCADE;
        
        -- Recreate without SECURITY DEFINER
        -- Note: This creates a regular view that respects RLS policies
        EXECUTE 'CREATE VIEW public.room_memberships_admin AS ' || view_def;
        
        -- Grant appropriate permissions
        -- Adjust these based on your needs
        GRANT SELECT ON public.room_memberships_admin TO authenticated;
        
        RAISE NOTICE 'Successfully recreated room_memberships_admin view without SECURITY DEFINER';
    ELSE
        RAISE NOTICE 'View room_memberships_admin not found';
    END IF;
END $$;

-- 2. Fix profiles view
DO $$
DECLARE
    view_def TEXT;
BEGIN
    -- Get the current view definition
    SELECT definition INTO view_def
    FROM pg_views 
    WHERE schemaname = 'public' AND viewname = 'profiles';
    
    IF view_def IS NOT NULL THEN
        -- Drop the existing view
        DROP VIEW IF EXISTS public.profiles CASCADE;
        
        -- Recreate without SECURITY DEFINER
        EXECUTE 'CREATE VIEW public.profiles AS ' || view_def;
        
        -- Grant appropriate permissions
        GRANT SELECT ON public.profiles TO authenticated;
        GRANT SELECT ON public.profiles TO anon;
        
        RAISE NOTICE 'Successfully recreated profiles view without SECURITY DEFINER';
    ELSE
        RAISE NOTICE 'View profiles not found';
    END IF;
END $$;

-- 3. Alternative approach if the views need elevated permissions
-- If these views MUST access data that users shouldn't directly access,
-- consider using security definer FUNCTIONS instead of views

-- Example: Create a function that returns the data
-- CREATE OR REPLACE FUNCTION get_room_memberships_admin()
-- RETURNS TABLE (
--     -- Define your columns here
-- )
-- SECURITY DEFINER
-- SET search_path = public
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--     -- Add security checks here
--     IF NOT (auth.role() = 'authenticated') THEN
--         RAISE EXCEPTION 'Access denied';
--     END IF;
--     
--     -- Return your data
--     RETURN QUERY
--     SELECT * FROM your_table WHERE your_conditions;
-- END;
-- $$;

-- 4. If you need to keep SECURITY DEFINER for specific reasons,
-- at least ensure proper security measures:
-- - Set a specific search_path
-- - Add authorization checks
-- - Limit the view's capabilities

-- Example of a safer SECURITY DEFINER view:
-- CREATE OR REPLACE VIEW public.room_memberships_admin 
-- WITH (security_invoker = false) -- This explicitly sets SECURITY DEFINER
-- AS
-- SELECT * FROM room_memberships
-- WHERE auth.uid() IS NOT NULL; -- Basic auth check

COMMIT;

-- After running this script, test your application thoroughly
-- to ensure nothing is broken by these changes