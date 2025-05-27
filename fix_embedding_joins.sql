-- Fix the embedding joins issue by ensuring proper RLS policies

-- 1. Enable RLS on student_profiles and teacher_profiles if not already enabled
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for student_profiles to allow joins from other tables
-- Allow authenticated users to read student profiles when joined from room_student_associations
CREATE POLICY "Allow reading student profiles for room associations" ON student_profiles
    FOR SELECT
    USING (true); -- This allows any authenticated user to read student profiles when needed for joins

-- 3. Create policies for teacher_profiles
CREATE POLICY "Allow reading teacher profiles for joins" ON teacher_profiles
    FOR SELECT  
    USING (true); -- This allows any authenticated user to read teacher profiles when needed for joins

-- 4. Ensure proper policies on room_student_associations
CREATE POLICY "Teachers can read their room associations" ON room_student_associations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM rooms
            WHERE rooms.room_id = room_student_associations.room_id
            AND rooms.teacher_id = auth.uid()
        )
    );

-- 5. Ensure proper policies on student_assessments
CREATE POLICY "Teachers can read assessments in their rooms" ON student_assessments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM rooms
            WHERE rooms.room_id = student_assessments.room_id
            AND rooms.teacher_id = auth.uid()
        )
    );

-- 6. Add explicit foreign key relationships if missing
-- Note: These might already exist, so we'll use IF NOT EXISTS where possible

-- For room_student_associations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'room_student_associations_student_profiles_fkey'
    ) THEN
        ALTER TABLE room_student_associations
        ADD CONSTRAINT room_student_associations_student_profiles_fkey
        FOREIGN KEY (student_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- For student_assessments  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'student_assessments_student_profiles_fkey'
    ) THEN
        ALTER TABLE student_assessments
        ADD CONSTRAINT student_assessments_student_profiles_fkey
        FOREIGN KEY (student_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- 7. Grant necessary permissions
GRANT SELECT ON student_profiles TO authenticated;
GRANT SELECT ON teacher_profiles TO authenticated;

-- 8. Create indexes for better join performance
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id ON teacher_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_room_student_associations_student_id ON room_student_associations(student_id);
CREATE INDEX IF NOT EXISTS idx_room_student_associations_room_id ON room_student_associations(room_id);
CREATE INDEX IF NOT EXISTS idx_student_assessments_student_id ON student_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_assessments_room_id ON student_assessments(room_id);