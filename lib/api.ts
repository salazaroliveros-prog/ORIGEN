import { NextResponse } from 'next/server';

export const MAX_TEXT_LENGTH = 4000;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000;

export function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
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

export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
