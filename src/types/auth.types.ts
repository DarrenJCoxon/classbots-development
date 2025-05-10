// src/types/auth.types.ts
import { User, Session } from '@supabase/supabase-js';
import { UserRole } from './database.types';

export interface AuthUser extends User {
  role?: UserRole;
  school_id?: string;
}

export interface AuthSession extends Session {
  user: AuthUser;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
  role: UserRole;
  schoolId?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface MagicLinkData {
  email: string;
  schoolId: string;
}