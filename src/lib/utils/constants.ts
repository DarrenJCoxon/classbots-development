// src/lib/utils/constants.ts

// App Constants
export const APP_NAME = 'ClassBots AI';
export const APP_DESCRIPTION = 'AI-powered classroom chatbots for teachers and students';

// Route Constants
export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  TEACHER_DASHBOARD: '/teacher-dashboard',
  STUDENT: '/student',
  CHAT: (roomId: string) => `/chat/${roomId}`,
  API: {
    TEACHER: {
      CHATBOTS: '/api/teacher/chatbots',
      ROOMS: '/api/teacher/rooms',
    },
    STUDENT: {
      ROOMS: '/api/student/rooms',
      JOIN_ROOM: '/api/student/join-room',
    },
    CHAT: (roomId: string) => `/api/chat/${roomId}`,
  },
} as const;

// Default Chatbot Config
export const DEFAULT_CHATBOT_CONFIG = {
  model: 'x-ai/grok-3-mini-beta', // Keeping Grok as default
  maxTokens: 1500,
  temperature: 0.7,
} as const;

// Message Roles
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const;

// User Roles
export const USER_ROLES = {
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'classbots-theme',
  LAST_ROOM: 'classbots-last-room',
} as const;