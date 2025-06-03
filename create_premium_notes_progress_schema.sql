-- Premium Course Notes and Progress Database Schema
-- This script creates the necessary tables for lesson notes and progress tracking

-- Create premium_lesson_notes table
CREATE TABLE IF NOT EXISTS premium_lesson_notes (
    note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL,
    student_id UUID NOT NULL,
    enrollment_id UUID NOT NULL,
    
    -- Note content and metadata
    content TEXT NOT NULL,
    note_type VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (note_type IN ('general', 'timestamp', 'question', 'highlight')),
    
    -- For timestamp-based notes (linked to video position)
    video_timestamp INTEGER NULL, -- in seconds
    
    -- For highlighting text content
    content_selection JSONB NULL, -- {start: number, end: number, text: string}
    
    -- Note settings
    is_private BOOLEAN NOT NULL DEFAULT true,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_note_lesson FOREIGN KEY (lesson_id) REFERENCES premium_course_lessons(lesson_id) ON DELETE CASCADE,
    CONSTRAINT fk_note_student FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_note_enrollment FOREIGN KEY (enrollment_id) REFERENCES premium_course_enrollments(enrollment_id) ON DELETE CASCADE
);

-- Create premium_lesson_progress table
CREATE TABLE IF NOT EXISTS premium_lesson_progress (
    progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL,
    student_id UUID NOT NULL,
    enrollment_id UUID NOT NULL,
    
    -- Progress metrics
    is_completed BOOLEAN NOT NULL DEFAULT false,
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    watch_time_seconds INTEGER NOT NULL DEFAULT 0 CHECK (watch_time_seconds >= 0),
    
    -- Video-specific tracking
    video_position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (video_position_seconds >= 0),
    video_segments_watched JSONB NULL, -- Array of {start: number, end: number}
    playback_speed DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (playback_speed > 0 AND playback_speed <= 3.0),
    
    -- Engagement metrics
    rewatch_count INTEGER NOT NULL DEFAULT 0 CHECK (rewatch_count >= 0),
    notes_count INTEGER NOT NULL DEFAULT 0 CHECK (notes_count >= 0),
    questions_asked INTEGER NOT NULL DEFAULT 0 CHECK (questions_asked >= 0),
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_progress_lesson FOREIGN KEY (lesson_id) REFERENCES premium_course_lessons(lesson_id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_student FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_enrollment FOREIGN KEY (enrollment_id) REFERENCES premium_course_enrollments(enrollment_id) ON DELETE CASCADE,
    
    -- Unique constraint - one progress record per student per lesson
    CONSTRAINT unique_student_lesson_progress UNIQUE (lesson_id, student_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_premium_lesson_notes_lesson_id ON premium_lesson_notes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_premium_lesson_notes_student_id ON premium_lesson_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_premium_lesson_notes_enrollment_id ON premium_lesson_notes(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_premium_lesson_notes_created_at ON premium_lesson_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_premium_lesson_notes_pinned ON premium_lesson_notes(is_pinned) WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_premium_lesson_progress_lesson_id ON premium_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_premium_lesson_progress_student_id ON premium_lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_premium_lesson_progress_enrollment_id ON premium_lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_premium_lesson_progress_completed ON premium_lesson_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_premium_lesson_progress_last_accessed ON premium_lesson_progress(last_accessed DESC);

-- Create function to automatically update notes_count in progress when notes are added/removed
CREATE OR REPLACE FUNCTION update_notes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment notes count
        UPDATE premium_lesson_progress 
        SET notes_count = notes_count + 1,
            last_accessed = NOW()
        WHERE lesson_id = NEW.lesson_id AND student_id = NEW.student_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement notes count
        UPDATE premium_lesson_progress 
        SET notes_count = GREATEST(notes_count - 1, 0),
            last_accessed = NOW()
        WHERE lesson_id = OLD.lesson_id AND student_id = OLD.student_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update notes count
DROP TRIGGER IF EXISTS trigger_update_notes_count_insert ON premium_lesson_notes;
CREATE TRIGGER trigger_update_notes_count_insert
    AFTER INSERT ON premium_lesson_notes
    FOR EACH ROW EXECUTE FUNCTION update_notes_count();

DROP TRIGGER IF EXISTS trigger_update_notes_count_delete ON premium_lesson_notes;
CREATE TRIGGER trigger_update_notes_count_delete
    AFTER DELETE ON premium_lesson_notes
    FOR EACH ROW EXECUTE FUNCTION update_notes_count();

-- Create function to update updated_at timestamp for notes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at for notes
DROP TRIGGER IF EXISTS trigger_update_notes_updated_at ON premium_lesson_notes;
CREATE TRIGGER trigger_update_notes_updated_at
    BEFORE UPDATE ON premium_lesson_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update last_accessed for progress
DROP TRIGGER IF EXISTS trigger_update_progress_last_accessed ON premium_lesson_progress;
CREATE TRIGGER trigger_update_progress_last_accessed
    BEFORE UPDATE ON premium_lesson_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE premium_lesson_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for premium_lesson_notes

-- Students can only see their own notes
CREATE POLICY "Students can view own notes" ON premium_lesson_notes
    FOR SELECT USING (auth.uid() = student_id);

-- Students can insert their own notes
CREATE POLICY "Students can insert own notes" ON premium_lesson_notes
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can update their own notes
CREATE POLICY "Students can update own notes" ON premium_lesson_notes
    FOR UPDATE USING (auth.uid() = student_id);

-- Students can delete their own notes
CREATE POLICY "Students can delete own notes" ON premium_lesson_notes
    FOR DELETE USING (auth.uid() = student_id);

-- Teachers can view all notes for their lessons
CREATE POLICY "Teachers can view lesson notes" ON premium_lesson_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM premium_course_lessons pcl
            JOIN premium_courses pc ON pcl.course_id = pc.course_id
            WHERE pcl.lesson_id = premium_lesson_notes.lesson_id
            AND pc.teacher_id = auth.uid()
        )
    );

-- RLS Policies for premium_lesson_progress

-- Students can view their own progress
CREATE POLICY "Students can view own progress" ON premium_lesson_progress
    FOR SELECT USING (auth.uid() = student_id);

-- Students can insert/update their own progress
CREATE POLICY "Students can manage own progress" ON premium_lesson_progress
    FOR ALL USING (auth.uid() = student_id);

-- Teachers can view progress for their lessons
CREATE POLICY "Teachers can view lesson progress" ON premium_lesson_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM premium_course_lessons pcl
            JOIN premium_courses pc ON pcl.course_id = pc.course_id
            WHERE pcl.lesson_id = premium_lesson_progress.lesson_id
            AND pc.teacher_id = auth.uid()
        )
    );

-- Create helper functions for API convenience
CREATE OR REPLACE FUNCTION increment_notes_count(p_lesson_id UUID, p_student_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE premium_lesson_progress 
    SET notes_count = notes_count + 1,
        last_accessed = NOW()
    WHERE lesson_id = p_lesson_id AND student_id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_notes_count(p_lesson_id UUID, p_student_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE premium_lesson_progress 
    SET notes_count = GREATEST(notes_count - 1, 0),
        last_accessed = NOW()
    WHERE lesson_id = p_lesson_id AND student_id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON premium_lesson_notes TO authenticated;
GRANT ALL ON premium_lesson_progress TO authenticated;
GRANT EXECUTE ON FUNCTION increment_notes_count(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_notes_count(UUID, UUID) TO authenticated;

-- Insert some sample data for testing (optional)
-- You can uncomment and modify these if you have existing lesson and enrollment data
/*
-- Sample note (replace UUIDs with actual values from your database)
INSERT INTO premium_lesson_notes (
    lesson_id,
    student_id,
    enrollment_id,
    content,
    note_type,
    video_timestamp
) VALUES (
    'your-lesson-uuid-here',
    'your-student-uuid-here',
    'your-enrollment-uuid-here',
    'This is a sample note taken at 2 minutes into the video.',
    'timestamp',
    120
);

-- Sample progress record
INSERT INTO premium_lesson_progress (
    lesson_id,
    student_id,
    enrollment_id,
    progress_percentage,
    watch_time_seconds,
    video_position_seconds
) VALUES (
    'your-lesson-uuid-here',
    'your-student-uuid-here',
    'your-enrollment-uuid-here',
    45,
    300,
    540
) ON CONFLICT (lesson_id, student_id) DO UPDATE SET
    progress_percentage = EXCLUDED.progress_percentage,
    watch_time_seconds = EXCLUDED.watch_time_seconds,
    video_position_seconds = EXCLUDED.video_position_seconds,
    last_accessed = NOW();
*/

-- Verify tables were created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('premium_lesson_notes', 'premium_lesson_progress')
ORDER BY tablename;