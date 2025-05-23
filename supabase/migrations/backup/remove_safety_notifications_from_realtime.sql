-- Remove safety_notifications from realtime publication
-- This is a clean script that should work on any PostgreSQL version

-- First check if the publication exists
DO $$
BEGIN
  -- Check if supabase_realtime publication exists
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Try to drop the table from the publication
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.safety_notifications;
      RAISE NOTICE 'Successfully removed safety_notifications from publication';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error removing table: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Publication supabase_realtime does not exist';
  END IF;
END
$$;