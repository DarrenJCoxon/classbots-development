// src/types/chatbot.types.ts
import type { ChatMessage as DatabaseChatMessage } from './database.types'; // Import the corrected type

// ChatMessage is now imported and used as DatabaseChatMessage or aliased if needed.
// REMOVE the old definition:
// export interface ChatMessage { ... }

export interface ChatbotConfig {
  name: string;
  description?: string;
  systemPrompt: string;
  model?: 'openai/gpt-4.1-mini' | 'google/gemini-2.5-flash-preview-05-20' | 'nvidia/llama-3.1-nemotron-ultra-253b-v1' | 'x-ai/grok-3-mini-beta'; // MODIFIED
  maxTokens?: number;
  temperature?: number;
}

export interface ChatContext {
  chatbotId: string;
  roomId: string;
  systemPrompt: string;
  conversationHistory: DatabaseChatMessage[]; // Use the imported type
}

export interface ChatResponse {
  message: string;
  tokensUsed?: number;
  error?: string;
}