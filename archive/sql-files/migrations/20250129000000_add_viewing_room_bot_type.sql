-- Add viewing_room to bot_type enum if using enum constraint
-- This migration adds support for viewing_room bot type

-- If there's a CHECK constraint on bot_type, we need to update it
-- First, let's check if there's any constraint and update it if needed

-- For PostgreSQL, if bot_type is using a CHECK constraint:
DO $$ 
BEGIN
    -- Check if there's a constraint on bot_type column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'chatbots' 
        AND column_name = 'bot_type'
    ) THEN
        -- Drop the existing constraint
        ALTER TABLE chatbots DROP CONSTRAINT IF EXISTS chatbots_bot_type_check;
        
        -- Add the new constraint including viewing_room
        ALTER TABLE chatbots ADD CONSTRAINT chatbots_bot_type_check 
        CHECK (bot_type IN ('learning', 'assessment', 'reading_room', 'viewing_room'));
    END IF;
END $$;

-- If bot_type is using an ENUM type (PostgreSQL specific):
DO $$ 
BEGIN
    -- Check if bot_type_enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bot_type_enum') THEN
        -- Add viewing_room to the enum if it doesn't exist
        ALTER TYPE bot_type_enum ADD VALUE IF NOT EXISTS 'viewing_room';
    END IF;
END $$;

-- Add a comment to document the new bot type
COMMENT ON COLUMN chatbots.bot_type IS 'Bot type: learning (general chat), assessment (evaluate responses), reading_room (PDF viewer + chat), viewing_room (video viewer + chat)';