import { NextRequest, NextResponse } from 'next/server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebaseService';
import { jsonError, extensionForMime, sanitizePathSegment } from '@/lib/api';
import { rateLimitMiddleware, getClientIp } from '@/lib/security';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResponse = rateLimitMiddleware(`upload:${clientIp}`);
    if (rateLimitResponse) return rateLimitResponse;

    const formData = await request.formData();
    const file = formData.get('file');
    const projectId = formData.get('projectId');
    const projectCode = formData.get('projectCode');

    if (!(file instanceof File) || typeof projectId !== 'string' || !projectId.trim()) {
      return jsonError('Faltan datos requeridos para subir la foto.', 400);
    }

    const mimeType = file.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return jsonError('El archivo debe ser una imagen JPG, PNG, WEBP o HEIC.', 400);
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return jsonError('El archivo excede el tamaño máximo de 10MB.', 400);
    }

    const safeProjectCode = sanitizePathSegment(projectCode, sanitizePathSegment(projectId));
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const filename = `${timestamp}-${randomString}.${extensionForMime(mimeType)}`;

    const storagePath = `projects/${safeProjectCode}/progress/${filename}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, buffer, {
      contentType: mimeType,
    });

    const downloadURL = await getDownloadURL(storageRef);

    return NextResponse.json({
      success: true,
      url: downloadURL,
      filename,
      storagePath,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Error uploading photo:', error);
    return jsonError('No se pudo subir la foto. Intente nuevamente.', 500);
  }
}
