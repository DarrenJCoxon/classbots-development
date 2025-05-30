-- Apply video support to reading_documents table
-- Run this in Supabase SQL Editor if migrations are not applying automatically

-- Add new columns to reading_documents table
ALTER TABLE public.reading_documents
ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'pdf',
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_platform VARCHAR(50),
ADD COLUMN IF NOT EXISTS video_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS video_metadata JSONB;

-- Add check constraint for content_type (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'reading_documents_content_type_check'
    ) THEN
        ALTER TABLE public.reading_documents
        ADD CONSTRAINT reading_documents_content_type_check 
        CHECK (content_type IN ('pdf', 'video'));
    END IF;
END $$;

-- Add check constraint to ensure either file_path or video_url is present (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'reading_documents_content_check'
    ) THEN
        ALTER TABLE public.reading_documents
        ADD CONSTRAINT reading_documents_content_check 
        CHECK (
          (content_type = 'pdf' AND file_path IS NOT NULL) OR 
          (content_type = 'video' AND video_url IS NOT NULL)
        );
    END IF;
END $$;

-- Create index for content_type queries
CREATE INDEX IF NOT EXISTS idx_reading_documents_content_type 
ON public.reading_documents(content_type);

-- Create index for video platform queries
CREATE INDEX IF NOT EXISTS idx_reading_documents_video_platform 
ON public.reading_documents(video_platform) 
WHERE video_platform IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.reading_documents.content_type IS 'Type of content: pdf or video';
COMMENT ON COLUMN public.reading_documents.video_url IS 'Full URL of the video (e.g., YouTube URL)';
COMMENT ON COLUMN public.reading_documents.video_platform IS 'Platform hosting the video (e.g., youtube, vimeo)';
COMMENT ON COLUMN public.reading_documents.video_id IS 'Platform-specific video identifier';
COMMENT ON COLUMN public.reading_documents.video_metadata IS 'Additional video metadata (title, duration, thumbnail, etc.)';

-- Verify the changes
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
ORDER BY ordinal_position;