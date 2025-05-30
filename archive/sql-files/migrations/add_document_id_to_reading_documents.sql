-- Add document_id column to reading_documents table to link with main documents table
ALTER TABLE reading_documents 
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(document_id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_reading_documents_document_id ON reading_documents(document_id);

-- Add comment to explain the column
COMMENT ON COLUMN reading_documents.document_id IS 'Links to the main documents table for unified document management';