-- Fix cascade deletes for room-related tables

-- Drop existing foreign key constraints and recreate with CASCADE
-- This ensures that when a room is deleted, all related data is also deleted

-- 1. Fix room_chatbots table
ALTER TABLE public.room_chatbots
  DROP CONSTRAINT IF EXISTS room_chatbots_room_id_fkey;

ALTER TABLE public.room_chatbots
  ADD CONSTRAINT room_chatbots_room_id_fkey
  FOREIGN KEY (room_id)
  REFERENCES public.rooms(room_id)
  ON DELETE CASCADE;

-- 2. Fix room_memberships table (student assignments)
ALTER TABLE public.room_memberships
  DROP CONSTRAINT IF EXISTS room_memberships_room_id_fkey;

ALTER TABLE public.room_memberships
  ADD CONSTRAINT room_memberships_room_id_fkey
  FOREIGN KEY (room_id)
  REFERENCES public.rooms(room_id)
  ON DELETE CASCADE;

-- 3. Fix chat_messages table
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_room_id_fkey;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_room_id_fkey
  FOREIGN KEY (room_id)
  REFERENCES public.rooms(room_id)
  ON DELETE CASCADE;

-- 4. Fix chat_instances table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_instances') THEN
    ALTER TABLE public.chat_instances
      DROP CONSTRAINT IF EXISTS chat_instances_room_id_fkey;
    
    ALTER TABLE public.chat_instances
      ADD CONSTRAINT chat_instances_room_id_fkey
      FOREIGN KEY (room_id)
      REFERENCES public.rooms(room_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Fix assessments table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessments') THEN
    ALTER TABLE public.assessments
      DROP CONSTRAINT IF EXISTS assessments_room_id_fkey;
    
    ALTER TABLE public.assessments
      ADD CONSTRAINT assessments_room_id_fkey
      FOREIGN KEY (room_id)
      REFERENCES public.rooms(room_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Fix skolrread_sessions table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skolrread_sessions') THEN
    ALTER TABLE public.skolrread_sessions
      DROP CONSTRAINT IF EXISTS skolrread_sessions_room_id_fkey;
    
    ALTER TABLE public.skolrread_sessions
      ADD CONSTRAINT skolrread_sessions_room_id_fkey
      FOREIGN KEY (room_id)
      REFERENCES public.rooms(room_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 7. Fix skolr_read_sessions table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skolr_read_sessions') THEN
    ALTER TABLE public.skolr_read_sessions
      DROP CONSTRAINT IF EXISTS skolr_read_sessions_room_id_fkey;
    
    ALTER TABLE public.skolr_read_sessions
      ADD CONSTRAINT skolr_read_sessions_room_id_fkey
      FOREIGN KEY (room_id)
      REFERENCES public.rooms(room_id)
      ON DELETE CASCADE;
  END IF;
END $$;