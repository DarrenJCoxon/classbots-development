// src/types/knowledge-base.types.ts
export type DocumentType = 'pdf' | 'docx' | 'txt' | 'webpage'; // MODIFIED: Added 'webpage'

export type DocumentStatus = 'uploaded' | 'processing' | 'completed' | 'error' | 'fetched'; // MODIFIED: Added 'fetched' for URLs

export type ChunkStatus = 'pending' | 'embedded' | 'error';

export interface Document {
  document_id: string;
  chatbot_id: string;
  file_name: string; // For webpages, this might be the <title> or a truncated URL
  file_path: string; // For webpages, this will be the original URL
  file_type: DocumentType;
  file_size: number; // For webpages, this could be the size of the extracted text
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
  uploadUrl?: string; // This might not be relevant for URLs
}

export interface ProcessingStats {
  totalChunks: number;
  processedChunks: number;
  errorChunks: number;
}