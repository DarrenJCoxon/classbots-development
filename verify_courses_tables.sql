-- Verify courses tables were created successfully

-- Check tables exist
SELECT 
    'Tables Created' as check_type,
    COUNT(*) as count,
    string_agg(table_name, ', ') as items
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('courses', 'course_lessons', 'course_enrollments', 'lesson_progress');

-- Check indexes exist
SELECT 
    'Indexes Created' as check_type,
    COUNT(*) as count,
    string_agg(indexname, ', ') as items
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('courses', 'course_lessons', 'course_enrollments', 'lesson_progress');

-- Check RLS is enabled
SELECT 
    'RLS Enabled' as check_type,
    COUNT(*) as count,
    string_agg(tablename || '=' || rowsecurity::text, ', ') as items
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('courses', 'course_lessons', 'course_enrollments', 'lesson_progress')
AND rowsecurity = true;

-- Check policies exist
SELECT 
    'Policies Created' as check_type,
    COUNT(*) as count,
    string_agg(tablename || ':' || policyname, ', ' ORDER BY tablename, policyname) as items
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('courses', 'course_lessons', 'course_enrollments', 'lesson_progress');

-- Check view exists
SELECT 
    'View Created' as check_type,
    COUNT(*) as count,
    string_agg(table_name, ', ') as items
FROM information_schema.views
WHERE table_schema = 'public' 
AND table_name = 'course_stats';

-- Check triggers exist
SELECT 
    'Triggers Created' as check_type,
    COUNT(*) as count,
    string_agg(trigger_name, ', ') as items
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('courses', 'course_lessons', 'lesson_progress');

-- Show table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('courses', 'course_lessons', 'course_enrollments', 'lesson_progress')
ORDER BY table_name, ordinal_position;