-- Fix flagged_messages table to ensure proper ID generation and constraints

-- First, check if flag_id has a default
DO $$
BEGIN
    -- Add default UUID generation if not exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'flagged_messages' 
        AND column_name = 'flag_id' 
        AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE flagged_messages 
        ALTER COLUMN flag_id SET DEFAULT gen_random_uuid();
    END IF;
END $$;

-- Ensure created_at and updated_at have defaults
ALTER TABLE flagged_messages 
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE flagged_messages 
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Add updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_flagged_messages_updated_at ON flagged_messages;
CREATE TRIGGER update_flagged_messages_updated_at 
BEFORE UPDATE ON flagged_messages 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Ensure RLS is enabled
ALTER TABLE flagged_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Teachers can view their flagged messages" ON flagged_messages;
DROP POLICY IF EXISTS "Service role can insert flagged messages" ON flagged_messages;
DROP POLICY IF EXISTS "Teachers can update their flagged messages" ON flagged_messages;

-- Create RLS policies
-- Teachers can view flags for their rooms
CREATE POLICY "Teachers can view their flagged messages"
ON flagged_messages
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- Service role (admin client) can insert flags
CREATE POLICY "Service role can insert flagged messages"
ON flagged_messages
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow authenticated users (via admin client) to insert flags
CREATE POLICY "Authenticated can insert flagged messages"
ON flagged_messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Teachers can update flags they own
CREATE POLICY "Teachers can update their flagged messages"
ON flagged_messages
FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Add to realtime if needed
ALTER PUBLICATION supabase_realtime ADD TABLE flagged_messages;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_flagged_messages_teacher_id ON flagged_messages(teacher_id);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_created_at ON flagged_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_status ON flagged_messages(status);

-- Verify the structure
COMMENT ON TABLE flagged_messages IS 'Stores safety concerns flagged by the system for teacher review';