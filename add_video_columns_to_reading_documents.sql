-- SQL to add video support columns to reading_documents table
-- Only run this AFTER confirming columns are missing using check_reading_documents_video_columns.sql

-- Step 1: Add the missing columns
ALTER TABLE public.reading_documents
ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'pdf',
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_platform VARCHAR(50),
ADD COLUMN IF NOT EXISTS video_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS video_metadata JSONB;

-- Step 2: Update existing records to have content_type = 'pdf' (if not already set)
UPDATE public.reading_documents
SET content_type = 'pdf'
WHERE content_type IS NULL;

-- Step 3: Add constraints with safety checks
DO $$ 
BEGIN
    -- Add content type check constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'reading_documents_content_type_check'
    ) THEN
        ALTER TABLE public.reading_documents
        ADD CONSTRAINT reading_documents_content_type_check 
        CHECK (content_type IN ('pdf', 'video'));
    END IF;

    -- Add content check constraint
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
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding constraints: %', SQLERRM;
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reading_documents_content_type 
ON public.reading_documents(content_type);

CREATE INDEX IF NOT EXISTS idx_reading_documents_video_platform 
ON public.reading_documents(video_platform) 
WHERE video_platform IS NOT NULL;

-- Step 5: Add column comments for documentation
COMMENT ON COLUMN public.reading_documents.content_type IS 'Type of content: pdf or video';
COMMENT ON COLUMN public.reading_documents.video_url IS 'Full URL of the video (e.g., YouTube URL)';
COMMENT ON COLUMN public.reading_documents.video_platform IS 'Platform hosting the video (e.g., youtube, vimeo)';
COMMENT ON COLUMN public.reading_documents.video_id IS 'Platform-specific video identifier';
COMMENT ON COLUMN public.reading_documents.video_metadata IS 'Additional video metadata (title, duration, thumbnail, etc.)';

-- Step 6: Verify the changes were applied
SELECT 
    '=== VERIFICATION RESULTS ===' AS status;

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
    AND column_name IN ('content_type', 'video_url', 'video_platform', 'video_id', 'video_metadata')
ORDER BY ordinal_position;

-- Show constraints
SELECT 
    '=== CONSTRAINTS ===' AS status;

SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'public.reading_documents'::regclass
    AND conname IN ('reading_documents_content_type_check', 'reading_documents_content_check');

-- Show indexes
SELECT 
    '=== INDEXES ===' AS status;

SELECT 
    indexname,
    indexdef
FROM 
    pg_indexes
WHERE 
    schemaname = 'public' 
    AND tablename = 'reading_documents'
    AND indexname IN ('idx_reading_documents_content_type', 'idx_reading_documents_video_platform');