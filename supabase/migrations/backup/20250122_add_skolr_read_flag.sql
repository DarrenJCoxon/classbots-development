-- Add flag to distinguish Skolr Read documents from knowledge base documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_skolr_read_only BOOLEAN DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN documents.is_skolr_read_only IS 'Indicates if this document is only for Skolr Reader viewing (not part of knowledge base)';