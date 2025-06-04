-- Fix RLS policies for student_assessments table
-- This ensures proper permissions without overly permissive debugging policies

-- First, check if RLS is enabled on student_assessments
SELECT 
    relname,
    relrowsecurity,
    relforcerowsecurity
FROM 
    pg_class
WHERE 
    relname = 'student_assessments';

-- Enable RLS on student_assessments if not already enabled
ALTER TABLE student_assessments ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Students can view their own assessments" ON student_assessments;
DROP POLICY IF EXISTS "Teachers can view assessments for their students" ON student_assessments;
DROP POLICY IF EXISTS "Service role can do everything" ON student_assessments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON student_assessments;
DROP POLICY IF EXISTS "Enable update for teachers" ON student_assessments;
DROP POLICY IF EXISTS "Authenticated users can insert assessments" ON student_assessments;
DROP POLICY IF EXISTS "Students view own assessments" ON student_assessments;
DROP POLICY IF EXISTS "Teachers view their assessments" ON student_assessments;
DROP POLICY IF EXISTS "Teachers update their assessments" ON student_assessments;
DROP POLICY IF EXISTS "Service role bypass" ON student_assessments;
DROP POLICY IF EXISTS "Temporary permissive insert for debugging" ON student_assessments;

-- Create proper RLS policies

-- 1. Service role bypass (for admin operations) - This is what adminSupabase uses
CREATE POLICY "Service role full access" ON student_assessments
    FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 2. Students can view their own assessments
CREATE POLICY "Students view own assessments" ON student_assessments
    FOR SELECT
    USING (auth.uid() = student_id);

-- 3. Teachers can view assessments for their students/chatbots
CREATE POLICY "Teachers view related assessments" ON student_assessments
    FOR SELECT
    USING (
        -- Teacher created the assessment
        auth.uid() = teacher_id
        OR 
        -- Teacher owns the chatbot used for assessment
        EXISTS (
            SELECT 1 FROM chatbots 
            WHERE chatbots.chatbot_id = student_assessments.chatbot_id 
            AND chatbots.teacher_id = auth.uid()
        )
        OR
        -- Teacher owns the room where assessment happened
        EXISTS (
            SELECT 1 FROM rooms
            WHERE rooms.room_id = student_assessments.room_id
            AND rooms.teacher_id = auth.uid()
        )
    );

-- 4. System can insert assessments on behalf of students
-- This is the critical policy - assessments are created by the system when students submit
CREATE POLICY "System inserts assessments" ON student_assessments
    FOR INSERT
    WITH CHECK (
        -- Always allow inserts through service role (adminSupabase)
        auth.role() = 'service_role'
        OR
        -- Allow if the authenticated user is the student being assessed
        (auth.uid() = student_id AND auth.role() = 'authenticated')
    );

-- 5. Teachers can update assessments they own
CREATE POLICY "Teachers update own assessments" ON student_assessments
    FOR UPDATE
    USING (
        -- Teacher created the assessment
        auth.uid() = teacher_id
        OR 
        -- Teacher owns the chatbot
        EXISTS (
            SELECT 1 FROM chatbots 
            WHERE chatbots.chatbot_id = student_assessments.chatbot_id 
            AND chatbots.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Same conditions for WITH CHECK
        auth.uid() = teacher_id
        OR 
        EXISTS (
            SELECT 1 FROM chatbots 
            WHERE chatbots.chatbot_id = student_assessments.chatbot_id 
            AND chatbots.teacher_id = auth.uid()
        )
    );

-- 6. Teachers can delete assessments they own (if needed)
CREATE POLICY "Teachers delete own assessments" ON student_assessments
    FOR DELETE
    USING (
        -- Teacher created the assessment
        auth.uid() = teacher_id
        OR 
        -- Teacher owns the chatbot
        EXISTS (
            SELECT 1 FROM chatbots 
            WHERE chatbots.chatbot_id = student_assessments.chatbot_id 
            AND chatbots.teacher_id = auth.uid()
        )
    );

-- Verify the policies were created correctly
SELECT 
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command_type,
    pol.polpermissive AS is_permissive,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM 
    pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE 
    cls.relname = 'student_assessments'
ORDER BY 
    pol.polcmd, pol.polname;

-- Check foreign key constraints to ensure they're set up correctly
SELECT
    conname AS constraint_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table_name,
    af.attname AS foreign_column_name,
    CASE confupdtype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS on_update,
    CASE confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS on_delete
FROM
    pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE
    c.contype = 'f'
    AND c.conrelid = 'student_assessments'::regclass
ORDER BY
    conname;