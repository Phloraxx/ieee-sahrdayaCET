import { NextResponse } from 'next/server';
import { AppwriteException } from 'node-appwrite';
import { ZodError } from 'zod';
import { logger } from '@/lib/api/logger';

// ============================================================================
// Error Types
// ============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public fieldErrors: Record<string, string> = {}
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number,
    public resetAt: Date
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class CapacityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapacityError';
  }
}

export class DuplicateRegistrationError extends Error {
  constructor(
    message: string,
    public registrationId: string
  ) {
    super(message);
    this.name = 'DuplicateRegistrationError';
  }
}

// ============================================================================
// Error Response Interface
// ============================================================================

interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
  field_errors?: Record<string, string>;
  retry_after?: number;
  reset_at?: string;
}

// ============================================================================
// Error Handlers
// ============================================================================

/**
 * Handle Appwrite exceptions
 */
function handleAppwriteError(error: AppwriteException): { status: number; response: ErrorResponse } {
  logger.warn('Appwrite error', { code: error.code, type: error.type, message: error.message });

  switch (error.code) {
    case 401:
      return {
        status: 401,
        response: {
          error: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in.',
        },
      };

    case 403:
      return {
        status: 403,
        response: {
          error: 'FORBIDDEN',
          message: 'You do not have permission to perform this action.',
        },
      };

    case 404:
      return {
        status: 404,
        response: {
          error: 'NOT_FOUND',
          message: 'The requested resource was not found.',
        },
      };

    case 409:
      return {
        status: 409,
        response: {
          error: 'CONFLICT',
          message: 'A conflict occurred. The resource may already exist.',
        },
      };

    case 429:
      return {
        status: 429,
        response: {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retry_after: 60,
        },
      };

    case 500:
    case 503:
      return {
        status: 503,
        response: {
          error: 'SERVICE_UNAVAILABLE',
          message: 'The service is temporarily unavailable. Please try again later.',
        },
      };

    default:
      return {
        status: error.code || 500,
        response: {
          error: 'APPWRITE_ERROR',
          message: error.message || 'An error occurred with the database.',
          details: process.env.NODE_ENV === 'development' ? { type: error.type } : undefined,
        },
      };
  }
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError): { status: number; response: ErrorResponse } {
  const fieldErrors: Record<string, string> = {};

  error.issues.forEach((err) => {
    const path = err.path.join('.');
    fieldErrors[path] = err.message;
  });

  logger.warn('Validation error', { fieldErrors });

  return {
    status: 400,
    response: {
      error: 'VALIDATION_ERROR',
      message: 'Please check your input and try again.',
      field_errors: fieldErrors,
    },
  };
}

/**
 * Handle custom validation errors
 */
function handleValidationError(error: ValidationError): { status: number; response: ErrorResponse } {
  logger.warn('Validation error', { message: error.message, fieldErrors: error.fieldErrors });

  return {
    status: 400,
    response: {
      error: 'VALIDATION_ERROR',
      message: error.message,
      field_errors: error.fieldErrors,
    },
  };
}

/**
 * Handle rate limit errors
 */
function handleRateLimitError(error: RateLimitError): { status: number; response: ErrorResponse } {
  logger.warn('Rate limit exceeded', { 
    message: error.message, 
    retryAfter: error.retryAfter,
    resetAt: error.resetAt.toISOString(),
  });

  return {
    status: 429,
    response: {
      error: 'RATE_LIMIT_EXCEEDED',
      message: error.message,
      retry_after: error.retryAfter,
      reset_at: error.resetAt.toISOString(),
    },
  };
}

/**
 * Handle capacity errors
 */
function handleCapacityError(error: CapacityError): { status: number; response: ErrorResponse } {
  logger.warn('Capacity error', { message: error.message });

  return {
    status: 400,
    response: {
      error: 'CAPACITY_EXCEEDED',
      message: error.message,
    },
  };
}

/**
 * Handle duplicate registration errors
 */
function handleDuplicateRegistrationError(
  error: DuplicateRegistrationError
): { status: number; response: ErrorResponse } {
  logger.warn('Duplicate registration', { 
    message: error.message, 
    registrationId: error.registrationId,
  });

  return {
    status: 409,
    response: {
      error: 'ALREADY_REGISTERED',
      message: error.message,
      details: { registration_id: error.registrationId },
    },
  };
}

/**
 * Handle generic errors
 */
function handleGenericError(error: Error): { status: number; response: ErrorResponse } {
  logger.error('Unhandled error', error);

  return {
    status: 500,
    response: {
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? { message: error.message } : undefined,
    },
  };
}

// ============================================================================
// Main Error Handler
// ============================================================================

/**
 * Centralized error handler for API routes
 * Converts errors to appropriate HTTP responses
 */
export function handleError(error: unknown): NextResponse<ErrorResponse> {
  // Appwrite errors
  if (error instanceof AppwriteException) {
    const { status, response } = handleAppwriteError(error);
    return NextResponse.json(response, { status });
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const { status, response } = handleZodError(error);
    return NextResponse.json(response, { status });
  }

  // Custom validation errors
  if (error instanceof ValidationError) {
    const { status, response } = handleValidationError(error);
    return NextResponse.json(response, { status });
  }

  // Rate limit errors
  if (error instanceof RateLimitError) {
    const { status, response } = handleRateLimitError(error);
    return NextResponse.json(response, { status });
  }

  // Capacity errors
  if (error instanceof CapacityError) {
    const { status, response } = handleCapacityError(error);
    return NextResponse.json(response, { status });
  }

  // Duplicate registration errors
  if (error instanceof DuplicateRegistrationError) {
    const { status, response } = handleDuplicateRegistrationError(error);
    return NextResponse.json(response, { status });
  }

  // Generic errors
  if (error instanceof Error) {
    const { status, response } = handleGenericError(error);
    return NextResponse.json(response, { status });
  }

  // Unknown error type
  logger.error('Unknown error type', undefined, { error });
  return NextResponse.json(
    {
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    },
    { status: 500 }
  );
}


