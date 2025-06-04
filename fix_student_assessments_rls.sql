-- First, check if RLS is enabled on student_assessments
SELECT 
    relname,
    relrowsecurity,
    relforcerowsecurity
FROM 
    pg_class
WHERE 
    relname = 'student_assessments';

-- Check existing RLS policies
SELECT 
    pol.polname AS policy_name,
    pol.polcmd AS command,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command_type,
    pol.polroles::regrole[] AS roles,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM 
    pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE 
    cls.relname = 'student_assessments';

-- Enable RLS on student_assessments if not already enabled
ALTER TABLE student_assessments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Students can view their own assessments" ON student_assessments;
DROP POLICY IF EXISTS "Teachers can view assessments for their students" ON student_assessments;
DROP POLICY IF EXISTS "Service role can do everything" ON student_assessments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON student_assessments;
DROP POLICY IF EXISTS "Enable update for teachers" ON student_assessments;

-- Create comprehensive RLS policies

-- 1. Service role bypass (for admin operations)
CREATE POLICY "Service role bypass" ON student_assessments
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Students can view their own assessments
CREATE POLICY "Students view own assessments" ON student_assessments
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id
    );

-- 3. Teachers can view assessments they created
CREATE POLICY "Teachers view their assessments" ON student_assessments
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = teacher_id
        OR 
        -- Teacher owns the chatbot
        EXISTS (
            SELECT 1 FROM chatbots 
            WHERE chatbots.chatbot_id = student_assessments.chatbot_id 
            AND chatbots.teacher_id = auth.uid()
        )
    );

-- 4. Allow authenticated users to insert assessments (needed for the API)
CREATE POLICY "Authenticated users can insert assessments" ON student_assessments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Either the user is the student being assessed
        auth.uid() = student_id
        OR
        -- Or the user is a teacher (has a teacher profile)
        EXISTS (
            SELECT 1 FROM teacher_profiles 
            WHERE teacher_profiles.user_id = auth.uid()
        )
        OR
        -- Or it's the service role (already covered but being explicit)
        auth.role() = 'service_role'
    );

-- 5. Teachers can update assessments they created
CREATE POLICY "Teachers update their assessments" ON student_assessments
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = teacher_id
        OR 
        EXISTS (
            SELECT 1 FROM chatbots 
            WHERE chatbots.chatbot_id = student_assessments.chatbot_id 
            AND chatbots.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() = teacher_id
        OR 
        EXISTS (
            SELECT 1 FROM chatbots 
            WHERE chatbots.chatbot_id = student_assessments.chatbot_id 
            AND chatbots.teacher_id = auth.uid()
        )
    );

-- Verify the policies were created
SELECT 
    pol.polname AS policy_name,
    pol.polcmd AS command,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command_type,
    pol.polroles::regrole[] AS roles
FROM 
    pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE 
    cls.relname = 'student_assessments'
ORDER BY 
    pol.polcmd, pol.polname;

-- Also create a more permissive insert policy specifically for the API if needed
-- This is a temporary measure to debug the issue
CREATE POLICY "Temporary permissive insert for debugging" ON student_assessments
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Check if we need to add any missing foreign key constraints
-- But first, let's verify the foreign key constraints are correct
SELECT
    conname AS constraint_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table_name,
    af.attname AS foreign_column_name
FROM
    pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE
    c.contype = 'f'
    AND c.conrelid = 'student_assessments'::regclass
ORDER BY
    conname;