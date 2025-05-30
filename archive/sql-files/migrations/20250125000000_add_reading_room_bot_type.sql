-- Add reading_room as a valid bot_type for chatbots

-- First, add a CHECK constraint to ensure only valid bot types are used
-- Note: If a constraint already exists, we need to drop it first
DO $$ 
BEGIN
    -- Check if constraint exists and drop it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'chatbots' 
        AND constraint_name LIKE '%bot_type%'
    ) THEN
        ALTER TABLE public.chatbots 
        DROP CONSTRAINT IF EXISTS chatbots_bot_type_check;
    END IF;
END $$;

-- Add the new constraint with all three bot types
ALTER TABLE public.chatbots 
ADD CONSTRAINT chatbots_bot_type_check 
CHECK (bot_type IN ('learning', 'assessment', 'reading_room'));

-- Add comment explaining the bot types
COMMENT ON COLUMN public.chatbots.bot_type IS 'Type of chatbot: learning (general Q&A with optional RAG), assessment (evaluates student responses), reading_room (guided reading with document display)';