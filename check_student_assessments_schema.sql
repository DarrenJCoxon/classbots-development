-- Check if student_assessments table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'student_assessments'
ORDER BY 
    ordinal_position;

-- Check constraints on student_assessments table
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE
    tc.table_schema = 'public'
    AND tc.table_name = 'student_assessments';

-- Check indexes on student_assessments table
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
    AND tablename = 'student_assessments';

-- Check if there are any RLS policies on student_assessments
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    schemaname = 'public'
    AND tablename = 'student_assessments';

-- Check if RLS is enabled on the table
SELECT
    relname,
    relrowsecurity,
    relforcerowsecurity
FROM
    pg_class
WHERE
    relname = 'student_assessments';

-- Count records in student_assessments to verify it's empty
SELECT COUNT(*) as record_count FROM public.student_assessments;

-- Check for any recent errors by looking at the table's DDL
SELECT
    obj_description(oid, 'pg_class') as table_comment
FROM
    pg_class
WHERE
    relname = 'student_assessments';

-- Show the actual CREATE TABLE statement (if available via pg_dump simulation)
SELECT 
    'CREATE TABLE ' || table_name || ' (' || chr(10) ||
    string_agg(
        '    ' || column_name || ' ' || 
        data_type || 
        CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')' 
            ELSE '' 
        END ||
        CASE 
            WHEN is_nullable = 'NO' 
            THEN ' NOT NULL' 
            ELSE '' 
        END ||
        CASE 
            WHEN column_default IS NOT NULL 
            THEN ' DEFAULT ' || column_default 
            ELSE '' 
        END,
        ',' || chr(10)
    ) || chr(10) || ');' as create_table_statement
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'student_assessments'
GROUP BY 
    table_name;