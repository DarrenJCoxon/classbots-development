-- Enable realtime for safety_notifications table
-- This script adds the safety_notifications table to the supabase_realtime publication
-- to ensure safety messages appear in real-time without requiring page refresh

-- First check if the publication exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        RAISE EXCEPTION 'The supabase_realtime publication does not exist!';
    END IF;
END$$;

-- Check if the safety_notifications table is already in the publication
DO $$
DECLARE
    table_in_publication BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'safety_notifications'
    ) INTO table_in_publication;
    
    IF table_in_publication THEN
        RAISE NOTICE 'The safety_notifications table is already in the supabase_realtime publication.';
    ELSE
        -- Add the safety_notifications table to the publication
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_notifications';
        RAISE NOTICE 'Successfully added safety_notifications table to the supabase_realtime publication.';
    END IF;
END$$;

-- Verify the table was added to the publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public' 
AND tablename = 'safety_notifications';

-- Set replica identity to full to ensure all fields are included in change events
ALTER TABLE public.safety_notifications REPLICA IDENTITY FULL;

-- Ensure the correct trigger for update_notification_delivery exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_notification_delivery_trigger'
    ) THEN
        EXECUTE '
        CREATE TRIGGER update_notification_delivery_trigger
        BEFORE UPDATE ON public.safety_notifications
        FOR EACH ROW
        EXECUTE FUNCTION update_notification_delivery()';
        
        RAISE NOTICE 'Created update_notification_delivery_trigger';
    ELSE
        RAISE NOTICE 'update_notification_delivery_trigger already exists';
    END IF;
END$$;

-- Remove any custom broadcast trigger to avoid duplicates
DROP TRIGGER IF EXISTS safety_notification_insert_trigger ON public.safety_notifications;

-- Final verification of all components
SELECT 
    'supabase_realtime publication exists' as check_item,
    EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') as result
UNION ALL
SELECT 
    'safety_notifications table in publication' as check_item,
    EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'safety_notifications'
    ) as result
UNION ALL
SELECT 
    'update_notification_delivery_trigger exists' as check_item,
    EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_notification_delivery_trigger'
    ) as result
UNION ALL
SELECT 
    'replica identity is set to FULL' as check_item,
    EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND c.relname = 'safety_notifications'
        AND c.relreplident = 'f'
    ) as result;