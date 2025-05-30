-- Create reading_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS reading_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID DEFAULT gen_random_uuid() NOT NULL,
  chatbot_id UUID NOT NULL REFERENCES chatbots(chatbot_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_type VARCHAR(10) DEFAULT 'pdf',
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chatbot_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reading_documents_chatbot_id ON reading_documents(chatbot_id);

-- Enable RLS
ALTER TABLE reading_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Teachers can view their reading documents" ON reading_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chatbots
      WHERE chatbots.chatbot_id = reading_documents.chatbot_id
      AND chatbots.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert reading documents" ON reading_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chatbots
      WHERE chatbots.chatbot_id = reading_documents.chatbot_id
      AND chatbots.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update their reading documents" ON reading_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chatbots
      WHERE chatbots.chatbot_id = reading_documents.chatbot_id
      AND chatbots.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete their reading documents" ON reading_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chatbots
      WHERE chatbots.chatbot_id = reading_documents.chatbot_id
      AND chatbots.teacher_id = auth.uid()
    )
  );