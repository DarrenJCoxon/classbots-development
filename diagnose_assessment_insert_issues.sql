-- Check if there are any triggers on the student_assessments table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM 
    information_schema.triggers
WHERE 
    event_object_schema = 'public'
    AND event_object_table = 'student_assessments';

-- Check for RLS policies in more detail
SELECT 
    pol.polname AS policy_name,
    pol.polcmd AS command,
    pol.polpermissive AS permissive,
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
    cls.relname = 'student_assessments'
    AND cls.relnamespace = 'public'::regnamespace;

-- Check foreign key details
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table_name,
    af.attname AS foreign_column_name,
    confupdtype AS on_update,
    confdeltype AS on_delete
FROM
    pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE
    c.contype = 'f'
    AND c.conrelid = 'student_assessments'::regclass;

-- Check if the referenced tables exist and have the expected columns
SELECT 
    'student_profiles' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'student_profiles' 
        AND column_name = 'user_id'
    ) as has_user_id_column
UNION ALL
SELECT 
    'chatbots' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'chatbots' 
        AND column_name = 'chatbot_id'
    ) as has_chatbot_id_column
UNION ALL
SELECT 
    'teacher_profiles' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'teacher_profiles' 
        AND column_name = 'user_id'
    ) as has_user_id_column;

-- Check for any custom types used in the table
SELECT 
    n.nspname as schema_name,
    t.typname as type_name,
    t.typtype as type_type,
    CASE t.typtype
        WHEN 'e' THEN 'ENUM'
        WHEN 'c' THEN 'COMPOSITE'
        WHEN 'd' THEN 'DOMAIN'
        WHEN 'r' THEN 'RANGE'
        ELSE 'OTHER'
    END as type_category,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM 
    pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    LEFT JOIN pg_enum e ON t.oid = e.enumtypid
WHERE 
    t.typname = 'assessment_status_enum'
    AND n.nspname = 'public'
GROUP BY 
    n.nspname, t.typname, t.typtype;

-- Check if there are any rules on the table
SELECT 
    r.rulename,
    r.ev_type,
    r.is_instead,
    pg_get_ruledef(r.oid) as rule_definition
FROM 
    pg_rewrite r
    JOIN pg_class c ON r.ev_class = c.oid
WHERE 
    c.relname = 'student_assessments'
    AND c.relnamespace = 'public'::regnamespace;

-- Test a simple insert to see what error we get (this will rollback)
BEGIN;
INSERT INTO student_assessments (
    student_id,
    chatbot_id,
    room_id,
    teacher_id,
    ai_feedback_student,
    ai_grade_raw,
    status
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'test_room_001',
    '00000000-0000-0000-0000-000000000003'::uuid,
    'Test feedback',
    'A',
    'ai_completed'
);
ROLLBACK;

-- Check the current user and their permissions
SELECT 
    current_user,
    has_table_privilege(current_user, 'student_assessments', 'INSERT') as can_insert,
    has_table_privilege(current_user, 'student_assessments', 'SELECT') as can_select,
    has_table_privilege(current_user, 'student_assessments', 'UPDATE') as can_update,
    has_table_privilege(current_user, 'student_assessments', 'DELETE') as can_delete;