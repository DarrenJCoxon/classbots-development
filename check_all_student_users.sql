-- Broader investigation of how students are created and where names are stored

-- 1. Check ALL student profiles to see the data patterns
SELECT 
    sp.user_id,
    sp.first_name,
    sp.surname,
    sp.full_name,
    au.email,
    au.is_anonymous,
    au.raw_user_meta_data->>'role' as metadata_role,
    au.raw_user_meta_data->>'full_name' as metadata_full_name,
    au.raw_user_meta_data->>'is_anonymous' as metadata_is_anonymous,
    sp.created_at
FROM public.student_profiles sp
JOIN auth.users au ON sp.user_id = au.id
ORDER BY sp.created_at DESC
LIMIT 20;

-- 2. Check for users with temp email patterns (magic link pattern)
SELECT 
    au.id,
    au.email,
    au.is_anonymous,
    au.raw_user_meta_data,
    sp.first_name,
    sp.surname,
    sp.full_name
FROM auth.users au
LEFT JOIN public.student_profiles sp ON au.id = sp.user_id
WHERE au.email LIKE '%@temp.classbots.ai'
   OR au.email LIKE 'student-%'
ORDER BY au.created_at DESC
LIMIT 10;

-- 3. Check recent student profile entries
SELECT 
    user_id,
    first_name,
    surname,
    full_name,
    username,
    created_at,
    updated_at
FROM public.student_profiles
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check the profiles VIEW to see how it resolves student names
SELECT 
    user_id,
    full_name,
    role,
    email
FROM public.profiles
WHERE role = 'student'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check for any students that might have token-like names
SELECT 
    sp.user_id,
    sp.first_name,
    sp.surname,
    sp.full_name,
    au.email,
    au.raw_user_meta_data
FROM public.student_profiles sp
JOIN auth.users au ON sp.user_id = au.id
WHERE sp.first_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR sp.first_name ~ '^[0-9]+$'
   OR sp.full_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR sp.full_name ~ '^[0-9]+$'
LIMIT 10;