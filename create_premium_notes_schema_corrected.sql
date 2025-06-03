-- Premium Lesson Notes Schema (Corrected)
-- This creates the notes table that matches the existing premium courses schema structure

-- Premium Lesson Notes Table
-- Following the same pattern as premium_lesson_progress table
CREATE TABLE premium_lesson_notes (
    note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES premium_course_enrollments(enrollment_id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES premium_course_lessons(lesson_id) ON DELETE CASCADE,
    
    -- Note content
    note_content TEXT NOT NULL,
    video_timestamp INTEGER, -- Position in video when note was taken (seconds)
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_premium_notes_enrollment ON premium_lesson_notes(enrollment_id);
CREATE INDEX idx_premium_notes_lesson ON premium_lesson_notes(lesson_id);
CREATE INDEX idx_premium_notes_timestamp ON premium_lesson_notes(video_timestamp);

-- Row Level Security (RLS)
ALTER TABLE premium_lesson_notes ENABLE ROW LEVEL SECURITY;

-- Notes policies - students can only access their own notes
CREATE POLICY premium_notes_policy ON premium_lesson_notes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM premium_course_enrollments 
            WHERE enrollment_id = premium_lesson_notes.enrollment_id 
            AND student_id = auth.uid()
        )
    );

-- Updated timestamp trigger
CREATE TRIGGER premium_notes_updated_at 
    BEFORE UPDATE ON premium_lesson_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update notes count in progress table
CREATE OR REPLACE FUNCTION update_notes_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update notes count in the progress table
    UPDATE premium_lesson_progress 
    SET notes_count = (
        SELECT COUNT(*) 
        FROM premium_lesson_notes 
        WHERE enrollment_id = COALESCE(NEW.enrollment_id, OLD.enrollment_id)
        AND lesson_id = COALESCE(NEW.lesson_id, OLD.lesson_id)
    )
    WHERE enrollment_id = COALESCE(NEW.enrollment_id, OLD.enrollment_id)
    AND lesson_id = COALESCE(NEW.lesson_id, OLD.lesson_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update notes count
CREATE TRIGGER premium_notes_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON premium_lesson_notes
    FOR EACH ROW EXECUTE FUNCTION update_notes_count();

COMMENT ON TABLE premium_lesson_notes IS 'Student notes for premium course lessons with video timestamp support';