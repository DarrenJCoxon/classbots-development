-- Create reading_documents table
CREATE TABLE IF NOT EXISTS public.reading_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(chatbot_id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_chatbot_reading_document UNIQUE (chatbot_id)
);

-- Add RLS policies
ALTER TABLE public.reading_documents ENABLE ROW LEVEL SECURITY;

-- Policy for teachers to manage their own reading documents
CREATE POLICY "Teachers can manage their reading documents" ON public.reading_documents
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.chatbots
            WHERE chatbots.chatbot_id = reading_documents.chatbot_id
            AND chatbots.teacher_id = auth.uid()
        )
    );

-- Policy for students to view reading documents for chatbots they have access to
CREATE POLICY "Students can view reading documents" ON public.reading_documents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.room_chatbots rc
            JOIN public.room_memberships rm ON rm.room_id = rc.room_id
            WHERE rc.chatbot_id = reading_documents.chatbot_id
            AND rm.student_id = auth.uid()
        )
    );

-- Create indexes for performance
CREATE INDEX idx_reading_documents_chatbot_id ON public.reading_documents(chatbot_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_reading_documents_updated_at
    BEFORE UPDATE ON public.reading_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();