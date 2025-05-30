-- SQL to check if video columns exist in reading_documents table
-- Run this in Supabase SQL Editor to verify current table structure

-- 1. Check current columns in reading_documents table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'reading_documents'
ORDER BY ordinal_position;

-- 2. Check if specific video columns exist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'reading_documents' 
            AND column_name = 'content_type'
        ) THEN '✓ content_type column exists'
        ELSE '✗ content_type column MISSING'
    END AS content_type_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'reading_documents' 
            AND column_name = 'video_url'
        ) THEN '✓ video_url column exists'
        ELSE '✗ video_url column MISSING'
    END AS video_url_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'reading_documents' 
            AND column_name = 'video_platform'
        ) THEN '✓ video_platform column exists'
        ELSE '✗ video_platform column MISSING'
    END AS video_platform_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'reading_documents' 
            AND column_name = 'video_id'
        ) THEN '✓ video_id column exists'
        ELSE '✗ video_id column MISSING'
    END AS video_id_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'reading_documents' 
            AND column_name = 'video_metadata'
        ) THEN '✓ video_metadata column exists'
        ELSE '✗ video_metadata column MISSING'
    END AS video_metadata_status;

-- 3. Check existing constraints
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'public.reading_documents'::regclass
ORDER BY conname;

-- 4. Check existing indexes
SELECT 
    indexname,
    indexdef
FROM 
    pg_indexes
WHERE 
    schemaname = 'public' 
    AND tablename = 'reading_documents'
ORDER BY indexname;

-- 5. Show sample data to understand current state
SELECT 
    id,
    chatbot_id,
    file_name,
    CASE 
        WHEN file_path IS NOT NULL THEN 'Has file_path' 
        ELSE 'No file_path' 
    END AS file_path_status,
    created_at
FROM 
    public.reading_documents
LIMIT 5;