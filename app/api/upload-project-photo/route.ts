import { NextRequest, NextResponse } from 'next/server';
import { jsonError, detectImageMime, extensionForMime } from '@/lib/api';
import { canReadDocumentAsUser, requireApiUser, requireAppCheck } from '@/lib/apiAuth';
import { rateLimitMiddleware } from '@/lib/security';
import { StorageUploadError, uploadImageAsUser } from '@/lib/storageRest';
import { isAllowedOriginValue, buildRequestOrigins } from '@/lib/originAllowlist';
import { createApiError, applySecurityHeaders } from '@/lib/apiMiddleware';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

/** `image/jpg` y `image/jpeg` son el mismo formato: normaliza antes de comparar. */
function normalizeMime(mime: string): string {
  return mime === 'image/jpg' ? 'image/jpeg' : mime;
}

export async function POST(request: NextRequest) {
  try {
    // ✅ CSRF: verificar origen de la petición
    const origin = request.headers.get('origin');
    const requestOrigins = buildRequestOrigins({
      requestUrl: request.url,
      host: request.headers.get('x-forwarded-host') ?? request.headers.get('host'),
      protocol: request.headers.get('x-forwarded-proto'),
    });
    if (origin && !isAllowedOriginValue(origin, requestOrigins)) {
      return createApiError('Origen no autorizado.', 403);
    }

    // 1. Sesión obligatoria
    const auth = await requireApiUser(request);
    if (!auth.ok) {
      return createApiError(auth.message, auth.status);
    }

    // 2. App Check (si está configurado)
    const appCheckResponse = await requireAppCheck(request);
    if (appCheckResponse) {
      return applySecurityHeaders(appCheckResponse);
    }

    // 3. Cuota por usuario
    const rateLimitResponse = await rateLimitMiddleware(`upload:${auth.user.uid}`);
    if (rateLimitResponse) {
      return applySecurityHeaders(rateLimitResponse);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const projectId = formData.get('projectId');

    if (
      !(file instanceof File) ||
      typeof projectId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(projectId.trim())
    ) {
      return createApiError('Faltan datos requeridos para subir la foto.', 400);
    }

    const declaredMime = normalizeMime(file.type.toLowerCase());
    if (!ALLOWED_MIME_TYPES.has(declaredMime)) {
      return createApiError('El archivo debe ser una imagen JPG, PNG, WEBP o HEIC.', 400);
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return createApiError('El archivo excede el tamaño máximo de 10MB.', 400);
    }

    // 4. Validar el contenido real, no solo la extensión/MIME declarado.
    const buffer = new Uint8Array(await file.arrayBuffer());
    const detectedMime = detectImageMime(buffer);
    if (!detectedMime) {
      return createApiError('El archivo no contiene una imagen válida.', 400);
    }
    if (normalizeMime(detectedMime) !== declaredMime) {
      return createApiError('El contenido del archivo no coincide con el tipo declarado.', 400);
    }

    // 5. El usuario debe poder leer el proyecto (reglas de Firestore reales).
    const access = await canReadDocumentAsUser(auth.idToken, 'projects', projectId.trim());
    if (access === 'unavailable') {
      return createApiError('No se pudo verificar el acceso al proyecto. Intenta nuevamente.', 503);
    }
    if (access !== 'allowed') {
      return createApiError('No tienes acceso a este proyecto.', 403);
    }

    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucket) {
      return createApiError('El almacenamiento de archivos no está configurado.', 503);
    }

    const timestamp = Date.now();
    const randomString = crypto.randomUUID().replace(/-/g, '').substring(0, 10);
    const filename = `${timestamp}-${randomString}.${extensionForMime(detectedMime)}`;
    const storagePath = `projects/${projectId.trim()}/progress/${filename}`;

    // 6. Escritura con el token del usuario: storage.rules decide.
    const uploaded = await uploadImageAsUser({
      idToken: auth.idToken,
      bucket,
      storagePath,
      contentType: detectedMime,
      data: buffer,
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        photoId: `${timestamp}_${randomString}`,
        filename,
        storagePath: uploaded.storagePath,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      })
    );
  } catch (error: unknown) {
    if (error instanceof StorageUploadError) {
      return createApiError(error.message, error.status === 403 ? 403 : 502);
    }
    console.error('Error uploading photo:', error);
    return createApiError('No se pudo subir la foto. Intente nuevamente.', 500);
  }
}
