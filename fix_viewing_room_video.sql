-- Fix for viewing room bots without video documents
-- This will add a test video URL to one of your viewing room bots

-- First, let's see your viewing room bots again
SELECT chatbot_id, name, bot_type 
FROM public.chatbots 
WHERE bot_type = 'viewing_room'
ORDER BY created_at DESC;

-- Add a video document for the "Youtube video test" bot
-- Replace the video URL with your actual YouTube URL if you have one
INSERT INTO public.reading_documents (
    chatbot_id,
    content_type,
    file_name,
    file_path,
    file_url,
    file_size,
    video_url,
    video_platform,
    video_id,
    video_metadata
) VALUES (
    '05afc9a1-3f83-4cd2-b74e-c9f051b9a96b', -- Youtube video test bot ID
    'video',
    'Test YouTube Video',
    NULL, -- No file path for videos
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', -- Example YouTube URL (Rick Astley - Never Gonna Give You Up)
    0, -- File size 0 for videos
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'youtube',
    'dQw4w9WgXcQ',
    jsonb_build_object(
        'platform', 'youtube',
        'videoId', 'dQw4w9WgXcQ',
        'embedUrl', 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'originalUrl', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'capturedAt', now()::text
    )
);

-- Verify it was added
SELECT 
    c.name as chatbot_name,
    rd.*
FROM public.chatbots c
JOIN public.reading_documents rd ON c.chatbot_id = rd.chatbot_id
WHERE c.chatbot_id = '05afc9a1-3f83-4cd2-b74e-c9f051b9a96b';