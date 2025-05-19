-- ClassBots Base RLS Policies
-- This file sets up Row-Level Security policies with proper type casting

-- First, enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flagged_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assessments ENABLE ROW LEVEL SECURITY;

-- =====================
-- PROFILES POLICIES
-- =====================
-- NOTE: user_id in profiles is UUID, requires proper casting

-- Users can view their own profile
CREATE POLICY "users_can_view_own_profile" 
ON public.profiles FOR SELECT 
USING (user_id = auth.uid()::uuid);

-- Users can update their own profile
CREATE POLICY "users_can_update_own_profile" 
ON public.profiles FOR UPDATE 
USING (user_id = auth.uid()::uuid);

-- Allow insert on sign-up
CREATE POLICY "users_can_insert_own_profile" 
ON public.profiles FOR INSERT 
WITH CHECK (user_id = auth.uid()::uuid);

-- Teachers can view student profiles in their rooms
CREATE POLICY "teachers_can_view_students_in_their_rooms" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_memberships rm
    JOIN public.rooms r ON rm.room_id = r.room_id
    WHERE rm.student_id = profiles.user_id
    AND r.teacher_id = auth.uid()::uuid
    AND profiles.role = 'student'
  )
);

-- =====================
-- ROOMS POLICIES
-- =====================
-- NOTE: teacher_id in rooms is UUID, requires proper casting

-- Teachers can manage their own rooms
CREATE POLICY "teachers_can_manage_own_rooms" 
ON public.rooms FOR ALL 
USING (teacher_id = auth.uid()::uuid);

-- Students can view rooms they belong to
CREATE POLICY "students_can_view_joined_rooms" 
ON public.rooms FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_memberships rm
    WHERE rm.room_id = rooms.room_id
    AND rm.student_id = auth.uid()::uuid
  ) OR allow_anonymous_access = true
);

-- =====================
-- CHATBOTS POLICIES
-- =====================
-- NOTE: teacher_id in chatbots is UUID, requires proper casting

-- Teachers can manage their own chatbots
CREATE POLICY "teachers_can_manage_own_chatbots" 
ON public.chatbots FOR ALL 
USING (teacher_id = auth.uid()::uuid);

-- Students can view chatbots in their rooms
CREATE POLICY "students_can_view_chatbots_in_their_rooms" 
ON public.chatbots FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_chatbots rc
    JOIN public.room_memberships rm ON rc.room_id = rm.room_id
    WHERE rc.chatbot_id = chatbots.chatbot_id
    AND rm.student_id = auth.uid()::uuid
  )
);

-- =====================
-- ROOM_MEMBERSHIPS POLICIES
-- =====================
-- NOTE: student_id in room_memberships is UUID, requires proper casting

-- Students can view their own memberships
CREATE POLICY "students_can_view_own_memberships" 
ON public.room_memberships FOR SELECT 
USING (student_id = auth.uid()::uuid);

-- Students can leave rooms (delete membership)
CREATE POLICY "students_can_leave_rooms" 
ON public.room_memberships FOR DELETE 
USING (student_id = auth.uid()::uuid);

-- Teachers can view and manage memberships for their rooms
CREATE POLICY "teachers_can_manage_room_memberships" 
ON public.room_memberships FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.room_id = room_memberships.room_id
    AND r.teacher_id = auth.uid()::uuid
  )
);

-- =====================
-- ROOM_CHATBOTS POLICIES
-- =====================

-- Teachers can manage chatbot assignments in their rooms
CREATE POLICY "teachers_can_manage_room_chatbot_assignments" 
ON public.room_chatbots FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.room_id = room_chatbots.room_id
    AND r.teacher_id = auth.uid()::uuid
  )
);

-- Students can view chatbots in their rooms
CREATE POLICY "students_can_view_room_chatbots" 
ON public.room_chatbots FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_memberships rm
    WHERE rm.room_id = room_chatbots.room_id
    AND rm.student_id = auth.uid()::uuid
  )
);

-- =====================
-- CHAT_MESSAGES POLICIES
-- =====================
-- NOTE: user_id in chat_messages is UUID, requires proper casting

-- Users can view their own messages
CREATE POLICY "users_can_view_own_messages" 
ON public.chat_messages FOR SELECT 
USING (user_id = auth.uid()::uuid);

-- Users can view all assistant and system messages
CREATE POLICY "users_can_view_assistant_and_system_messages" 
ON public.chat_messages FOR SELECT 
USING (role = 'assistant' OR role = 'system');

-- Users can manage (update/delete) their own messages
CREATE POLICY "users_can_manage_own_messages" 
ON public.chat_messages FOR ALL 
USING (user_id = auth.uid()::uuid);

-- Users can see messages in rooms they belong to
CREATE POLICY "users_can_view_messages_in_their_rooms" 
ON public.chat_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_memberships rm
    WHERE rm.room_id = chat_messages.room_id
    AND rm.student_id = auth.uid()::uuid
  ) OR
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.room_id = chat_messages.room_id
    AND r.teacher_id = auth.uid()::uuid
  )
);

-- Users can send messages in rooms they belong to
CREATE POLICY "users_can_insert_messages_in_their_rooms" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
  user_id = auth.uid()::uuid AND (
    EXISTS (
      SELECT 1 FROM public.room_memberships rm
      WHERE rm.room_id = chat_messages.room_id
      AND rm.student_id = auth.uid()::uuid
    ) OR
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.room_id = chat_messages.room_id
      AND r.teacher_id = auth.uid()::uuid
    )
  )
);

-- =====================
-- DOCUMENTS POLICIES
-- =====================
-- NOTE: teacher_id in documents is UUID, requires proper casting

-- Teachers can manage documents for their chatbots
CREATE POLICY "teachers_can_manage_own_documents" 
ON public.documents FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.chatbots c
    WHERE c.chatbot_id = documents.chatbot_id
    AND c.teacher_id = auth.uid()::uuid
  )
);

-- =====================
-- DOCUMENT_CHUNKS POLICIES
-- =====================

-- Teachers can manage document chunks for their documents
CREATE POLICY "teachers_can_manage_document_chunks" 
ON public.document_chunks FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.chatbots c ON d.chatbot_id = c.chatbot_id
    WHERE d.document_id = document_chunks.document_id
    AND c.teacher_id = auth.uid()::uuid
  )
);

-- =====================
-- FLAGGED_MESSAGES POLICIES
-- =====================
-- NOTE: teacher_id in flagged_messages is UUID, requires proper casting

-- Teachers can view and manage flags for their students
CREATE POLICY "teachers_can_manage_flags" 
ON public.flagged_messages FOR ALL 
USING (teacher_id = auth.uid()::uuid);

-- =====================
-- STUDENT_ASSESSMENTS POLICIES
-- =====================
-- NOTE: student_id in student_assessments is UUID, requires proper casting

-- Students can view their own assessments
CREATE POLICY "students_can_view_own_assessments" 
ON public.student_assessments FOR SELECT 
USING (student_id = auth.uid()::uuid);

-- Teachers can view and manage assessments for their chatbots
CREATE POLICY "teachers_can_manage_assessments" 
ON public.student_assessments FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.chatbots c
    WHERE c.chatbot_id = student_assessments.chatbot_id
    AND c.teacher_id = auth.uid()::uuid
  )
);