-- Ensure RLS policies don't prevent room deletion

-- Drop any existing DELETE policies on rooms table that might be too restrictive
DROP POLICY IF EXISTS "Teachers can delete their own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Only teachers can delete rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can delete their own rooms" ON public.rooms;

-- Create a proper DELETE policy for rooms
CREATE POLICY "Teachers can delete their own rooms"
ON public.rooms
FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

-- Ensure teachers can also delete related data (this helps with cascading)
-- Note: These policies might already exist, so we use IF NOT EXISTS pattern

-- Allow teachers to delete room_chatbots for their rooms
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'room_chatbots' 
        AND policyname = 'Teachers can delete room chatbot associations'
    ) THEN
        CREATE POLICY "Teachers can delete room chatbot associations"
        ON public.room_chatbots
        FOR DELETE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.rooms
                WHERE rooms.room_id = room_chatbots.room_id
                AND rooms.teacher_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Allow teachers to delete room_memberships for their rooms
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'room_memberships' 
        AND policyname = 'Teachers can delete room memberships'
    ) THEN
        CREATE POLICY "Teachers can delete room memberships"
        ON public.room_memberships
        FOR DELETE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.rooms
                WHERE rooms.room_id = room_memberships.room_id
                AND rooms.teacher_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Allow teachers to delete chat_messages for their rooms
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chat_messages' 
        AND policyname = 'Teachers can delete chat messages in their rooms'
    ) THEN
        CREATE POLICY "Teachers can delete chat messages in their rooms"
        ON public.chat_messages
        FOR DELETE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.rooms
                WHERE rooms.room_id = chat_messages.room_id
                AND rooms.teacher_id = auth.uid()
            )
        );
    END IF;
END $$;