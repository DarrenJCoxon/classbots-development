-- Add year_group column to student_profiles table
ALTER TABLE public.student_profiles 
ADD COLUMN IF NOT EXISTS year_group VARCHAR(50);

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_student_profiles_year_group 
ON public.student_profiles(year_group);

-- Add index for combined school and year group queries
CREATE INDEX IF NOT EXISTS idx_student_profiles_school_year 
ON public.student_profiles(school_id, year_group);

-- Optional: Add some common year group values as a comment for reference
COMMENT ON COLUMN public.student_profiles.year_group IS 'Student year group (e.g., Year 7, Year 8, Grade 9, 6th Form, etc.)';