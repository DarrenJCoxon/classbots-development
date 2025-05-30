-- Fix country_code sync from auth.users to profiles table
-- This migration updates the handle_new_user function to include country_code

-- First, update the handle_new_user function to include country_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name,
    role,
    country_code
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'country_code'
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE NOTICE 'Error creating profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- For existing users who signed up with a country_code but it wasn't synced,
-- update their profiles from the auth.users metadata
UPDATE public.profiles p
SET country_code = u.raw_user_meta_data->>'country_code'
FROM auth.users u
WHERE p.user_id = u.id
  AND p.country_code IS NULL
  AND u.raw_user_meta_data->>'country_code' IS NOT NULL
  AND u.raw_user_meta_data->>'country_code' != '';

-- Add a comment to document this change
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile entry when a new user signs up, including country_code from metadata';