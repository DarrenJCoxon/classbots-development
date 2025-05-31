-- Apply courses migration
-- Run this file in Supabase SQL editor to create the courses tables

-- Create courses feature tables
-- This migration adds support for video-based courses

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    course_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teacher_profiles(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    year_group VARCHAR(50),
    is_published BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT courses_title_length CHECK (char_length(title) >= 3)
);

-- Create course_lessons table
CREATE TABLE IF NOT EXISTS course_lessons (
    lesson_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    video_platform VARCHAR(50), -- 'youtube', 'vimeo', 'loom'
    video_duration INTEGER, -- duration in seconds
    lesson_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT course_lessons_title_length CHECK (char_length(title) >= 3),
    CONSTRAINT course_lessons_order_positive CHECK (lesson_order > 0),
    CONSTRAINT course_lessons_unique_order UNIQUE (course_id, lesson_order)
);

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
    enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT course_enrollments_unique UNIQUE (course_id, student_id)
);

-- Create lesson_progress table
CREATE TABLE IF NOT EXISTS lesson_progress (
    progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES course_lessons(lesson_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
    watch_time INTEGER DEFAULT 0, -- seconds watched
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_position INTEGER DEFAULT 0, -- last video position in seconds
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT lesson_progress_unique UNIQUE (enrollment_id, lesson_id),
    CONSTRAINT lesson_progress_watch_time_positive CHECK (watch_time >= 0),
    CONSTRAINT lesson_progress_last_position_positive CHECK (last_position >= 0)
);

-- Create indexes for performance
CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX idx_courses_is_published ON courses(is_published) WHERE is_published = true;
CREATE INDEX idx_courses_is_active ON courses(is_active) WHERE is_active = true;

CREATE INDEX idx_course_lessons_course_id ON course_lessons(course_id);
CREATE INDEX idx_course_lessons_order ON course_lessons(course_id, lesson_order);

CREATE INDEX idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX idx_course_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX idx_course_enrollments_active ON course_enrollments(is_active) WHERE is_active = true;

CREATE INDEX idx_lesson_progress_enrollment_id ON lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_student_id ON lesson_progress(student_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_lessons_updated_at BEFORE UPDATE ON course_lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- Courses policies
-- Teachers can view all published courses or their own courses
CREATE POLICY "Teachers can view all published courses or their own" ON courses
    FOR SELECT TO authenticated
    USING (
        is_published = true OR 
        teacher_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM teacher_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Teachers can insert their own courses
CREATE POLICY "Teachers can create their own courses" ON courses
    FOR INSERT TO authenticated
    WITH CHECK (
        teacher_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM teacher_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Teachers can update their own courses
CREATE POLICY "Teachers can update their own courses" ON courses
    FOR UPDATE TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- Teachers can delete their own courses
CREATE POLICY "Teachers can delete their own courses" ON courses
    FOR DELETE TO authenticated
    USING (teacher_id = auth.uid());

-- Students can view published courses they're enrolled in
CREATE POLICY "Students can view enrolled courses" ON courses
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            JOIN student_profiles sp ON sp.user_id = auth.uid()
            WHERE ce.course_id = courses.course_id
            AND ce.student_id = auth.uid()
            AND ce.is_active = true
        )
    );

-- Course lessons policies
-- Anyone can view lessons for published courses or teachers can view their own
CREATE POLICY "View lessons for accessible courses" ON course_lessons
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.course_id = course_lessons.course_id
            AND (
                c.is_published = true OR 
                c.teacher_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM course_enrollments ce
                    WHERE ce.course_id = c.course_id
                    AND ce.student_id = auth.uid()
                    AND ce.is_active = true
                )
            )
        )
    );

-- Teachers can manage lessons for their courses
CREATE POLICY "Teachers can insert lessons for their courses" ON course_lessons
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.course_id = course_lessons.course_id
            AND c.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update lessons for their courses" ON course_lessons
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.course_id = course_lessons.course_id
            AND c.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.course_id = course_lessons.course_id
            AND c.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete lessons for their courses" ON course_lessons
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.course_id = course_lessons.course_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Course enrollments policies
-- Students can view their own enrollments
CREATE POLICY "Students can view their enrollments" ON course_enrollments
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

-- Students can enroll themselves in published courses
CREATE POLICY "Students can enroll in published courses" ON course_enrollments
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM student_profiles 
            WHERE user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.course_id = course_enrollments.course_id
            AND c.is_published = true
            AND c.is_active = true
        )
    );

-- Teachers can view enrollments for their courses
CREATE POLICY "Teachers can view enrollments for their courses" ON course_enrollments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.course_id = course_enrollments.course_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Lesson progress policies
-- Students can manage their own progress
CREATE POLICY "Students can view their progress" ON lesson_progress
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "Students can update their progress" ON lesson_progress
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their progress records" ON lesson_progress
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- Teachers can view progress for their courses
CREATE POLICY "Teachers can view progress for their courses" ON lesson_progress
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM course_lessons cl
            JOIN courses c ON c.course_id = cl.course_id
            WHERE cl.lesson_id = lesson_progress.lesson_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Create view for course statistics
CREATE OR REPLACE VIEW course_stats AS
SELECT 
    c.course_id,
    c.teacher_id,
    c.title,
    c.is_published,
    COUNT(DISTINCT cl.lesson_id) as lesson_count,
    COUNT(DISTINCT ce.student_id) as student_count,
    COUNT(DISTINCT CASE WHEN ce.completed_at IS NOT NULL THEN ce.student_id END) as completed_count
FROM courses c
LEFT JOIN course_lessons cl ON cl.course_id = c.course_id AND cl.is_active = true
LEFT JOIN course_enrollments ce ON ce.course_id = c.course_id AND ce.is_active = true
GROUP BY c.course_id, c.teacher_id, c.title, c.is_published;

-- Grant permissions on the view
GRANT SELECT ON course_stats TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE courses IS 'Stores video courses created by teachers';
COMMENT ON TABLE course_lessons IS 'Individual video lessons within a course';
COMMENT ON TABLE course_enrollments IS 'Tracks which students are enrolled in which courses';
COMMENT ON TABLE lesson_progress IS 'Tracks student progress through video lessons';
COMMENT ON VIEW course_stats IS 'Aggregated statistics for courses';

-- Verify the tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('courses', 'course_lessons', 'course_enrollments', 'lesson_progress')
ORDER BY table_name;

-- Verify the view was created
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public' 
AND table_name = 'course_stats';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('courses', 'course_lessons', 'course_enrollments', 'lesson_progress');

-- List all policies created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('courses', 'course_lessons', 'course_enrollments', 'lesson_progress')
ORDER BY tablename, policyname;