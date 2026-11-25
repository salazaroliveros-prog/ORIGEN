import { describe, expect, it } from 'vitest';

import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  ErrorCodes,
  ExternalServiceError,
  FirestoreError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  formatErrorResponse,
  handleAsyncError,
  isAppError,
  isOperationalError,
} from './errors';

describe('Clases de error de dominio', () => {
  it('ValidationError expone código/estado/details', () => {
    const err = new ValidationError('Datos inválidos', { field: 'monto' });
    expect(err.name).toBe('ValidationError');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.isOperational).toBe(true);
    expect(err.details).toEqual({ field: 'monto' });
    expect(isAppError(err)).toBe(true);
    expect(isOperationalError(err)).toBe(true);
  });

  it('AuthenticationError y AuthorizationError usan mensajes por defecto', () => {
    expect(new AuthenticationError().message).toBe('Autenticación requerida');
    expect(new AuthenticationError().statusCode).toBe(401);
    expect(new AuthorizationError().statusCode).toBe(403);
    expect(new AuthorizationError().message).toBe('No tiene permisos para realizar esta acción');
  });

  it('NotFoundError construye mensaje con o sin identificador', () => {
    expect(new NotFoundError('Proyecto').message).toBe('Proyecto no encontrado');
    expect(new NotFoundError('Proyecto', 'p-1').message).toBe('Proyecto no encontrado: p-1');
    expect(new NotFoundError('Proyecto').statusCode).toBe(404);
  });

  it('ConflictError, RateLimitError, ExternalServiceError tienen sus status', () => {
    expect(new ConflictError('Duplicado').statusCode).toBe(409);
    const rl = new RateLimitError(undefined, 30);
    expect(rl.statusCode).toBe(429);
    expect(rl.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(rl.retryAfter).toBe(30);
    const ext = new ExternalServiceError('Fallo IA', 'gemini');
    expect(ext.statusCode).toBe(502);
    expect(ext.service).toBe('gemini');
  });

  it('FirestoreError encapsula el error original', () => {
    const original = new Error('timeout');
    const err = new FirestoreError('No se pudo leer', original);
    expect(err.statusCode).toBe(500);
    expect(err.originalError).toBe(original);
  });
});

describe('isAppError / isOperationalError', () => {
  it('reconoce solo errores operacionales de la app', () => {
    expect(isAppError(new ValidationError('x'))).toBe(true);
    expect(isAppError(new Error('genérico'))).toBe(false);
    expect(isAppError('string')).toBe(false);
    expect(isOperationalError(new Error('genérico'))).toBe(false);
  });
});

describe('formatErrorResponse', () => {
  it('mapea un AppError con su código/estado', () => {
    const res = formatErrorResponse(new ValidationError('Inválido', { a: 1 }));
    expect(res).toMatchObject({
      error: 'Inválido',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: { a: 1 },
    });
  });

  it('un AppError sin details no incluye details distinto de undefined', () => {
    const res = formatErrorResponse(new AuthenticationError());
    expect(res.details).toBeUndefined();
    expect(res.statusCode).toBe(401);
  });

  it('un Error genérico se clasifica como INTERNAL_ERROR 500 sin details', () => {
    const res = formatErrorResponse(new Error('boom'));
    expect(res).toMatchObject({ error: 'boom', code: 'INTERNAL_ERROR', statusCode: 500 });
    expect('details' in res).toBe(false);
  });

  it('un valor desconocido se clasifica como UNKNOWN_ERROR 500', () => {
    expect(formatErrorResponse({ raro: true })).toMatchObject({
      error: 'Error desconocido',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
    });
  });
});

describe('handleAsyncError', () => {
  it('resuelve con [data, null]', async () => {
    const [data, error] = await handleAsyncError(Promise.resolve(42));
    expect(data).toBe(42);
    expect(error).toBeNull();
  });

  it('envuelve errores no-App en el constructor indicado (FirestoreError por defecto)', async () => {
    const [data, error] = await handleAsyncError(Promise.reject(new Error('fallo red')));
    expect(data).toBeNull();
    expect(error).toBeInstanceOf(FirestoreError);
    expect(error?.message).toBe('fallo red');
    expect((error as FirestoreError).originalError).toBeInstanceOf(Error);
  });

  it('propaga tal cual un AppError ya clasificado', async () => {
    const original = new ValidationError('ya clasificado');
    const [, error] = await handleAsyncError(Promise.reject(original));
    expect(error).toBe(original);
  });

  it('admite un constructor de error personalizado', async () => {
    const [, error] = await handleAsyncError(Promise.reject(new Error('bad')), ValidationError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error?.message).toBe('bad');
  });

  it('normaliza rechazos que no son Error', async () => {
    const [, error] = await handleAsyncError(Promise.reject('texto'));
    expect(error).toBeInstanceOf(FirestoreError);
    expect(error?.message).toBe('Error desconocido');
  });
});

describe('ErrorCodes', () => {
  it('expone todos los códigos esperados', () => {
    expect(Object.keys(ErrorCodes).sort()).toEqual(
      [
        'AUTHENTICATION_ERROR',
        'AUTHORIZATION_ERROR',
        'CONFLICT',
        'EXTERNAL_SERVICE_ERROR',
        'FIRESTORE_ERROR',
        'INTERNAL_ERROR',
        'NOT_FOUND',
        'RATE_LIMIT_EXCEEDED',
        'UNKNOWN_ERROR',
        'VALIDATION_ERROR',
      ].sort()
    );
  });
});
