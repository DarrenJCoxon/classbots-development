// src/types/database.types.ts

// Base common fields for all tables
export interface BaseTable {
  created_at: string;
  updated_at?: string;
}

// User roles enum
export type UserRole = 'teacher' | 'student' | 'school_admin';

// Concern status enum/type
export type ConcernStatus = 'pending' | 'reviewing' | 'resolved' | 'false_positive';

// Knowledge Base Types
export type DocumentType = 'pdf' | 'docx' | 'txt' | 'webpage'; // MODIFIED: Added 'webpage'
export type DocumentStatus = 'uploaded' | 'processing' | 'completed' | 'error' | 'fetched'; // MODIFIED: Added 'fetched'
export type ChunkStatus = 'pending' | 'embedded' | 'error';

// Bot Type Enum
export type BotTypeEnum = 'learning' | 'assessment' | 'reading_room' | 'viewing_room';

// Assessment Status Enum
export type AssessmentStatusEnum = 'ai_processing' | 'ai_completed' | 'teacher_reviewed';


// --- Table Interfaces ---

export interface School extends BaseTable {
  school_id: string;
  name: string;
  magic_link_token?: string;
  token_expires_at?: string;
}

export interface Chatbot extends BaseTable {
  chatbot_id: string;
  name: string;
  description?: string;
  system_prompt: string;
  teacher_id: string;
  model?: string;
  max_tokens?: number | null;
  temperature?: number | null;
  enable_rag?: boolean;
  bot_type?: BotTypeEnum;
  assessment_criteria_text?: string | null;
  welcome_message?: string | null; // <-- ADDED (This was already correct in your original file)
  linked_assessment_bot_id?: string | null; // For linking viewing room to assessment
}

export interface ReadingDocument extends BaseTable {
  id: string;
  chatbot_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
}

export interface Room extends BaseTable {
  room_id: string;
  room_name: string;
  room_code: string;
  teacher_id: string;
  school_id?: string | null;
  is_active: boolean;
  is_archived?: boolean;
  description?: string | null;
}

export interface RoomChatbot extends BaseTable {
  room_id: string;
  chatbot_id: string;
}

export interface RoomMembership extends BaseTable {
  room_id: string;
  student_id: string;
  joined_at: string;
  is_archived?: boolean;
}

export interface ChatMessage extends BaseTable {
    message_id: string;
    room_id: string;
    user_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokens_used?: number;
    metadata?: {
        chatbotId?: string | null;
        error?: unknown;
        isAssessmentFeedback?: boolean;
        isAssessmentPlaceholder?: boolean;
        assessmentId?: string | null;
        isWelcomeMessage?: boolean; // <-- ADDED (Optional, for client-side identification) (This was already correct in your original file)
        [key: string]: unknown;
    } | null;
}

export interface Profile extends BaseTable {
  user_id: string;
  full_name?: string;
  email: string;
  role: UserRole;
  school_id?: string | null;
  country_code?: string | null;
  pin_code?: string | null; // PIN code for student login
  username?: string | null; // Username for student login
  last_pin_change?: string | null; // When PIN was last changed
  pin_change_by?: string | null; // Who changed the PIN
  avatar_url?: string | null;
  is_anonymous?: boolean;
  year_group?: string | null; // Year/Grade level (only for students)
}

// Teacher profile view interface
export interface TeacherProfile extends BaseTable {
  user_id: string;
  email: string;
  role: 'teacher';
  school_id?: string | null;
  full_name?: string;
  avatar_url?: string | null;
  country_code?: string | null;
}

// Student profile view interface
export interface StudentProfile extends BaseTable {
  user_id: string;
  email: string;
  role: 'student';
  school_id?: string | null;
  full_name?: string;
  avatar_url?: string | null;
  username?: string | null;
  pin_code?: string | null;
  last_pin_change?: string | null;
  pin_change_by?: string | null;
  is_anonymous?: boolean;
  country_code?: string | null;
  display_name?: string; // Computed field
  first_name?: string | null; // Computed field
  surname?: string | null; // Computed field
  year_group?: string | null; // Year/Grade level
}

// THIS IS THE Document INTERFACE WITHIN database.types.ts
export interface Document extends BaseTable {
  document_id: string;
  chatbot_id: string;
  file_name: string;
  file_path: string;
  file_type: DocumentType; // This now correctly uses the MODIFIED DocumentType above
  file_size: number;
  status: DocumentStatus;  // This now correctly uses the MODIFIED DocumentStatus above
  error_message?: string;
}

export interface DocumentChunk extends BaseTable {
  chunk_id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  token_count: number;
  status: ChunkStatus;
  embedding_id?: string;
}

export interface FlaggedMessage extends BaseTable {
  flag_id: string;
  message_id: string;
  student_id: string;
  teacher_id: string;
  room_id: string;
  concern_type: string;
  concern_level: number;
  analysis_explanation?: string;
  context_messages?: Record<string, unknown>;
  status: ConcernStatus;
  reviewed_at?: string;
  reviewer_id?: string | null;
  notes?: string;
}

