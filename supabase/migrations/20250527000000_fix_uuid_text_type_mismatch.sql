-- Fix UUID-text type mismatch in RLS policies
-- This migration fixes the "operator does not exist: uuid = text" error
-- by correctly casting auth.uid() to the appropriate type for each table

-- =============== ROOM MEMBERSHIPS TABLE ===============
-- First, drop existing policies that might be causing issues
DROP POLICY IF EXISTS "students_can_view_their_own_memberships" ON public.room_memberships;
DROP POLICY IF EXISTS "students_can_view_their_own_memberships_liberal" ON public.room_memberships;
DROP POLICY IF EXISTS "teachers_can_view_all_room_memberships" ON public.room_memberships;
DROP POLICY IF EXISTS "teachers_can_manage_memberships_for_their_rooms" ON public.room_memberships;

-- Create policies with correct type casting
-- Note: student_id is UUID type, so cast auth.uid() to UUID
CREATE POLICY "students_can_view_their_own_memberships_fixed" 
ON public.room_memberships FOR SELECT 
USING (student_id = auth.uid()::uuid);

CREATE POLICY "teachers_can_view_all_room_memberships_fixed" 
ON public.room_memberships FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_memberships.room_id 
    AND r.teacher_id = auth.uid()::uuid
  )
);

CREATE POLICY "teachers_can_manage_memberships_for_their_rooms_fixed" 
ON public.room_memberships FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_memberships.room_id 
    AND r.teacher_id = auth.uid()::uuid
  )
);

-- =============== CHAT MESSAGES TABLE ===============
-- First, drop existing policies that might be causing issues
DROP POLICY IF EXISTS "users_can_view_messages_in_rooms_they_belong_to" ON public.chat_messages;
DROP POLICY IF EXISTS "users_can_insert_messages_in_rooms_they_belong_to" ON public.chat_messages;
DROP POLICY IF EXISTS "can access own messages and assistant messages" ON public.chat_messages;
DROP POLICY IF EXISTS "users_can_manage_own_messages" ON public.chat_messages;

-- Create policies with correct type casting
CREATE POLICY "users_can_view_messages_in_rooms_they_belong_to_fixed" 
ON public.chat_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_memberships rm
    WHERE rm.room_id = chat_messages.room_id 
    AND rm.student_id = auth.uid()::uuid
  ) OR 
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = chat_messages.room_id 
    AND r.teacher_id = auth.uid()::uuid
  )
);

CREATE POLICY "users_can_insert_messages_in_rooms_they_belong_to_fixed" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_memberships rm
    WHERE rm.room_id = chat_messages.room_id 
    AND rm.student_id = auth.uid()::uuid
  ) OR 
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = chat_messages.room_id 
    AND r.teacher_id = auth.uid()::uuid
  )
);

CREATE POLICY "can_access_own_messages_and_assistant_messages_fixed" 
ON public.chat_messages FOR SELECT 
USING (
  user_id = auth.uid()::uuid OR 
  role = 'assistant' OR 
  role = 'system'
);

CREATE POLICY "users_can_manage_own_messages_fixed" 
ON public.chat_messages FOR ALL 
USING (
  user_id = auth.uid()::uuid
);

-- =============== STUDENTS TABLE ===============
-- First, drop existing policies that might be causing issues
DROP POLICY IF EXISTS "teachers_can_manage_students_they_created" ON public.students;
DROP POLICY IF EXISTS "teachers_can_view_students_in_their_rooms" ON public.students;
DROP POLICY IF EXISTS "students_can_view_self" ON public.students;
DROP POLICY IF EXISTS "students_can_update_self" ON public.students;

-- Create policies with correct type casting
CREATE POLICY "teachers_can_manage_students_they_created_fixed" 
ON public.students FOR ALL 
USING (
  teacher_id = auth.uid()::uuid
);

CREATE POLICY "teachers_can_view_students_in_their_rooms_fixed" 
ON public.students FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_memberships rm
    JOIN public.rooms r ON rm.room_id = r.id
    WHERE rm.student_id = students.id 
    AND r.teacher_id = auth.uid()::uuid
  )
);

CREATE POLICY "students_can_view_self_fixed" 
ON public.students FOR SELECT 
USING (
  id = auth.uid()::uuid
);

CREATE POLICY "students_can_update_self_fixed" 
ON public.students FOR UPDATE 
USING (
  id = auth.uid()::uuid
);

-- =============== ROOMS TABLE ===============
-- First, drop existing policies that might be causing issues
DROP POLICY IF EXISTS "teachers_can_manage_own_rooms" ON public.rooms;
DROP POLICY IF EXISTS "teachers_can_view_own_rooms" ON public.rooms;
DROP POLICY IF EXISTS "students_can_view_rooms_they_belong_to" ON public.rooms;

-- Create policies with correct type casting
CREATE POLICY "teachers_can_manage_own_rooms_fixed" 
ON public.rooms FOR ALL 
USING (
  teacher_id = auth.uid()::uuid
);

CREATE POLICY "teachers_can_view_own_rooms_fixed" 
ON public.rooms FOR SELECT 
USING (
  teacher_id = auth.uid()::uuid
);

CREATE POLICY "students_can_view_rooms_they_belong_to_fixed" 
ON public.rooms FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_memberships rm
    WHERE rm.room_id = rooms.id 
    AND rm.student_id = auth.uid()::uuid
  )
);

-- =============== PROFILES TABLE ===============
-- Note: In profiles table, user_id is typically text type matching auth.uid()
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;

-- Create policies with correct type casting
-- Note: For profiles table, auth.uid() is often compared with user_id which is text
CREATE POLICY "users_can_view_own_profile_fixed" 
ON public.profiles FOR SELECT 
USING (
  user_id = auth.uid()::text
);

