import { NextRequest, NextResponse } from 'next/server';

export const MAX_TEXT_LENGTH = 4000;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000;

export function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function isNonEmptyString(value: unknown, maxLength = MAX_TEXT_LENGTH): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

export function sanitizePathSegment(value: unknown, fallback = 'proyecto'): string {
  if (typeof value !== 'string') return fallback;
  const clean = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64);
  return clean || fallback;
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export function extensionForMime(mime: string): string {
  return MIME_EXTENSIONS[mime.toLowerCase()] ?? 'jpg';
}

export function isDataUrlImage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_IMAGE_DATA_URL_LENGTH &&
    /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value)
  );
}

export async function readJsonBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Validation middleware
export interface ValidationRule<T> {
  field: string;
  validate: (value: unknown) => { valid: boolean; error?: string };
  required?: boolean;
}

export function createValidator<T extends Record<string, unknown>>(rules: ValidationRule<T>[]) {
  return (data: T): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    for (const rule of rules) {
      const value = data[rule.field];
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Campo requerido: ${rule.field}`);
        continue;
      }
      if (value !== undefined && value !== null) {
        const result = rule.validate(value);
        if (!result.valid) {
          errors.push(result.error || `Validación fallida para: ${rule.field}`);
        }
      }
    }
    return { valid: errors.length === 0, errors };
  };
}

// Common validation rules
export const validators = {
  string: (min = 1, max = MAX_TEXT_LENGTH) => (value: unknown) =>
    typeof value === 'string' && value.length >= min && value.length <= max
      ? { valid: true }
      : { valid: false, error: `Debe ser un string entre ${min} y ${max} caracteres` },

  email: () => (value: unknown) =>
    typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? { valid: true }
      : { valid: false, error: 'Email inválido' },

  number: (min = -Infinity, max = Infinity) => (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
      ? { valid: true }
      : { valid: false, error: `Debe ser un número entre ${min} y ${max}` },

  positiveNumber: () => (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0
      ? { valid: true }
      : { valid: false, error: 'Debe ser un número positivo' },

  enum: <T extends string>(values: T[]) => (value: unknown) =>
    typeof value === 'string' && values.includes(value as T)
      ? { valid: true }
      : { valid: false, error: `Debe ser uno de: ${values.join(', ')}` },

  uuid: () => (value: unknown) =>
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
      ? { valid: true }
      : { valid: false, error: 'Debe ser un UUID válido' },

  dateISO: () => (value: unknown) =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value))
      ? { valid: true }
      : { valid: false, error: 'Fecha inválida (formato YYYY-MM-DD)' },
};