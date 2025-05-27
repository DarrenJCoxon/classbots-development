-- Create RLS policies to fix the embedding queries issue

-- 1. Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for student profiles" ON student_profiles;
DROP POLICY IF EXISTS "Public read access for teacher profiles" ON teacher_profiles;
DROP POLICY IF EXISTS "Allow reading student profiles for room associations" ON student_profiles;
DROP POLICY IF EXISTS "Allow reading teacher profiles for joins" ON teacher_profiles;

-- 2. Create new policies that allow reading profiles for joins
-- For student_profiles
CREATE POLICY "Enable read access for all users" ON student_profiles
    FOR SELECT
    USING (true);

-- For teacher_profiles  
CREATE POLICY "Enable read access for all users" ON teacher_profiles
    FOR SELECT
    USING (true);

-- 3. Ensure RLS is enabled
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Check if we need to add any missing indexes
CREATE INDEX IF NOT EXISTS idx_room_student_associations_student_id ON room_student_associations(student_id);
CREATE INDEX IF NOT EXISTS idx_room_student_associations_room_id ON room_student_associations(room_id);
CREATE INDEX IF NOT EXISTS idx_student_assessments_student_id ON student_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_assessments_room_id ON student_assessments(room_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id ON teacher_profiles(user_id);