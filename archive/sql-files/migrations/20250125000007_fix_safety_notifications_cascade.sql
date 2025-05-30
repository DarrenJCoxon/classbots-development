-- Fix cascade delete for safety_notifications table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'safety_notifications') THEN
    -- Drop and recreate the foreign key constraint with CASCADE
    ALTER TABLE public.safety_notifications
      DROP CONSTRAINT IF EXISTS safety_notifications_room_id_fkey;

    ALTER TABLE public.safety_notifications
      ADD CONSTRAINT safety_notifications_room_id_fkey
      FOREIGN KEY (room_id)
      REFERENCES public.rooms(room_id)
      ON DELETE CASCADE;

    -- Also ensure the chatbot_id foreign key has CASCADE (if it exists)
    ALTER TABLE public.safety_notifications
      DROP CONSTRAINT IF EXISTS safety_notifications_chatbot_id_fkey;

    ALTER TABLE public.safety_notifications
      ADD CONSTRAINT safety_notifications_chatbot_id_fkey
      FOREIGN KEY (chatbot_id)
      REFERENCES public.chatbots(chatbot_id)
      ON DELETE CASCADE;

    -- Add RLS policy for teachers to delete safety notifications in their rooms
    DROP POLICY IF EXISTS "Teachers can delete safety notifications in their rooms" ON public.safety_notifications;

    CREATE POLICY "Teachers can delete safety notifications in their rooms"
    ON public.safety_notifications
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.rooms
        WHERE rooms.room_id = safety_notifications.room_id
        AND rooms.teacher_id = auth.uid()
      )
    );
    
    RAISE NOTICE 'Fixed cascade deletes for safety_notifications table';
  ELSE
    RAISE NOTICE 'safety_notifications table does not exist, skipping';
  END IF;
END $$;

-- Verify all foreign key constraints now use CASCADE
DO $$
DECLARE
    constraint_count INTEGER;
    non_cascade_count INTEGER;
BEGIN
    -- Count all FK constraints referencing rooms
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.referential_constraints rc
    JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = rc.constraint_name
        AND ccu.constraint_schema = rc.constraint_schema
    WHERE ccu.table_name = 'rooms'
        AND ccu.table_schema = 'public';
    
    -- Count non-CASCADE constraints
    SELECT COUNT(*) INTO non_cascade_count
    FROM information_schema.referential_constraints rc
    JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = rc.constraint_name
        AND ccu.constraint_schema = rc.constraint_schema
    WHERE ccu.table_name = 'rooms'
        AND ccu.table_schema = 'public'
        AND rc.delete_rule != 'CASCADE';
    
    RAISE NOTICE 'Total FK constraints referencing rooms: %', constraint_count;
    RAISE NOTICE 'Non-CASCADE constraints: %', non_cascade_count;
    
    IF non_cascade_count > 0 THEN
        -- List the problematic constraints
        FOR constraint_count IN
            SELECT tc.table_name || '.' || tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.referential_constraints rc
                ON rc.constraint_name = tc.constraint_name
                AND rc.constraint_schema = tc.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.constraint_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND ccu.table_name = 'rooms'
                AND tc.table_schema = 'public'
                AND rc.delete_rule != 'CASCADE'
        LOOP
            RAISE WARNING 'Constraint without CASCADE: %', constraint_count;
        END LOOP;
    ELSE
        RAISE NOTICE 'SUCCESS: All foreign key constraints to rooms table now use CASCADE delete';
    END IF;
END $$;