-- Migration to add safety analytics table
-- This table tracks safety message generation and interactions for monitoring effectiveness

-- Create the safety_analytics table
CREATE TABLE IF NOT EXISTS public.safety_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    student_id UUID NOT NULL,
    room_id UUID,
    event_type TEXT NOT NULL,
    concern_type TEXT,
    country_code TEXT,
    interaction_type TEXT,
    helpline_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- References
    FOREIGN KEY (student_id) REFERENCES public.profiles(user_id),
    FOREIGN KEY (message_id) REFERENCES public.chat_messages(message_id)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS safety_analytics_message_id_idx ON public.safety_analytics(message_id);
CREATE INDEX IF NOT EXISTS safety_analytics_student_id_idx ON public.safety_analytics(student_id);
CREATE INDEX IF NOT EXISTS safety_analytics_event_type_idx ON public.safety_analytics(event_type);
CREATE INDEX IF NOT EXISTS safety_analytics_created_at_idx ON public.safety_analytics(created_at);

-- Add RLS policies
ALTER TABLE public.safety_analytics ENABLE ROW LEVEL SECURITY;

-- Only system access (admin/service roles)
CREATE POLICY safety_analytics_system_read_policy ON public.safety_analytics
    FOR SELECT USING (
        (auth.jwt() ->> 'role' = 'service_role') OR 
        (auth.jwt() ->> 'role' = 'supabase_admin')
    );

CREATE POLICY safety_analytics_system_insert_policy ON public.safety_analytics
    FOR INSERT WITH CHECK (
        (auth.jwt() ->> 'role' = 'service_role') OR 
        (auth.jwt() ->> 'role' = 'supabase_admin')
    );

-- Allow teachers to see safety analytics for their rooms
CREATE POLICY safety_analytics_teacher_read_policy ON public.safety_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rooms
            WHERE rooms.room_id = safety_analytics.room_id
            AND rooms.teacher_id = auth.uid()
        )
    );

-- Comments for documentation
COMMENT ON TABLE public.safety_analytics IS 'Tracks safety message generation and student interactions for analytics purposes';
COMMENT ON COLUMN public.safety_analytics.event_type IS 'Type of event (safety_message_shown, safety_message_interaction)';
COMMENT ON COLUMN public.safety_analytics.concern_type IS 'Type of concern that triggered the safety message (e.g., self_harm, bullying)';
COMMENT ON COLUMN public.safety_analytics.country_code IS 'Country code used for helpline selection';
COMMENT ON COLUMN public.safety_analytics.interaction_type IS 'For interactions, the type (e.g., click, copy, expand)';
COMMENT ON COLUMN public.safety_analytics.helpline_name IS 'For interactions, the specific helpline interacted with';