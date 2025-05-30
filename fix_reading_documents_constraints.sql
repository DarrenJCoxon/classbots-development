-- Fix the reading_documents table to allow NULL file_path for video content
-- This is necessary because videos don't have file paths, only URLs

-- Step 1: Remove the NOT NULL constraint from file_path
ALTER TABLE public.reading_documents 
ALTER COLUMN file_path DROP NOT NULL;

-- Step 2: Also make file_url nullable since videos don't use it
ALTER TABLE public.reading_documents 
ALTER COLUMN file_url DROP NOT NULL;

-- Step 3: Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'reading_documents'
    AND column_name IN ('file_path', 'file_url')
ORDER BY ordinal_position;

-- Step 4: Now try adding the video document again
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
    NULL, -- NULL file path for videos
    NULL, -- NULL file URL for videos
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

-- Step 5: Verify it was added
SELECT 
    c.name as chatbot_name,
    rd.content_type,
    rd.video_url,
    rd.video_platform,
    rd.video_id
FROM public.chatbots c
JOIN public.reading_documents rd ON c.chatbot_id = rd.chatbot_id
WHERE c.chatbot_id = '05afc9a1-3f83-4cd2-b74e-c9f051b9a96b';