-- Add safety_notifications table to Supabase realtime publication
-- This is the ONLY change needed to enable realtime for safety notifications

-- Add safety_notifications table to publication without removing first
-- This is more compatible with different versions of PostgreSQL
-- Omitting "DROP TABLE IF EXISTS" which can cause issues
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_notifications;