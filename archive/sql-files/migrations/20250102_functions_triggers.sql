-- ClassBots Functions and Triggers
-- This file creates utility functions and triggers for automating operations

-- Updated timestamps function (for auto-updating "updated_at" columns)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User creation handler (to auto-create profiles on auth.users insert)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name,
    role
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE NOTICE 'Error creating profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Message duplication prevention function
CREATE OR REPLACE FUNCTION public.prevent_duplicate_messages()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if a similar message was recently added (within 1 second)
    IF EXISTS (
        SELECT 1 FROM public.chat_messages 
        WHERE room_id = NEW.room_id 
        AND user_id = NEW.user_id 
        AND role = NEW.role
        AND content = NEW.content
        AND message_id != NEW.message_id
        AND created_at > (NEW.created_at - interval '1 second')
    ) THEN
        -- Mark the message as a potential duplicate for debugging
        NEW.metadata = jsonb_set(
            COALESCE(NEW.metadata, '{}'::jsonb),
            '{is_potential_duplicate}',
            'true'::jsonb
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers for all tables that need it
DROP TRIGGER IF EXISTS update_chatbots_updated_at ON public.chatbots;
CREATE TRIGGER update_chatbots_updated_at 
BEFORE UPDATE ON public.chatbots 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
BEFORE UPDATE ON public.profiles 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at 
BEFORE UPDATE ON public.rooms 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_schools_updated_at ON public.schools;
CREATE TRIGGER update_schools_updated_at 
BEFORE UPDATE ON public.schools 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at 
BEFORE UPDATE ON public.documents 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_flagged_messages_updated_at ON public.flagged_messages;
CREATE TRIGGER update_flagged_messages_updated_at 
BEFORE UPDATE ON public.flagged_messages 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create duplication check trigger for chat messages
DROP TRIGGER IF EXISTS check_duplicate_messages ON public.chat_messages;
CREATE TRIGGER check_duplicate_messages
BEFORE INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_messages();

-- Create user creation trigger (hooks into auth schema)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();