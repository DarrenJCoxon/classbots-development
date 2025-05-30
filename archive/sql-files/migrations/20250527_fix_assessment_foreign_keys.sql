-- Migration: Fix student_assessments foreign key constraints
-- Date: 2025-05-27
-- Purpose: Update foreign keys to reference auth.users instead of profiles_old table
-- This fixes the issue where assessments couldn't be created after migrating to student_profiles/teacher_profiles

-- Drop old foreign key constraints that pointed to profiles_old
ALTER TABLE public.student_assessments 
DROP CONSTRAINT IF EXISTS student_assessments_student_id_fkey;

ALTER TABLE public.student_assessments 
DROP CONSTRAINT IF EXISTS student_assessments_teacher_id_fkey;

-- Drop any duplicate constraints
ALTER TABLE public.student_assessments 
DROP CONSTRAINT IF EXISTS fk_student;

-- Add new foreign key constraints that reference auth.users
-- This works because both student_profiles and teacher_profiles reference auth.users
ALTER TABLE public.student_assessments 
ADD CONSTRAINT student_assessments_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

ALTER TABLE public.student_assessments 
ADD CONSTRAINT student_assessments_teacher_id_fkey 
FOREIGN KEY (teacher_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;