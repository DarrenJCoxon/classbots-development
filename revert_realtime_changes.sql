-- Revert any changes made to the realtime publication
-- This script removes safety_notifications from the realtime publication if it was added

-- Check if the table is in the publication
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'safety_notifications'
    ) INTO table_exists;
    
    -- If table is in the publication, remove it
    IF table_exists THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.safety_notifications';
        RAISE NOTICE 'Removed safety_notifications table from supabase_realtime publication';
    ELSE
        RAISE NOTICE 'safety_notifications table is not in supabase_realtime publication - no action needed';
    END IF;
END
$$;

-- Drop any triggers we might have created
DROP TRIGGER IF EXISTS safety_notification_insert_trigger ON public.safety_notifications;

-- Drop any functions we might have created
DROP FUNCTION IF EXISTS public.broadcast_safety_notification();

-- Reset the REPLICA IDENTITY if we modified it
ALTER TABLE IF EXISTS public.safety_notifications REPLICA IDENTITY DEFAULT;

-- Remove any comments that might have been added
COMMENT ON TABLE public.safety_notifications IS NULL;