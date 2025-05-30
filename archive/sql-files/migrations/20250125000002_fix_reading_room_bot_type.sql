ALTER TABLE public.chatbots DROP CONSTRAINT IF EXISTS chatbots_bot_type_check;

ALTER TABLE public.chatbots 
ADD CONSTRAINT chatbots_bot_type_check 
CHECK (bot_type IN ('learning', 'assessment', 'reading_room'));