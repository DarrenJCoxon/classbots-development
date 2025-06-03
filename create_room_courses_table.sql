-- Create room_courses table for course assignments to classrooms
-- This follows the same pattern as room_chatbots table

-- Create the room_courses junction table
CREATE TABLE room_courses (
    room_id UUID NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id),
    
    PRIMARY KEY (room_id, course_id)
);

-- Create indexes for performance
CREATE INDEX idx_room_courses_room_id ON room_courses(room_id);
CREATE INDEX idx_room_courses_course_id ON room_courses(course_id);
CREATE INDEX idx_room_courses_assigned_by ON room_courses(assigned_by);

-- Enable Row Level Security
ALTER TABLE room_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can only manage course assignments for their own rooms
CREATE POLICY room_courses_teacher_policy ON room_courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rooms 
            WHERE room_id = room_courses.room_id 
            AND teacher_id = auth.uid()
        )
    );

-- RLS Policy: Students can view course assignments for rooms they're members of
CREATE POLICY room_courses_student_view ON room_courses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM room_memberships 
            WHERE room_id = room_courses.room_id 
            AND student_id = auth.uid()
        )
    );

-- Add helpful comments
COMMENT ON TABLE room_courses IS 'Junction table linking courses to classroom rooms - follows same pattern as room_chatbots';
COMMENT ON COLUMN room_courses.assigned_at IS 'When the course was assigned to the room';
COMMENT ON COLUMN room_courses.assigned_by IS 'Which teacher assigned the course to the room';