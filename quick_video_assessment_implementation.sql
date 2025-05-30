-- Quick implementation for video-to-assessment transition
-- This allows linking a viewing room bot to an assessment bot

-- Step 1: Add linked assessment bot field to chatbots table
ALTER TABLE public.chatbots
ADD COLUMN IF NOT EXISTS linked_assessment_bot_id UUID REFERENCES public.chatbots(chatbot_id),
ADD COLUMN IF NOT EXISTS assessment_trigger_type VARCHAR(50) DEFAULT 'video_complete';

-- Step 2: Add constraint to ensure only viewing_room bots can have linked assessments
ALTER TABLE public.chatbots
ADD CONSTRAINT check_linked_assessment_valid 
CHECK (
    (bot_type = 'viewing_room' AND linked_assessment_bot_id IS NOT NULL) OR
    (bot_type != 'viewing_room' AND linked_assessment_bot_id IS NULL) OR
    linked_assessment_bot_id IS NULL
);

-- Step 3: Create video progress tracking table
CREATE TABLE IF NOT EXISTS public.student_video_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(room_id) ON DELETE CASCADE,
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(chatbot_id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    video_duration INTEGER, -- seconds
    watch_time INTEGER DEFAULT 0, -- seconds watched
    percentage_complete DECIMAL(5,2) DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, room_id, chatbot_id)
);

-- Step 4: Add RLS policies for video progress
ALTER TABLE public.student_video_progress ENABLE ROW LEVEL SECURITY;

-- Students can read and update their own progress
CREATE POLICY "Students can manage own video progress" ON public.student_video_progress
    FOR ALL USING (auth.uid() = student_id);

-- Teachers can view progress for their rooms
CREATE POLICY "Teachers can view video progress" ON public.student_video_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rooms r
            WHERE r.room_id = student_video_progress.room_id
            AND r.teacher_id = auth.uid()
        )
    );

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_progress_student_room 
ON public.student_video_progress(student_id, room_id);

CREATE INDEX IF NOT EXISTS idx_video_progress_completion 
ON public.student_video_progress(percentage_complete)
WHERE percentage_complete >= 90;

-- Step 6: Add helper function to check if student completed video
CREATE OR REPLACE FUNCTION check_video_completion(
    p_student_id UUID,
    p_room_id UUID,
    p_chatbot_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.student_video_progress
        WHERE student_id = p_student_id
        AND room_id = p_room_id
        AND chatbot_id = p_chatbot_id
        AND percentage_complete >= 90
    );
END;
$$ LANGUAGE plpgsql;

-- Example: Link an existing viewing room bot to an assessment bot
-- UPDATE public.chatbots 
-- SET linked_assessment_bot_id = 'assessment-bot-uuid-here'
-- WHERE chatbot_id = 'viewing-room-bot-uuid-here';