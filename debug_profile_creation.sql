SELECT 
    tgname as trigger_name,
    tgenabled as is_enabled,
    tgrelid::regclass as table_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgname = 'on_auth_user_created';

SELECT prosrc as function_source
FROM pg_proc
WHERE proname = 'handle_new_user';

SELECT 
    p.user_id,
    p.email,
    p.role,
    p.created_at,
    au.raw_user_meta_data->>'role' as metadata_role,
    au.created_at as auth_created_at
FROM profiles p
JOIN auth.users au ON au.id = p.user_id
WHERE p.created_at > NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC
LIMIT 10;

SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'role' as metadata_role,
    au.created_at
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
AND au.created_at > NOW() - INTERVAL '7 days'
ORDER BY au.created_at DESC;

SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'role' as metadata_role,
    au.raw_user_meta_data->>'full_name' as full_name,
    p.role as profile_role
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE au.raw_user_meta_data->>'role' = 'teacher'
AND (p.role IS NULL OR p.role != 'teacher');

INSERT INTO profiles (user_id, email, full_name, role, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', 'Teacher'),
    'teacher',
    NOW(),
    NOW()
FROM auth.users au
WHERE au.raw_user_meta_data->>'role' = 'teacher'
AND NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.user_id = au.id
);