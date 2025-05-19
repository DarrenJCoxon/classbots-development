-- supabase/functions/create_magic_link_tokens_table.sql
-- Function to create magic_link_tokens table if it doesn't exist
CREATE OR REPLACE FUNCTION create_magic_link_tokens_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'magic_link_tokens'
  ) THEN
    CREATE TABLE public.magic_link_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      token TEXT NOT NULL UNIQUE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      room_id UUID REFERENCES public.rooms(room_id) ON DELETE CASCADE,
      room_code TEXT NOT NULL,
      student_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ
    );

    -- Add indexes for performance
    CREATE INDEX idx_magic_link_tokens_token ON public.magic_link_tokens(token);
    CREATE INDEX idx_magic_link_tokens_user_id ON public.magic_link_tokens(user_id);
    CREATE INDEX idx_magic_link_tokens_room_id ON public.magic_link_tokens(room_id);
    
    -- Add RLS policies
    ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;
    
    -- Policy for teachers to see tokens for their rooms
    CREATE POLICY "Teachers can see tokens for their rooms"
      ON public.magic_link_tokens
      FOR SELECT 
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.rooms
          WHERE rooms.room_id = magic_link_tokens.room_id
          AND rooms.teacher_id = auth.uid()
        )
      );
    
    -- Policy for students to use their own tokens
    CREATE POLICY "Students can see their own tokens"
      ON public.magic_link_tokens
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
    
    -- Policy for token verification (public)
    CREATE POLICY "Anyone can verify tokens"
      ON public.magic_link_tokens
      FOR SELECT
      TO anon, authenticated
      USING (token IS NOT NULL);
      
    -- Policy for updating tokens when used
    CREATE POLICY "Update tokens when used"
      ON public.magic_link_tokens
      FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;