export interface StudentAssessment extends BaseTable {
    assessment_id: string;
    student_id: string;
    chatbot_id: string;
    room_id: string;
    assessed_message_ids?: string[];
    teacher_id?: string | null;
    teacher_assessment_criteria_snapshot?: string | null;
    ai_feedback_student?: string | null;
    ai_assessment_details_raw?: string | null;
    ai_grade_raw?: string | null;
    ai_assessment_details_teacher?: {
        summary?: string;
        criteria_summary?: string; // Added field for summarized criteria
        strengths?: string[];
        areas_for_improvement?: string[];
        grading_rationale?: string;
        [key: string]: unknown;
    } | null;
    teacher_override_grade?: string | null;
    teacher_override_notes?: string | null;
    status?: AssessmentStatusEnum;
    assessed_at: string;
}

// SkolrRead related interfaces
export interface SkolrReadSession extends BaseTable {
    session_id: string;
    room_id: string;
    chatbot_id: string;
    teacher_id: string;
    title: string;
    description?: string | null;
    main_document_id?: string | null;
    status: 'draft' | 'active' | 'archived';
    // Document info stored directly in session
    document_name?: string | null;
    document_path?: string | null;
    document_type?: string | null;
    document_size?: number | null;
    document_url?: string | null;
}

export interface StudentReadingSession extends BaseTable {
    id: string;
    skolrread_session_id: string;
    student_id: string;
    current_page: number;
    reading_progress: number;
    last_accessed: string;
}

export interface ReadingChatMessage extends BaseTable {
    message_id: string;
    skolrread_session_id: string;
    student_id: string;
    message_text: string;
    is_ai_response: boolean;
    page_context?: number | null;
}


// --- Database Schema Type ---
export interface Database {
  schools: School;
  profiles: Profile;
  teacher_profiles: TeacherProfile; // View
  student_profiles: StudentProfile; // View
  chatbots: Chatbot;
  rooms: Room;
  room_chatbots: RoomChatbot;
  room_memberships: RoomMembership;
  chat_messages: ChatMessage;
  documents: Document; // This now refers to the locally defined Document interface
  document_chunks: DocumentChunk;
  flagged_messages: FlaggedMessage;
  student_assessments: StudentAssessment;
  skolrread_sessions: SkolrReadSession;
  student_reading_sessions: StudentReadingSession;
  reading_chat_messages: ReadingChatMessage;
  reading_documents: ReadingDocument;
}

// --- API Payload Types ---
export interface CreateSchoolPayload {
  name: string;
}

export interface CreateChatbotPayload {
  name: string;
  description?: string;
  system_prompt: string;
  model?: string;
  max_tokens?: number | null;
  temperature?: number | null;
  enable_rag?: boolean;
  bot_type?: BotTypeEnum;
  assessment_criteria_text?: string | null;
  welcome_message?: string | null; // <-- ADDED (This was already correct in your original file)
  video_url?: string; // For viewing room bots
  linked_assessment_bot_id?: string; // For linking to assessment bot
}

export interface CreateRoomPayload {
  room_name: string;
  chatbot_ids: string[];
}

export interface UpdateRoomChatbotsPayload {
  chatbot_ids: string[];
}

export interface JoinRoomPayload {
  room_code: string;
}

export interface SendMessagePayload {
  content: string;
  room_id: string;
  chatbot_id: string;
}

// Payload for updating an assessment (teacher review)
export interface UpdateAssessmentPayload {
    teacher_override_grade?: string | null;
    teacher_override_notes?: string | null;
    status?: AssessmentStatusEnum;
}


// --- API Response Detail Types ---

export interface FlaggedConcernDetails extends FlaggedMessage {
    student_name: string | null;
    room_name: string | null;
    message_content: string | null;
}

export interface StudentRoom extends Room {
  joined_at: string;
  // Chatbot here now includes welcome_message if you want student dashboard to access it
  chatbots: Pick<Chatbot, 'chatbot_id' | 'name' | 'description' | 'bot_type' | 'welcome_message'>[];
}

export interface TeacherRoom extends Room {
   room_chatbots: {
       // Chatbot here could also include welcome_message if teacher room overview needs it
       chatbots: Pick<Chatbot, 'chatbot_id' | 'name' | 'bot_type' | 'welcome_message'> | null;
   }[] | null;
}

// For single student assessment detail API
export interface DetailedAssessmentResponse extends StudentAssessment {
    student_name?: string | null;
    student_email?: string | null;
    chatbot_name?: string | null;
    assessed_conversation?: ChatMessage[];
}

// For the list of assessments for a teacher
export interface AssessmentListSummary extends Pick<
    StudentAssessment,
    'assessment_id' | 'student_id' | 'chatbot_id' | 'room_id' | 'teacher_id' |
    'assessed_at' | 'ai_grade_raw' | 'teacher_override_grade' | 'status'
> {
    student_name?: string | null;
    chatbot_name?: string | null;
    room_name?: string | null;
}

// For the paginated response of assessment lists
export interface PaginatedAssessmentsResponse {
    assessments: AssessmentListSummary[];
    pagination: {
        currentPage: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
    };
}