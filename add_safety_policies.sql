-- Allow students to read their own safety messages
CREATE POLICY student_read_safety_messages ON public.chat_messages
  FOR SELECT
  USING (
    role = 'system' AND 
    user_id = auth.uid() AND 
    (metadata->>'isSystemSafetyResponse')::boolean = true
  );
  
-- Ensure student_chatbot_instances access is properly secured
CREATE POLICY student_instance_read_access ON public.student_chatbot_instances
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY student_instance_insert_access ON public.student_chatbot_instances
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY student_instance_update_access ON public.student_chatbot_instances
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());
