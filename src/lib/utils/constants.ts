// src/lib/utils/constants.ts

// App Constants
export const APP_NAME = 'Skolr'; // CHANGED
export const APP_DESCRIPTION = 'Chat Smarter. Learn Faster.'; // UPDATED

// Route Constants
export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  TEACHER_DASHBOARD: '/teacher-dashboard',
  STUDENT: '/student', // This now redirects to /student/dashboard
  STUDENT_DASHBOARD: '/student/dashboard', // Explicitly add if needed
  CHAT: (roomId: string) => `/chat/${roomId}`,
  API: {
    TEACHER: {
      CHATBOTS: '/api/teacher/chatbots',
      ROOMS: '/api/teacher/rooms',
      // Add new API routes as they are created
      ROOM_CHATBOT_ASSOCIATIONS: '/api/teacher/room-chatbots-associations',
      ROOM_DETAILS: '/api/teacher/room-details',
      STUDENT_ROOM_DETAILS: '/api/teacher/student-room-details',
    },
    STUDENT: {
      ROOMS: '/api/student/rooms', // Might be deprecated if dashboard API covers it
      JOIN_ROOM: '/api/student/join-room',
      DASHBOARD_DATA: '/api/student/dashboard-data',
      ASSESSMENT_DETAIL: (assessmentId: string) => `/api/student/assessment-detail?assessmentId=${assessmentId}`,
      // ASSESSMENT_REFLECTION: (assessmentId: string) => `/api/student/assessments/${assessmentId}/reflect`, // Kept commented out
    },
    CHAT: (roomId: string) => `/api/chat/${roomId}`,
  },
} as const;

// Default Chatbot Config
export const DEFAULT_CHATBOT_CONFIG = {
  model: 'openai/gpt-4.1-nano', 
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
  THEME: 'classbots-theme', // Consider changing to 'skolr-theme'
  LAST_ROOM: 'classbots-last-room', // Consider changing
} as const;