CREATE POLICY "users_can_update_own_profile_fixed" 
ON public.profiles FOR UPDATE 
USING (
  user_id = auth.uid()::text
);

-- =============== DOCUMENTS TABLE ===============
DROP POLICY IF EXISTS "teachers_can_manage_own_documents" ON public.documents;
DROP POLICY IF EXISTS "teachers_can_view_own_documents" ON public.documents;

-- Create policies with correct type casting
CREATE POLICY "teachers_can_manage_own_documents_fixed" 
ON public.documents FOR ALL 
USING (
  teacher_id = auth.uid()::uuid
);

CREATE POLICY "teachers_can_view_own_documents_fixed" 
ON public.documents FOR SELECT 
USING (
  teacher_id = auth.uid()::uuid
);

-- =============== CHATBOTS TABLE ===============
DROP POLICY IF EXISTS "teachers_can_manage_own_chatbots" ON public.chatbots;
DROP POLICY IF EXISTS "teachers_can_view_own_chatbots" ON public.chatbots;
DROP POLICY IF EXISTS "students_can_view_chatbots_in_their_rooms" ON public.chatbots;

-- Create policies with correct type casting
CREATE POLICY "teachers_can_manage_own_chatbots_fixed" 
ON public.chatbots FOR ALL 
USING (
  teacher_id = auth.uid()::uuid
);

CREATE POLICY "teachers_can_view_own_chatbots_fixed" 
ON public.chatbots FOR SELECT 
USING (
  teacher_id = auth.uid()::uuid
);

CREATE POLICY "students_can_view_chatbots_in_their_rooms_fixed" 
ON public.chatbots FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_chatbots rc
    JOIN public.room_memberships rm ON rc.room_id = rm.room_id
    WHERE rc.chatbot_id = chatbots.id 
    AND rm.student_id = auth.uid()::uuid
  )
);

-- =============== ROOM_CHATBOTS TABLE ===============
DROP POLICY IF EXISTS "teachers_can_manage_room_chatbot_associations" ON public.room_chatbots;
DROP POLICY IF EXISTS "teachers_can_view_room_chatbot_associations" ON public.room_chatbots;
DROP POLICY IF EXISTS "students_can_view_chatbots_in_their_rooms" ON public.room_chatbots;

-- Create policies with correct type casting
CREATE POLICY "teachers_can_manage_room_chatbot_associations_fixed" 
ON public.room_chatbots FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_chatbots.room_id 
    AND r.teacher_id = auth.uid()::uuid
  )
);

CREATE POLICY "teachers_can_view_room_chatbot_associations_fixed" 
ON public.room_chatbots FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_chatbots.room_id 
    AND r.teacher_id = auth.uid()::uuid
  )
);

CREATE POLICY "students_can_view_chatbots_in_their_rooms_fixed" 
ON public.room_chatbots FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_memberships rm
    WHERE rm.room_id = room_chatbots.room_id 
    AND rm.student_id = auth.uid()::uuid
  )
);

-- =============== ASSESSMENT_ATTEMPTS TABLE ===============
DROP POLICY IF EXISTS "teachers_can_view_assessment_attempts" ON public.assessment_attempts;
DROP POLICY IF EXISTS "students_can_view_own_assessment_attempts" ON public.assessment_attempts;
DROP POLICY IF EXISTS "students_can_insert_own_assessment_attempts" ON public.assessment_attempts;

-- Create policies with correct type casting
CREATE POLICY "teachers_can_view_assessment_attempts_fixed" 
ON public.assessment_attempts FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_attempts.assessment_id 
    AND a.teacher_id = auth.uid()::uuid
  )
);

CREATE POLICY "students_can_view_own_assessment_attempts_fixed" 
ON public.assessment_attempts FOR SELECT 
USING (
  student_id = auth.uid()::uuid
);

CREATE POLICY "students_can_insert_own_assessment_attempts_fixed" 
ON public.assessment_attempts FOR INSERT 
WITH CHECK (
  student_id = auth.uid()::uuid
);

-- =============== ASSESSMENTS TABLE ===============
DROP POLICY IF EXISTS "teachers_can_manage_own_assessments" ON public.assessments;
DROP POLICY IF EXISTS "teachers_can_view_own_assessments" ON public.assessments;
DROP POLICY IF EXISTS "students_can_view_assessments_in_their_rooms" ON public.assessments;

-- Create policies with correct type casting
CREATE POLICY "teachers_can_manage_own_assessments_fixed" 
ON public.assessments FOR ALL 
USING (
  teacher_id = auth.uid()::uuid
);

CREATE POLICY "teachers_can_view_own_assessments_fixed" 
ON public.assessments FOR SELECT 
USING (
  teacher_id = auth.uid()::uuid
);

CREATE POLICY "students_can_view_assessments_in_their_rooms_fixed" 
ON public.assessments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_memberships rm
    WHERE rm.room_id = assessments.room_id 
    AND rm.student_id = auth.uid()::uuid
  )
);

-- Add comment to notify that these policies have been fixed
COMMENT ON TABLE public.room_memberships IS 'Room memberships with fixed RLS policies (auth.uid() cast to UUID)';
COMMENT ON TABLE public.chat_messages IS 'Chat messages with fixed RLS policies (auth.uid() cast to UUID)';
COMMENT ON TABLE public.rooms IS 'Rooms with fixed RLS policies (auth.uid() cast to UUID)';
COMMENT ON TABLE public.profiles IS 'User profiles with fixed RLS policies (auth.uid() cast to text)';