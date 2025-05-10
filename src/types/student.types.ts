// src/types/student.types.ts - Add this new file
import { Room, Chatbot } from './database.types';

export interface StudentRoom extends Room {
  joined_at: string;
  chatbots: Chatbot[];
}