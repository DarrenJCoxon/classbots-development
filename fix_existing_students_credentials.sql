-- First, let's see which students need credentials
SELECT 
    user_id,
    full_name,
    first_name,
    surname,
    username,
    pin_code,
    created_at
FROM public.student_profiles
WHERE username IS NULL OR pin_code IS NULL;

-- Generate usernames and PINs for existing students
-- This will create usernames in format: firstname.surname (lowercase)
-- And generate random 4-digit PINs

-- Step 1: Update students with missing usernames
WITH username_updates AS (
    SELECT 
        user_id,
        LOWER(
            REGEXP_REPLACE(
                COALESCE(first_name, SPLIT_PART(full_name, ' ', 1)) || '.' || 
                COALESCE(surname, SPLIT_PART(full_name, ' ', 2)),
                '[^a-z.]', '', 'g'
            )
        ) as new_username
    FROM public.student_profiles
    WHERE username IS NULL
)
UPDATE public.student_profiles sp
SET username = 
    CASE 
        -- If username already exists, append random numbers
        WHEN EXISTS (
            SELECT 1 FROM public.student_profiles sp2 
            WHERE sp2.username = uu.new_username 
            AND sp2.user_id != sp.user_id
        )
        THEN uu.new_username || FLOOR(RANDOM() * 900 + 100)::TEXT
        ELSE uu.new_username
    END
FROM username_updates uu
WHERE sp.user_id = uu.user_id
AND sp.username IS NULL;

-- Step 2: Update students with missing PINs
UPDATE public.student_profiles
SET pin_code = LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')
WHERE pin_code IS NULL;

-- Step 3: Update auth.users to set passwords for students with new PINs
-- Note: This needs to be run by a superuser or through the application
-- as we cannot directly update auth.users passwords from SQL

-- Let's verify the updates
SELECT 
    user_id,
    full_name,
    username,
    pin_code,
    email
FROM public.student_profiles sp
JOIN auth.users au ON sp.user_id = au.id
WHERE sp.updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY sp.updated_at DESC;

-- IMPORTANT: After running this SQL, you need to update the auth.users passwords
-- to match the PIN codes. This can be done through the Supabase dashboard or
-- by running a script using the Supabase Admin API.