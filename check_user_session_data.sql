-- Check how user session data is retrieved for magic link users
-- The issue is likely in how the frontend retrieves user data

-- 1. Check if auth.users has the correct metadata
SELECT 
    id,
    email,
    raw_user_meta_data,
    raw_user_meta_data->>'full_name' as metadata_name,
    raw_user_meta_data->>'role' as metadata_role,
    is_anonymous,
    created_at
FROM auth.users
WHERE is_anonymous = true
AND raw_user_meta_data->>'role' = 'student'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if student_profiles has matching data
SELECT 
    sp.user_id,
    sp.full_name,
    sp.first_name,
    sp.surname,
    sp.created_at,
    au.email,
    au.raw_user_meta_data->>'full_name' as auth_name
FROM public.student_profiles sp
JOIN auth.users au ON sp.user_id = au.id
WHERE au.is_anonymous = true
ORDER BY sp.created_at DESC
LIMIT 5;

-- 3. Check how the profiles VIEW resolves names
SELECT 
    user_id,
    full_name,
    role,
    email
FROM public.profiles
WHERE role = 'student'
AND user_id IN (
    SELECT id FROM auth.users 
    WHERE is_anonymous = true 
    LIMIT 5
);

-- 4. Check if there's a specific function that retrieves user info
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND (routine_name LIKE '%user%' OR routine_name LIKE '%profile%')
AND routine_definition LIKE '%full_name%'
LIMIT 5;

-- 5. Test query to see what data would be available via Supabase auth.getUser()
-- This simulates what the frontend might see
SELECT 
    au.id,
    au.email,
    au.raw_app_meta_data,
    au.raw_user_meta_data,
    COALESCE(
        sp.full_name,
        au.raw_user_meta_data->>'full_name',
        'Student'
    ) as resolved_name
FROM auth.users au
LEFT JOIN public.student_profiles sp ON au.id = sp.user_id
WHERE au.is_anonymous = true
AND au.raw_user_meta_data->>'role' = 'student'
ORDER BY au.created_at DESC
LIMIT 5;