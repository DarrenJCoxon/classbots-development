-- Comprehensive fix for all foreign key constraints to ensure CASCADE deletes work properly

-- Function to drop and recreate a foreign key constraint with CASCADE
CREATE OR REPLACE FUNCTION fix_cascade_constraint(
    p_table_name text,
    p_constraint_name text,
    p_column_name text,
    p_foreign_table text,
    p_foreign_column text
) RETURNS void AS $$
BEGIN
    -- Drop the constraint if it exists
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', p_table_name, p_constraint_name);
    
    -- Add it back with CASCADE
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(%I) ON DELETE CASCADE',
        p_table_name, p_constraint_name, p_column_name, p_foreign_table, p_foreign_column);
END;
$$ LANGUAGE plpgsql;

-- Fix all known foreign key constraints that reference rooms table

-- 1. room_chatbots
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_chatbots') THEN
        PERFORM fix_cascade_constraint('room_chatbots', 'room_chatbots_room_id_fkey', 'room_id', 'rooms', 'room_id');
    END IF;
END $$;

-- 2. room_memberships
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_memberships') THEN
        PERFORM fix_cascade_constraint('room_memberships', 'room_memberships_room_id_fkey', 'room_id', 'rooms', 'room_id');
    END IF;
END $$;

-- 3. chat_messages
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
        PERFORM fix_cascade_constraint('chat_messages', 'chat_messages_room_id_fkey', 'room_id', 'rooms', 'room_id');
    END IF;
END $$;

-- 4. chat_instances (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_instances') THEN
        PERFORM fix_cascade_constraint('chat_instances', 'chat_instances_room_id_fkey', 'room_id', 'rooms', 'room_id');
    END IF;
END $$;

-- 5. assessments (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessments') THEN
        PERFORM fix_cascade_constraint('assessments', 'assessments_room_id_fkey', 'room_id', 'rooms', 'room_id');
    END IF;
END $$;

-- 6. skolrread_sessions (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'skolrread_sessions') THEN
        PERFORM fix_cascade_constraint('skolrread_sessions', 'skolrread_sessions_room_id_fkey', 'room_id', 'rooms', 'room_id');
    END IF;
END $$;

-- 7. skolr_read_sessions (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'skolr_read_sessions') THEN
        PERFORM fix_cascade_constraint('skolr_read_sessions', 'skolr_read_sessions_room_id_fkey', 'room_id', 'rooms', 'room_id');
    END IF;
END $$;

-- 8. student_assessments (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_assessments') THEN
        PERFORM fix_cascade_constraint('student_assessments', 'student_assessments_room_id_fkey', 'room_id', 'rooms', 'room_id');
    END IF;
END $$;

-- 9. Any other tables that might have been added
-- This query will find and fix ALL foreign key constraints pointing to rooms table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT DISTINCT
            tc.table_name,
            tc.constraint_name,
            kcu.column_name,
            rc.delete_rule
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
            AND ccu.column_name = 'room_id'
            AND tc.table_schema = 'public'
            AND rc.delete_rule != 'CASCADE'
    LOOP
        RAISE NOTICE 'Fixing constraint % on table % (current rule: %)', r.constraint_name, r.table_name, r.delete_rule;
        PERFORM fix_cascade_constraint(r.table_name, r.constraint_name, r.column_name, 'rooms', 'room_id');
    END LOOP;
END $$;

-- Clean up the temporary function
DROP FUNCTION IF EXISTS fix_cascade_constraint(text, text, text, text, text);

-- Verify the constraints are fixed
DO $$
DECLARE
    non_cascade_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO non_cascade_count
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
        AND rc.delete_rule != 'CASCADE';
    
    IF non_cascade_count > 0 THEN
        RAISE WARNING 'Found % foreign key constraints still not using CASCADE delete rule', non_cascade_count;
    ELSE
        RAISE NOTICE 'All foreign key constraints to rooms table now use CASCADE delete rule';
    END IF;
END $$;