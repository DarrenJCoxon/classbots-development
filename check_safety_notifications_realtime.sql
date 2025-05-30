-- Check if safety_notifications table exists and has realtime enabled
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'safety_notifications';

-- Check if realtime is enabled for the table
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables
WHERE tablename = 'safety_notifications';

-- Check the table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'safety_notifications'
ORDER BY ordinal_position;

-- Enable realtime for safety_notifications table if it exists
-- First check if table exists before adding to publication
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'safety_notifications' AND schemaname = 'public') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_notifications;
            RAISE NOTICE 'Added safety_notifications to realtime publication';
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'safety_notifications already in realtime publication';
        END;
    ELSE
        RAISE NOTICE 'safety_notifications table does not exist';
    END IF;
END $$;

-- Also ensure chat_messages has realtime enabled for system messages
-- This is critical for safety messages to work
DO $$ 
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
        RAISE NOTICE 'Added chat_messages to realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'chat_messages already in realtime publication';
    END;
END $$;

-- Verify what tables are in the realtime publication
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;