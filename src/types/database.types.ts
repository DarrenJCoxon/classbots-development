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
export type DocumentType = 'pdf' | 'docx' | 'txt';
export type DocumentStatus = 'uploaded' | 'processing' | 'completed' | 'error';
export type ChunkStatus = 'pending' | 'embedded' | 'error';

// Bot Type Enum
export type BotTypeEnum = 'learning' | 'assessment';

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
  welcome_message?: string | null; // <-- ADDED
}

export interface Room extends BaseTable {
  room_id: string;
  room_name: string;
  room_code: string;
  teacher_id: string;
  school_id?: string | null;
  is_active: boolean;
}

export interface RoomChatbot extends BaseTable {
  room_id: string;
  chatbot_id: string;
}

export interface RoomMembership extends BaseTable {
  room_id: string;
  student_id: string;
  joined_at: string;
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
        isWelcomeMessage?: boolean; // <-- ADDED (Optional, for client-side identification)
        [key: string]: unknown;
    } | null;
}

export interface Profile extends BaseTable {
  user_id: string;
  full_name?: string;
  email: string;
  role: UserRole;
  school_id?: string | null;
  country_code?: string | null; // <-- ADD THIS
}

export interface Document extends BaseTable {
  document_id: string;
  chatbot_id: string;
  file_name: string;
  file_path: string;
  file_type: DocumentType;
  file_size: number;
  status: DocumentStatus;
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


// --- Database Schema Type ---
export interface Database {
  schools: School;
  profiles: Profile;
  chatbots: Chatbot;
  rooms: Room;
  room_chatbots: RoomChatbot;
  room_memberships: RoomMembership;
  chat_messages: ChatMessage;
  documents: Document;
  document_chunks: DocumentChunk;
  flagged_messages: FlaggedMessage;
  student_assessments: StudentAssessment;
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
  welcome_message?: string | null; // <-- ADDED
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