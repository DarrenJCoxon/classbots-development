-- Create a safety_notifications table to track notifications
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

-- Add RLS policies for the safety_notifications table
ALTER TABLE public.safety_notifications ENABLE ROW LEVEL SECURITY;

-- Allow students to read their own notifications
CREATE POLICY student_read_own_notifications ON public.safety_notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Add index for faster lookups
CREATE INDEX safety_notifications_user_id_idx ON public.safety_notifications(user_id);
CREATE INDEX safety_notifications_delivered_idx ON public.safety_notifications(is_delivered);
CREATE INDEX safety_notifications_created_at_idx ON public.safety_notifications(created_at);

-- Setting up a function that will poll for undelivered notifications
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

-- Create a trigger to update the delivery timestamp
CREATE TRIGGER update_notification_delivery_trigger
BEFORE UPDATE ON public.safety_notifications
FOR EACH ROW
EXECUTE FUNCTION update_notification_delivery();
