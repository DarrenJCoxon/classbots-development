import { NextResponse } from 'next/server';

export interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createErrorResponse(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: string
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      ...(code && { code }),
      ...(details && { details })
    },
    { status: statusCode }
  );
}

export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data
    },
    { status: statusCode }
  );
}

export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    return createErrorResponse(error.message, error.statusCode, error.code, error.details);
  }

  if (error instanceof Error) {
    return createErrorResponse(error.message, 500, 'INTERNAL_ERROR');
  }

  return createErrorResponse('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
}

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_INACTIVE: 'ROOM_INACTIVE',
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  INVALID_REQUEST: 'INVALID_REQUEST',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMITED: 'RATE_LIMITED'
} as const;