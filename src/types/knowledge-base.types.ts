// src/types/knowledge-base.types.ts
export type DocumentType = 'pdf' | 'docx' | 'txt';

export type DocumentStatus = 'uploaded' | 'processing' | 'completed' | 'error';

export type ChunkStatus = 'pending' | 'embedded' | 'error';

export interface Document {
  document_id: string;
  chatbot_id: string;
  file_name: string;
  file_path: string;
  file_type: DocumentType;
  file_size: number;
  status: DocumentStatus;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  chunk_id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  token_count: number;
  status: ChunkStatus;
  embedding_id?: string;
  created_at: string;
}

export interface DocumentUploadResponse {
  document: Document;
  uploadUrl?: string;
}

export interface ProcessingStats {
  totalChunks: number;
  processedChunks: number;
  errorChunks: number;
}