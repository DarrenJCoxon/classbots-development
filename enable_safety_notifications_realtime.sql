-- Enable realtime for safety_notifications table
-- This script ONLY adds safety_notifications to the realtime publication
-- without making any other changes to the schema or configuration

-- Check if the table is already in the publication to avoid errors
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
    
    -- Only add the table if it's not already in the publication
    IF NOT table_exists THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_notifications';
        RAISE NOTICE 'Added safety_notifications table to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'safety_notifications table is already in supabase_realtime publication';
    END IF;
END
$$;

-- Verify that the table was added to the publication
SELECT pubname, schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'safety_notifications';