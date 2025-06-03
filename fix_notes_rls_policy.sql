-- Fix RLS policy for premium_lesson_notes to allow teachers
-- Drop the existing policy and create a new one

DROP POLICY IF EXISTS premium_notes_policy ON premium_lesson_notes;

-- Create new policy that allows both students (via enrollment) and teachers (via course ownership)
CREATE POLICY premium_notes_policy ON premium_lesson_notes
    FOR ALL USING (
        -- Allow if user has enrollment for this lesson's course
        EXISTS (
            SELECT 1 FROM premium_course_enrollments 
            WHERE enrollment_id = premium_lesson_notes.enrollment_id 
            AND student_id = auth.uid()
        )
        OR
        -- Allow if user is the teacher of this lesson's course
        EXISTS (
            SELECT 1 FROM premium_course_lessons pcl
            JOIN premium_courses pc ON pc.course_id = pcl.course_id
            WHERE pcl.lesson_id = premium_lesson_notes.lesson_id
            AND pc.teacher_id = auth.uid()
        )
    );

-- Also ensure the table allows NULL enrollment_id for teacher notes
-- (This may already be set, but making sure)
ALTER TABLE premium_lesson_notes 
ALTER COLUMN enrollment_id DROP NOT NULL;