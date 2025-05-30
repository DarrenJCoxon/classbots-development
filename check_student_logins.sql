-- Check student profiles and their login credentials
SELECT 
    sp.user_id,
    sp.username,
    sp.pin_code,
    sp.full_name,
    sp.first_name,
    sp.surname,
    sp.year_group,
    au.email,
    au.created_at as user_created,
    sp.created_at as profile_created
FROM public.student_profiles sp
JOIN auth.users au ON sp.user_id = au.id
ORDER BY sp.created_at DESC
LIMIT 10;

-- Check if there are any students without usernames or PINs
SELECT COUNT(*) as students_without_credentials
FROM public.student_profiles
WHERE username IS NULL OR pin_code IS NULL;