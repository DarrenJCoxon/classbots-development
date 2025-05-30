-- ClassBots Realtime Configuration
-- This file sets up Supabase Realtime for chat functionality

-- Create publication for realtime if it doesn't exist
-- (Supabase might already create this automatically)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add chat_messages table to realtime publication
-- First try to drop the table from publication (ignore if it doesn't exist)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_messages;
  EXCEPTION WHEN undefined_object THEN
    -- Table wasn't in publication, ignore
  END;
END $$;

-- Add the table to publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Configure realtime behavior
-- This helps ensure proper message ordering and reduces duplication
-- by introducing a small delay in message processing
DO $$ 
BEGIN
    -- Update supabase_realtime configuration if the table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'supabase_functions' 
        AND table_name = 'config'
    ) THEN
        UPDATE supabase_functions.config 
        SET value = '{"realtime": {"secure": true, "check_origin": true, "flush_interval": 100}}'::jsonb
        WHERE name = 'realtime';
    END IF;
END $$;