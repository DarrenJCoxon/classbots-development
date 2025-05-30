-- Migration: Add archive functionality
-- This adds is_archived column to relevant tables and fixes the archiving behavior

-- Add is_archived column to the rooms table
ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add index for easier filtering
CREATE INDEX IF NOT EXISTS idx_rooms_is_archived ON public.rooms(is_archived);

-- Add is_archived column to the room_memberships table 
ALTER TABLE public.room_memberships
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add index for easier filtering
CREATE INDEX IF NOT EXISTS idx_room_memberships_is_archived ON public.room_memberships(is_archived);

-- Update Row Level Security (RLS) policies to account for archived status
-- For the rooms table
-- First, drop existing policies that might need updating
DROP POLICY IF EXISTS "Teachers can see their own rooms" ON public.rooms;
CREATE POLICY "Teachers can see their own rooms" ON public.rooms
    FOR SELECT
    TO authenticated
    USING (
        (auth.uid() = teacher_id)
    );

-- For room memberships, modify policies to include is_archived
DROP POLICY IF EXISTS "Teachers can see memberships for their rooms" ON public.room_memberships;
CREATE POLICY "Teachers can see memberships for their rooms" ON public.room_memberships
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT teacher_id FROM public.rooms WHERE room_id = room_memberships.room_id
        )
    );

-- Students should only see active memberships (not archived)
DROP POLICY IF EXISTS "Students can see their own active memberships" ON public.room_memberships;
CREATE POLICY "Students can see their own active memberships" ON public.room_memberships
    FOR SELECT
    TO authenticated
    USING (
        (auth.uid() = student_id) AND (is_archived = false)
    );