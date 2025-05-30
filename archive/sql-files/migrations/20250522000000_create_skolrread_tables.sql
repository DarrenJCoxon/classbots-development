-- Create SkolrRead tables for interactive reading functionality

-- Table: skolrread_sessions
-- Stores information about reading sessions created by teachers
CREATE TABLE IF NOT EXISTS skolrread_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    chatbot_id UUID NOT NULL REFERENCES chatbots(chatbot_id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    main_document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: student_reading_sessions  
-- Tracks individual student progress through reading sessions
CREATE TABLE IF NOT EXISTS student_reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skolrread_session_id UUID NOT NULL REFERENCES skolrread_sessions(session_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    current_page INTEGER DEFAULT 1,
    reading_progress DECIMAL(5,2) DEFAULT 0.0 CHECK (reading_progress >= 0 AND reading_progress <= 100),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(skolrread_session_id, student_id)
);

-- Table: reading_chat_messages
-- Stores chat messages between students and AI during reading sessions
CREATE TABLE IF NOT EXISTS reading_chat_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skolrread_session_id UUID NOT NULL REFERENCES skolrread_sessions(session_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_ai_response BOOLEAN NOT NULL DEFAULT FALSE,
    page_context INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skolrread_sessions_room_id ON skolrread_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_skolrread_sessions_teacher_id ON skolrread_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_skolrread_sessions_status ON skolrread_sessions(status);
CREATE INDEX IF NOT EXISTS idx_student_reading_sessions_session_id ON student_reading_sessions(skolrread_session_id);
CREATE INDEX IF NOT EXISTS idx_student_reading_sessions_student_id ON student_reading_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_reading_chat_messages_session_id ON reading_chat_messages(skolrread_session_id);
CREATE INDEX IF NOT EXISTS idx_reading_chat_messages_student_id ON reading_chat_messages(student_id);

-- Add updated_at trigger for skolrread_sessions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_skolrread_sessions_updated_at 
    BEFORE UPDATE ON skolrread_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE skolrread_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for skolrread_sessions
-- Teachers can view/edit sessions in their rooms
CREATE POLICY "Teachers can manage skolrread sessions in their rooms" ON skolrread_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rooms 
            WHERE rooms.room_id = skolrread_sessions.room_id 
            AND rooms.teacher_id = auth.uid()
        )
    );

-- Students can view active sessions in rooms they belong to
CREATE POLICY "Students can view active sessions in their rooms" ON skolrread_sessions
    FOR SELECT USING (
        status = 'active' AND
        EXISTS (
            SELECT 1 FROM room_memberships rm
            WHERE rm.room_id = skolrread_sessions.room_id 
            AND rm.student_id = auth.uid()
        )
    );

-- Policies for student_reading_sessions
-- Students can manage their own reading sessions
CREATE POLICY "Students can manage their own reading sessions" ON student_reading_sessions
    FOR ALL USING (student_id = auth.uid());

-- Teachers can view reading sessions for students in their rooms
CREATE POLICY "Teachers can view reading sessions in their rooms" ON student_reading_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM skolrread_sessions ss
            JOIN rooms r ON r.room_id = ss.room_id
            WHERE ss.session_id = student_reading_sessions.skolrread_session_id
            AND r.teacher_id = auth.uid()
        )
    );

-- Policies for reading_chat_messages
-- Students can manage their own chat messages
CREATE POLICY "Students can manage their own chat messages" ON reading_chat_messages
    FOR ALL USING (student_id = auth.uid());

-- Teachers can view chat messages for sessions in their rooms
CREATE POLICY "Teachers can view chat messages in their rooms" ON reading_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM skolrread_sessions ss
            JOIN rooms r ON r.room_id = ss.room_id
            WHERE ss.session_id = reading_chat_messages.skolrread_session_id
            AND r.teacher_id = auth.uid()
        )
    );