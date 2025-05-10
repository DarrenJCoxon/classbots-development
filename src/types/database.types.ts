// src/types/database.types.ts

// Base common fields for all tables
export interface BaseTable {
  created_at: string;
  updated_at?: string;
}

// User roles enum
export type UserRole = 'teacher' | 'student';

// Concern status enum/type
export type ConcernStatus = 'pending' | 'reviewing' | 'resolved' | 'false_positive';

// Knowledge Base Types
export type DocumentType = 'pdf' | 'docx' | 'txt';
export type DocumentStatus = 'uploaded' | 'processing' | 'completed' | 'error';
export type ChunkStatus = 'pending' | 'embedded' | 'error';


// --- Table Interfaces ---

// Schools table
export interface School extends BaseTable {
  school_id: string;
  name: string; // Name of the school
  magic_link_token?: string;
  token_expires_at?: string;
}

// Chatbots table
export interface Chatbot extends BaseTable {
  chatbot_id: string;
  name: string; // Name of the chatbot
  description?: string;
  system_prompt: string;
  teacher_id: string; // FK to profiles.user_id
  model?: string;
  max_tokens?: number;
  temperature?: number;
  enable_rag?: boolean;
}

// Rooms table
export interface Room extends BaseTable {
  room_id: string;
  room_name: string;
  room_code: string;
  teacher_id: string; // FK to profiles.user_id
  school_id?: string | null; // FK to schools.school_id (can be null)
  is_active: boolean;
}

// Room to Chatbot mapping table
export interface RoomChatbot extends BaseTable {
  room_id: string; // FK to rooms.room_id
  chatbot_id: string; // FK to chatbots.chatbot_id
}

// Room memberships table (join table)
export interface RoomMembership extends BaseTable {
  room_id: string; // FK to rooms.room_id
  student_id: string; // FK to profiles.user_id
  joined_at: string;
}

// Chat messages table
export interface ChatMessage extends BaseTable {
    message_id: string;
    room_id: string; // FK to rooms.room_id
    user_id: string; // FK to profiles.user_id
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokens_used?: number;
    metadata?: {
        chatbotId?: string | null; // The specific chatbot being interacted with
        error?: unknown; // Potential error storing/sending message (used on client-side)
        [key: string]: unknown; // Allow other arbitrary metadata
    } | null;
}

// User profiles table
export interface Profile extends BaseTable {
  user_id: string; // Primary Key, links to auth.users.id
  // name: string; // REMOVED - Assuming full_name is the primary field now
  full_name?: string; // ADDED - Likely populated from auth signup metadata. Make required (string;) if your trigger guarantees it.
  email: string; // Usually unique, managed by auth
  role: UserRole; // 'teacher' or 'student'
  school_id?: string | null; // FK to schools.school_id (optional)
}

// Knowledge Base Documents table
export interface Document extends BaseTable {
  document_id: string;
  chatbot_id: string; // FK to chatbots.chatbot_id
  file_name: string;
  file_path: string; // Path in Supabase Storage
  file_type: DocumentType;
  file_size: number;
  status: DocumentStatus;
  error_message?: string;
}

// Knowledge Base Document Chunks table
export interface DocumentChunk extends BaseTable {
  chunk_id: string;
  document_id: string; // FK to documents.document_id
  chunk_index: number;
  chunk_text: string;
  token_count: number;
  status: ChunkStatus;
  embedding_id?: string; // Reference to the vector ID in Pinecone (often same as chunk_id)
}

// Flagged Messages table
export interface FlaggedMessage extends BaseTable {
  flag_id: string;
  message_id: string; // FK to chat_messages.message_id
  student_id: string; // FK to profiles.user_id
  teacher_id: string; // FK to profiles.user_id
  room_id: string; // FK to rooms.room_id
  concern_type: string;
  concern_level: number; // 0-5
  analysis_explanation?: string;
  context_messages?: Record<string, unknown>; // JSONB - Consider a more specific type if structure is known
  status: ConcernStatus;
  reviewed_at?: string;
  reviewer_id?: string | null; // FK to profiles.user_id
  notes?: string;
}


// --- Database Schema Type ---
// Combines all table interfaces for Supabase client typing
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
  max_tokens?: number;
  temperature?: number;
  enable_rag?: boolean;
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

// --- API Response Detail Types ---

// Type for joined concern details (used in API response)
export interface FlaggedConcernDetails extends FlaggedMessage {
    student_name: string | null; // Joined from profiles.full_name
    room_name: string | null;    // Joined from rooms.room_name
    message_content: string | null; // Joined from chat_messages.content
}

// Type for rooms listed for students (includes joined chatbot info)
export interface StudentRoom extends Room {
  joined_at: string; // From room_memberships
  chatbots: Pick<Chatbot, 'chatbot_id' | 'name' | 'description'>[]; // Joined via room_chatbots
}

// Type for rooms listed for teachers (includes joined chatbot info)
// This structure matches the API response from /api/teacher/rooms
export interface TeacherRoom extends Room {
   room_chatbots: {
       chatbots: Pick<Chatbot, 'chatbot_id' | 'name'> | null;
   }[] | null;
}