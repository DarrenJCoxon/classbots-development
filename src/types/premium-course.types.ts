// Premium Course Types
export interface PremiumCourse {
  course_id: string;
  teacher_id: string;
  
  // Basic course info
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  
  // Media
  thumbnail_url?: string;
  trailer_video_url?: string;
  
  // Course structure
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration_hours?: number;
  language?: string;
  
  // Categorization
  category?: string;
  tags?: string[];
  
  // Premium features
  price_type: 'free' | 'one_time' | 'subscription' | 'tiered';
  price_amount: number;
  currency: string;
  
  // Course settings
  is_published: boolean;
  is_featured: boolean;
  requires_approval: boolean;
  max_students?: number;
  
  // Analytics
  total_enrollments: number;
  average_rating: number;
  total_reviews: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string;
  
  // SEO
  meta_title?: string;
  meta_description?: string;
  
  // Course structure
  lesson_count?: number;
  
  // Relations
  modules?: PremiumCourseModule[];
  lessons?: PremiumCourseLesson[];
}

export interface PremiumCourseModule {
  module_id: string;
  course_id: string;
  title: string;
  description?: string;
  module_order: number;
  is_preview: boolean;
  unlock_after_module?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  lessons?: PremiumCourseLesson[];
}

export interface PremiumCourseLesson {
  lesson_id: string;
  course_id: string;
  module_id?: string;
  
  // Basic lesson info
  title: string;
  description?: string;
  lesson_order: number;
  
  // Video content (self-hosted)
  video_url?: string;
  video_duration_seconds?: number;
  video_thumbnail_url?: string;
  video_quality_levels?: Record<string, string>; // {720p: url, 1080p: url}
  
  // Video metadata
  video_platform?: 'self_hosted' | 'youtube' | 'vimeo' | null;
  video_duration?: number; // for compatibility
  
  // Lesson content
  lesson_type: 'video' | 'text' | 'quiz' | 'assignment' | 'live';
  content_data?: any; // Flexible content storage
  
  // Lesson settings
  is_preview: boolean;
  is_mandatory: boolean;
  estimated_duration_minutes?: number;
  
  // Downloads & Resources
  downloadable_resources?: any; // Array of file URLs and descriptions
  
  created_at: string;
  updated_at: string;
}

export interface PremiumCourseEnrollment {
  enrollment_id: string;
  course_id: string;
  student_id: string;
  
  enrollment_type: 'free' | 'paid' | 'gifted' | 'scholarship';
  price_paid: number;
  payment_id?: string;
  
  progress_percentage: number;
  lessons_completed: number;
  total_lessons: number;
  
  status: 'active' | 'paused' | 'completed' | 'refunded';
  completion_date?: string;
  certificate_issued: boolean;
  
  enrolled_at: string;
  last_accessed: string;
  expires_at?: string;
}

export interface PremiumLessonProgress {
  progress_id: string;
  enrollment_id: string;
  lesson_id: string;
  
  is_completed: boolean;
  progress_percentage: number;
  watch_time_seconds: number;
  
  video_position_seconds: number;
  video_segments_watched?: Array<{start: number; end: number}>;
  playback_speed: number;
  
  rewatch_count: number;
  notes_count: number;
  questions_asked: number;
  
  started_at: string;
  completed_at?: string;
  last_accessed: string;
}

export interface PremiumLessonNote {
  note_id: string;
  lesson_id: string;
  enrollment_id: string | null;
  
  note_content: string;
  
  // For timestamp-based notes (linked to video position)
  video_timestamp?: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Legacy fields for compatibility (to be removed when UI is updated)
  content?: string;
  note_type?: 'general' | 'timestamp' | 'question' | 'highlight';
  is_private?: boolean;
  is_pinned?: boolean;
}

export interface PremiumCourseReview {
  review_id: string;
  course_id: string;
  student_id: string;
  
  rating: number; // 1-5
  review_text?: string;
  
  is_verified: boolean;
  is_featured: boolean;
  is_public: boolean;
  
  created_at: string;
  updated_at: string;
}

// Form types for course creation
export interface CreatePremiumCourseData {
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  thumbnail_url?: string;
  trailer_video_url?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration_hours?: number;
  language?: string;
  category?: string;
  tags?: string[];
  price_type: 'free' | 'one_time' | 'subscription' | 'tiered';
  price_amount: number;
  currency: string;
  requires_approval?: boolean;
  max_students?: number;
  meta_title?: string;
  meta_description?: string;
}

export interface CreatePremiumModuleData {
  title: string;
  description?: string;
  module_order: number;
  is_preview?: boolean;
  unlock_after_module?: string;
}

export interface CreatePremiumLessonData {
  title: string;
  description?: string;
  lesson_order: number;
  lesson_type: 'video' | 'text' | 'quiz' | 'assignment' | 'live';
  module_id?: string;
  video_url?: string;
  video_duration_seconds?: number;
  video_thumbnail_url?: string;
  video_quality_levels?: Record<string, string>;
  content_data?: any;
  is_preview?: boolean;
  is_mandatory?: boolean;
  estimated_duration_minutes?: number;
  downloadable_resources?: any;
}

// API Response types
export interface PremiumCourseResponse {
  course: PremiumCourse;
}

export interface PremiumCoursesResponse {
  courses: PremiumCourse[];
  total: number;
  page: number;
  limit: number;
}

export interface PremiumCourseWithDetails extends PremiumCourse {
  module_count: number;
  lesson_count: number;
  total_duration_minutes: number;
}