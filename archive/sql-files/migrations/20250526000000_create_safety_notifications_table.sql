-- Create safety_notifications table for tracking safety messages
CREATE TABLE IF NOT EXISTS public.safety_notifications (
    notification_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES public.chat_messages(message_id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(room_id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL DEFAULT 'safety_message',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_safety_notifications_user_id ON public.safety_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_notifications_room_id ON public.safety_notifications(room_id);
CREATE INDEX IF NOT EXISTS idx_safety_notifications_message_id ON public.safety_notifications(message_id);
CREATE INDEX IF NOT EXISTS idx_safety_notifications_created_at ON public.safety_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.safety_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own notifications
CREATE POLICY "Users can read their own safety notifications"
ON public.safety_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Teachers can read notifications for students in their rooms
CREATE POLICY "Teachers can read safety notifications in their rooms"
ON public.safety_notifications
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.rooms
        WHERE rooms.room_id = safety_notifications.room_id
        AND rooms.teacher_id = auth.uid()
    )
);

-- System can insert notifications (using service role)
CREATE POLICY "System can insert safety notifications"
ON public.safety_notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_notifications;

-- Add comment
COMMENT ON TABLE public.safety_notifications IS 'Tracks safety messages sent to students as a fallback notification system';