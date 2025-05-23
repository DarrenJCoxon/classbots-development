-- This will ensure all auth users have valid profiles
-- It serves as a backup mechanism in case the trigger doesn't fire

-- Drop and recreate the handle_new_user function with improved error handling
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'Processing new user in handle_new_user trigger: %', NEW.id;
  
  -- Get the role from metadata or set default
  DECLARE
    user_role TEXT;
    user_email TEXT;
    user_name TEXT;
  BEGIN
    -- Extract values with better error checking
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    user_email := COALESCE(NEW.email, NEW.id || '@example.com');
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
    
    RAISE NOTICE 'Creating profile for user % with email %, name %, role %', 
      NEW.id, user_email, user_name, user_role;
      
    -- Attempt to insert the profile
    INSERT INTO public.profiles (
      user_id, 
      email, 
      full_name,
      role,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      user_email,
      user_name,
      user_role::public.user_role,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      updated_at = NOW();
      
    RAISE NOTICE 'Profile created/updated successfully for user %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error in handle_new_user function: %', SQLERRM;
      -- Continue processing even if there's an error
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in outer block of handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also sync any existing users without profiles
-- This ensures all existing auth users have profiles
INSERT INTO public.profiles (
  user_id,
  email,
  full_name,
  role,
  created_at,
  updated_at
)
SELECT 
  au.id,
  COALESCE(au.email, au.id || '@example.com'),
  COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
  COALESCE(au.raw_user_meta_data->>'role', 'student')::public.user_role,
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;

-- Verify existing teacher accounts and repair if needed
UPDATE public.profiles p
SET 
  role = 'teacher'::public.user_role,
  updated_at = NOW()
FROM auth.users u
WHERE p.user_id = u.id
  AND u.raw_user_meta_data->>'role' = 'teacher'
  AND p.role != 'teacher'::public.user_role;

-- Verify trigger is active
SELECT 
  tgname AS trigger_name, 
  tgrelid::regclass AS table_name,
  tgenabled AS enabled,
  'Trigger is ' || CASE WHEN tgenabled = 'O' THEN 'active' ELSE 'inactive' END AS status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Show any users that still don't have profiles (should be empty)
SELECT 
  u.id, 
  u.email, 
  u.raw_user_meta_data->>'role' AS role,
  u.raw_user_meta_data->>'full_name' AS name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL;