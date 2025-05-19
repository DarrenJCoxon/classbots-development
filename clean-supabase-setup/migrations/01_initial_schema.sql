-- ClassBots Initial Schema
-- This file creates the base schema for the ClassBots application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgjwt";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types
CREATE TYPE public.user_role AS ENUM ('teacher', 'student');
CREATE TYPE public.concern_status AS ENUM ('pending', 'reviewing', 'resolved', 'false_positive');

-- Schools table
CREATE TABLE IF NOT EXISTS public.schools (
    school_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    magic_link_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role public.user_role NOT NULL,
    school_id UUID REFERENCES public.schools(school_id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    username TEXT,
    pin_code TEXT,
    last_pin_change TIMESTAMP WITH TIME ZONE,
    pin_change_by TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    country_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    room_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_name TEXT NOT NULL,
    room_code TEXT NOT NULL UNIQUE,
    teacher_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(school_id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    allow_anonymous_access BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chatbots table
CREATE TABLE IF NOT EXISTS public.chatbots (
    chatbot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    teacher_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    model TEXT DEFAULT 'gpt-3.5-turbo',
    max_tokens INTEGER DEFAULT 1000,
    temperature NUMERIC(3,2) DEFAULT 0.7,
    enable_rag BOOLEAN DEFAULT false NOT NULL,
    bot_type TEXT DEFAULT 'learning',
    assessment_criteria_text TEXT,
    welcome_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Room_chatbots table (many-to-many)
CREATE TABLE IF NOT EXISTS public.room_chatbots (
    room_id UUID REFERENCES public.rooms(room_id) ON DELETE CASCADE,
    chatbot_id UUID REFERENCES public.chatbots(chatbot_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (room_id, chatbot_id)
);

-- Room_memberships table (many-to-many)
CREATE TABLE IF NOT EXISTS public.room_memberships (
    room_id UUID REFERENCES public.rooms(room_id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (room_id, student_id)
);

-- Chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.rooms(room_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens_used INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Documents table (for RAG)
CREATE TABLE IF NOT EXISTS public.documents (
    document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(chatbot_id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(user_id),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    status TEXT DEFAULT 'uploaded' NOT NULL,
    error_message TEXT,
    original_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Document_chunks table
CREATE TABLE IF NOT EXISTS public.document_chunks (
    chunk_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(document_id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    embedding_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Flagged_messages table (for safety monitoring)
CREATE TABLE IF NOT EXISTS public.flagged_messages (
    flag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(message_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(room_id) ON DELETE CASCADE,
    concern_type TEXT NOT NULL,
    concern_level INTEGER NOT NULL CHECK (concern_level >= 0 AND concern_level <= 5),
    analysis_explanation TEXT,
    context_messages JSONB,
    status public.concern_status DEFAULT 'pending' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL
);

-- Student Assessments
CREATE TABLE IF NOT EXISTS public.student_assessments (
    assessment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(chatbot_id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(room_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' NOT NULL,
    ai_grade_raw INTEGER,
    ai_grade_percent INTEGER,
    ai_feedback_student TEXT,
    ai_feedback_teacher TEXT,
    teacher_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    assessed_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    message_ids_assessed JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chatbots_teacher_id ON public.chatbots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_chatbot_id ON public.documents(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_message_id ON public.flagged_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_status ON public.flagged_messages(status);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_student_id ON public.flagged_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_teacher_id ON public.flagged_messages(teacher_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_room_memberships_student_id ON public.room_memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON public.rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_school_id ON public.rooms(school_id);
CREATE INDEX IF NOT EXISTS idx_rooms_teacher_id ON public.rooms(teacher_id);