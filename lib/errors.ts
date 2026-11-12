import { NextResponse } from 'next/server';

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
  isOperational?: boolean;
}

export class ValidationError extends Error implements AppError {
  code = 'VALIDATION_ERROR';
  statusCode = 400;
  isOperational = true;
  details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error implements AppError {
  code = 'AUTHENTICATION_ERROR';
  statusCode = 401;
  isOperational = true;

  constructor(message = 'Autenticación requerida') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  code = 'AUTHORIZATION_ERROR';
  statusCode = 403;
  isOperational = true;

  constructor(message = 'No tiene permisos para realizar esta acción') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements AppError {
  code = 'NOT_FOUND';
  statusCode = 404;
  isOperational = true;

  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} no encontrado: ${identifier}`
      : `${resource} no encontrado`;
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  code = 'CONFLICT';
  statusCode = 409;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error implements AppError {
  code = 'RATE_LIMIT_EXCEEDED';
  statusCode = 429;
  isOperational = true;
  retryAfter?: number;

  constructor(message = 'Demasiadas solicitudes. Inténtelo de nuevo más tarde.', retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class FirestoreError extends Error implements AppError {
  code = 'FIRESTORE_ERROR';
  statusCode = 500;
  isOperational = true;
  originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'FirestoreError';
    this.originalError = originalError;
  }
}

export class ExternalServiceError extends Error implements AppError {
  code = 'EXTERNAL_SERVICE_ERROR';
  statusCode = 502;
  isOperational = true;
  service?: string;

  constructor(message: string, service?: string) {
    super(message);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof Error && 'isOperational' in error && error.isOperational === true;
}

export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational ?? false;
  }
  return false;
}

export function formatErrorResponse(error: unknown): { error: string; code?: string; statusCode: number; details?: unknown } {
  if (isAppError(error)) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode ?? 500,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    };
  }

  return {
    error: 'Error desconocido',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  };
}

export function handleAsyncError<T>(
  promise: Promise<T>,
  errorConstructor: new (message: string, originalError?: Error) => AppError = FirestoreError
): Promise<[T | null, AppError | null]> {
  return promise
    .then((data) => [data, null] as [T, null])
    .catch((error) => {
      if (isAppError(error)) {
        return [null, error];
      }
      return [null, new errorConstructor(error instanceof Error ? error.message : 'Error desconocido', error instanceof Error ? error : undefined)];
    });
}

export function createErrorResponse(error: unknown): NextResponse {
  const { error: message, code, statusCode, details } = formatErrorResponse(error);
  return NextResponse.json(
    { success: false, error: message, code, details },
    { status: statusCode }
  );
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FIRESTORE_ERROR: 'FIRESTORE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];