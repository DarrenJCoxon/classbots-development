-- Migration: Add student_chatbot_instances table
-- This table creates a unique instance for each student-chatbot-room combination
-- Allowing students to have their own chat history with a chatbot in a room

-- Create the student_chatbot_instances table
CREATE TABLE IF NOT EXISTS public.student_chatbot_instances (
    instance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(chatbot_id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(room_id) ON DELETE CASCADE,
    instance_name TEXT, -- Optional custom name for this instance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- Ensure each student has only one instance of each chatbot in each room
    UNIQUE (student_id, chatbot_id, room_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_chatbot_instances_student_id ON public.student_chatbot_instances(student_id);
CREATE INDEX IF NOT EXISTS idx_student_chatbot_instances_chatbot_id ON public.student_chatbot_instances(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_student_chatbot_instances_room_id ON public.student_chatbot_instances(room_id);

-- Add a function to automatically create chatbot instances for students when they join a room
CREATE OR REPLACE FUNCTION public.create_student_chatbot_instances()
RETURNS TRIGGER AS $$
BEGIN
    -- When a student joins a room, create instances for all chatbots in that room
    INSERT INTO public.student_chatbot_instances (student_id, chatbot_id, room_id)
    SELECT 
        NEW.student_id,
        rc.chatbot_id,
        NEW.room_id
    FROM 
        public.room_chatbots rc
    WHERE 
        rc.room_id = NEW.room_id
    ON CONFLICT (student_id, chatbot_id, room_id) 
    DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function when a student joins a room
DROP TRIGGER IF EXISTS create_student_chatbot_instances_trigger ON public.room_memberships;
CREATE TRIGGER create_student_chatbot_instances_trigger
AFTER INSERT ON public.room_memberships
FOR EACH ROW
EXECUTE FUNCTION public.create_student_chatbot_instances();

-- Create a function to automatically create chatbot instances when a chatbot is added to a room
CREATE OR REPLACE FUNCTION public.create_chatbot_instances_for_new_room_chatbot()
RETURNS TRIGGER AS $$
BEGIN
    -- When a chatbot is added to a room, create instances for all students in that room
    INSERT INTO public.student_chatbot_instances (student_id, chatbot_id, room_id)
    SELECT 
        rm.student_id,
        NEW.chatbot_id,
        NEW.room_id
    FROM 
        public.room_memberships rm
    WHERE 
        rm.room_id = NEW.room_id
    ON CONFLICT (student_id, chatbot_id, room_id) 
    DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function when a chatbot is added to a room
DROP TRIGGER IF EXISTS create_chatbot_instances_for_new_room_chatbot_trigger ON public.room_chatbots;
CREATE TRIGGER create_chatbot_instances_for_new_room_chatbot_trigger
AFTER INSERT ON public.room_chatbots
FOR EACH ROW
EXECUTE FUNCTION public.create_chatbot_instances_for_new_room_chatbot();

-- Update chat_messages table to reference the instance_id
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES public.student_chatbot_instances(instance_id) ON DELETE SET NULL;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_chat_messages_instance_id ON public.chat_messages(instance_id);

-- Create a function to migrate existing data (this will run when the migration is applied)
-- This will populate student_chatbot_instances for existing students and rooms
DO $$
DECLARE
    membership RECORD;
    chatbot RECORD;
BEGIN
    -- For each existing room membership
    FOR membership IN SELECT * FROM public.room_memberships
    LOOP
        -- For each chatbot in the room
        FOR chatbot IN SELECT chatbot_id FROM public.room_chatbots WHERE room_id = membership.room_id
        LOOP
            -- Create a student chatbot instance
            INSERT INTO public.student_chatbot_instances (student_id, chatbot_id, room_id)
            VALUES (membership.student_id, chatbot.chatbot_id, membership.room_id)
            ON CONFLICT (student_id, chatbot_id, room_id) 
            DO NOTHING;
        END LOOP;
    END LOOP;
END
$$;

-- Create a function to update existing chat_messages with instance_id (this will run when the migration is applied)
DO $$
DECLARE
    message RECORD;
    found_instance_id UUID;
BEGIN
    -- For each message with a chatbot_id in metadata
    FOR message IN 
        SELECT 
            m.message_id, 
            m.room_id, 
            m.user_id, 
            m.metadata->>'chatbotId' AS chatbot_id 
        FROM 
            public.chat_messages m 
        WHERE 
            m.metadata->>'chatbotId' IS NOT NULL
    LOOP
        -- Try to parse the chatbot_id as UUID, only proceed if valid
        BEGIN
            -- Find the corresponding instance_id
            SELECT sci.instance_id INTO found_instance_id
            FROM public.student_chatbot_instances sci
            WHERE 
                sci.room_id = message.room_id AND
                sci.student_id = message.user_id AND
                sci.chatbot_id = message.chatbot_id::uuid;
                
            -- If an instance was found, update the message
            IF found_instance_id IS NOT NULL THEN
                UPDATE public.chat_messages
                SET instance_id = found_instance_id
                WHERE message_id = message.message_id;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- Skip invalid UUIDs
                RAISE NOTICE 'Skipping message with invalid chatbot_id: %', message.chatbot_id;
                CONTINUE;
        END;
    END LOOP;
END
$$;