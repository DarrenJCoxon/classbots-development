-- Add document info columns to skolrread_sessions table if they don't exist
-- This allows us to store document info directly without creating a documents record

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skolrread_sessions' AND column_name = 'document_name') THEN
        ALTER TABLE skolrread_sessions ADD COLUMN document_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skolrread_sessions' AND column_name = 'document_path') THEN
        ALTER TABLE skolrread_sessions ADD COLUMN document_path TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skolrread_sessions' AND column_name = 'document_type') THEN
        ALTER TABLE skolrread_sessions ADD COLUMN document_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skolrread_sessions' AND column_name = 'document_size') THEN
        ALTER TABLE skolrread_sessions ADD COLUMN document_size INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skolrread_sessions' AND column_name = 'document_url') THEN
        ALTER TABLE skolrread_sessions ADD COLUMN document_url TEXT;
    END IF;
END $$;

-- Make main_document_id nullable for the new approach
ALTER TABLE skolrread_sessions
ALTER COLUMN main_document_id DROP NOT NULL;

-- Add comments to explain the columns
COMMENT ON COLUMN skolrread_sessions.document_name IS 'Name of the document for reading';
COMMENT ON COLUMN skolrread_sessions.document_path IS 'Storage path of the uploaded document';
COMMENT ON COLUMN skolrread_sessions.document_type IS 'File type (pdf, docx, txt)';
COMMENT ON COLUMN skolrread_sessions.document_size IS 'File size in bytes';
COMMENT ON COLUMN skolrread_sessions.document_url IS 'URL to access the document';