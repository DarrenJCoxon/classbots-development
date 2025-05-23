-- Fix safety notifications to ensure they appear on refresh
-- This script ONLY includes the essential components needed for safety notifications to work

-- Make sure the safety_notifications table exists
CREATE TABLE IF NOT EXISTS public.safety_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message_id UUID NOT NULL,
  room_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  is_delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  
  FOREIGN KEY (user_id) REFERENCES auth.users(id),
  FOREIGN KEY (message_id) REFERENCES public.chat_messages(message_id),
  FOREIGN KEY (room_id) REFERENCES public.rooms(room_id)
);

-- Make sure RLS is enabled
ALTER TABLE public.safety_notifications ENABLE ROW LEVEL SECURITY;

-- Make sure the student read policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'safety_notifications' 
    AND policyname = 'student_read_own_notifications'
  ) THEN
    EXECUTE 'CREATE POLICY student_read_own_notifications ON public.safety_notifications
              FOR SELECT
              USING (user_id = auth.uid())';
  END IF;
END
$$;

-- Make sure indexes exist for performance
CREATE INDEX IF NOT EXISTS safety_notifications_user_id_idx ON public.safety_notifications(user_id);
CREATE INDEX IF NOT EXISTS safety_notifications_delivered_idx ON public.safety_notifications(is_delivered);
CREATE INDEX IF NOT EXISTS safety_notifications_created_at_idx ON public.safety_notifications(created_at);

-- Make sure the delivery timestamp trigger function exists
CREATE OR REPLACE FUNCTION update_notification_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- When notification is marked as delivered, update the delivery timestamp
  IF NEW.is_delivered = TRUE AND OLD.is_delivered = FALSE THEN
    NEW.delivered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure the trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_notification_delivery_trigger'
  ) THEN
    EXECUTE 'CREATE TRIGGER update_notification_delivery_trigger
             BEFORE UPDATE ON public.safety_notifications
             FOR EACH ROW
             EXECUTE FUNCTION update_notification_delivery()';
  END IF;
END
$$;

-- REMOVE this table from the realtime publication if it was added
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

-- Drop any additional triggers we might have created
DROP TRIGGER IF EXISTS safety_notification_insert_trigger ON public.safety_notifications;

-- Drop any additional functions we might have created
DROP FUNCTION IF EXISTS public.broadcast_safety_notification();

-- Reset the REPLICA IDENTITY if we modified it
ALTER TABLE IF EXISTS public.safety_notifications REPLICA IDENTITY DEFAULT;

-- Remove any comments that might have been added
COMMENT ON TABLE public.safety_notifications IS NULL;

-- Finally, check that everything is properly set up
SELECT 
    table_name, 
    table_type 
FROM 
    information_schema.tables 
WHERE 
    table_name = 'safety_notifications' 
    AND table_schema = 'public';

SELECT 
    policyname, 
    permissive 
FROM 
    pg_policies 
WHERE 
    tablename = 'safety_notifications' 
    AND schemaname = 'public';

SELECT 
    indexname,
    indexdef 
FROM 
    pg_indexes 
WHERE 
    tablename = 'safety_notifications' 
    AND schemaname = 'public';

SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM 
    information_schema.triggers
WHERE 
    event_object_table = 'safety_notifications'
    AND event_object_schema = 'public';