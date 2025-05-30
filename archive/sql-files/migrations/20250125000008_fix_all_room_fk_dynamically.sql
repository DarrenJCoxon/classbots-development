-- Dynamically fix ALL foreign key constraints referencing rooms table
-- This will catch any tables we might have missed, including safety_notifications

DO $$
DECLARE
    r RECORD;
    sql_command TEXT;
    fixed_count INTEGER := 0;
BEGIN
    -- Find all foreign key constraints that reference rooms table and don't use CASCADE
    FOR r IN
        SELECT DISTINCT
            tc.table_name,
            tc.constraint_name,
            kcu.column_name,
            ccu.column_name as referenced_column
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            JOIN information_schema.referential_constraints AS rc
              ON rc.constraint_name = tc.constraint_name
              AND rc.constraint_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'rooms'
            AND tc.table_schema = 'public'
            AND rc.delete_rule != 'CASCADE'
    LOOP
        RAISE NOTICE 'Fixing constraint % on table %.% (references rooms.%)', 
            r.constraint_name, 'public', r.table_name, r.referenced_column;
        
        -- Drop the existing constraint
        sql_command := format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
            r.table_name, r.constraint_name);
        EXECUTE sql_command;
        
        -- Recreate with CASCADE
        sql_command := format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.rooms(%I) ON DELETE CASCADE',
            r.table_name, r.constraint_name, r.column_name, r.referenced_column);
        EXECUTE sql_command;
        
        fixed_count := fixed_count + 1;
    END LOOP;
    
    IF fixed_count > 0 THEN
        RAISE NOTICE 'Fixed % foreign key constraints to use CASCADE delete', fixed_count;
    ELSE
        RAISE NOTICE 'All foreign key constraints already use CASCADE delete';
    END IF;
    
    -- Special handling for safety_notifications table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'safety_notifications') THEN
        -- Ensure RLS policy exists for deletion
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
        
        RAISE NOTICE 'Added deletion policy for safety_notifications table';
    END IF;
    
    -- List all current FK constraints for verification
    RAISE NOTICE 'Current FK constraints referencing rooms table:';
    FOR r IN
        SELECT 
            tc.table_name,
            tc.constraint_name,
            rc.delete_rule
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.referential_constraints AS rc
              ON rc.constraint_name = tc.constraint_name
              AND rc.constraint_schema = tc.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'rooms'
            AND tc.table_schema = 'public'
        ORDER BY tc.table_name
    LOOP
        RAISE NOTICE '  - %.% [%]', r.table_name, r.constraint_name, r.delete_rule;
    END LOOP;
END $$;