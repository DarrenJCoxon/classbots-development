-- Add safety_notifications table to Supabase realtime publication
-- This allows clients to receive real-time updates when safety notifications are created

-- First check if the table is already in the publication
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
    
    IF table_exists THEN
        -- If table is already in publication, remove it first
        EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.safety_notifications';
    END IF;
END
$$;

-- Now add the table to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_notifications;

-- Verify publication includes the table
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'safety_notifications';