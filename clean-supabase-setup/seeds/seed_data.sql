-- ClassBots Seed Data
-- This file provides minimal test data to get started with development

-- Insert a test school
INSERT INTO public.schools (school_id, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo School');

-- Create a test teacher
-- NOTE: This requires an existing auth.users entry, typically done via Supabase Auth API
-- The SQL below just handles the profile part assuming the auth user exists
INSERT INTO public.profiles (
  user_id, 
  email, 
  role, 
  full_name, 
  school_id
) VALUES (
  '22222222-2222-2222-2222-222222222222',  -- This should match an actual auth.users id
  'teacher@example.com',
  'teacher',
  'Demo Teacher',
  '11111111-1111-1111-1111-111111111111'
) ON CONFLICT (user_id) DO NOTHING;

-- Create a test room
INSERT INTO public.rooms (
  room_id,
  room_name,
  room_code,
  teacher_id,
  school_id
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Demo Classroom',
  'DEMO123',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111'
) ON CONFLICT (room_id) DO NOTHING;

-- Create a test chatbot
INSERT INTO public.chatbots (
  chatbot_id,
  name,
  description,
  system_prompt,
  teacher_id,
  model,
  enable_rag,
  bot_type
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Demo Bot',
  'A simple demo chatbot',
  'You are a helpful AI assistant for students, providing educational support.',
  '22222222-2222-2222-2222-222222222222',
  'openai/gpt-3.5-turbo',
  false,
  'learning'
) ON CONFLICT (chatbot_id) DO NOTHING;

-- Associate the chatbot with the room
INSERT INTO public.room_chatbots (
  room_id, 
  chatbot_id
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
) ON CONFLICT (room_id, chatbot_id) DO NOTHING;

-- NOTE: Student accounts are typically created at runtime
-- when they join a room, so we don't include them in the seed data.