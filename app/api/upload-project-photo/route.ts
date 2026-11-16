import { NextRequest, NextResponse } from 'next/server';
import { jsonError, detectImageMime, extensionForMime } from '@/lib/api';
import { canReadDocumentAsUser, requireApiUser } from '@/lib/apiAuth';
import { rateLimitMiddleware } from '@/lib/security';
import { StorageUploadError, uploadImageAsUser } from '@/lib/storageRest';

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
    // 1. Sesión obligatoria: sin usuario no se puede escribir en Storage.
    const auth = await requireApiUser(request);
    if (!auth.ok) return jsonError(auth.message, auth.status);

    // 2. Cuota por usuario (no por IP, que se puede rotar).
    const rateLimitResponse = rateLimitMiddleware(`upload:${auth.user.uid}`);
    if (rateLimitResponse) return rateLimitResponse;

    const formData = await request.formData();
    const file = formData.get('file');
    const projectId = formData.get('projectId');

    if (!(file instanceof File) || typeof projectId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(projectId.trim())) {
      return jsonError('Faltan datos requeridos para subir la foto.', 400);
    }

    const declaredMime = normalizeMime(file.type.toLowerCase());
    if (!ALLOWED_MIME_TYPES.has(declaredMime)) {
      return jsonError('El archivo debe ser una imagen JPG, PNG, WEBP o HEIC.', 400);
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return jsonError('El archivo excede el tamaño máximo de 10MB.', 400);
    }

    // 3. Validar el contenido real, no solo la extensión/MIME declarado.
    const buffer = new Uint8Array(await file.arrayBuffer());
    const detectedMime = detectImageMime(buffer);
    if (!detectedMime) {
      return jsonError('El archivo no contiene una imagen válida.', 400);
    }
    if (normalizeMime(detectedMime) !== declaredMime) {
      return jsonError('El contenido del archivo no coincide con el tipo declarado.', 400);
    }

    // 4. El usuario debe poder leer el proyecto (reglas de Firestore reales).
    const access = await canReadDocumentAsUser(auth.idToken, 'projects', projectId.trim());
    if (access === 'unavailable') {
      return jsonError('No se pudo verificar el acceso al proyecto. Intenta nuevamente.', 503);
    }
    if (access !== 'allowed') {
      return jsonError('No tienes acceso a este proyecto.', 403);
    }

    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucket) {
      return jsonError('El almacenamiento de archivos no está configurado.', 503);
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const filename = `${timestamp}-${randomString}.${extensionForMime(detectedMime)}`;
    const storagePath = `projects/${projectId.trim()}/progress/${filename}`;

    // 5. Escritura con el token del usuario: `storage.rules` decide.
    const { downloadUrl } = await uploadImageAsUser({
      idToken: auth.idToken,
      bucket,
      storagePath,
      contentType: detectedMime,
      data: buffer,
    });

    return NextResponse.json({
      success: true,
      url: downloadUrl,
      photoId: `${timestamp}_${randomString}`,
      filename,
      storagePath,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    if (error instanceof StorageUploadError) {
      return jsonError(error.message, error.status === 403 ? 403 : 502);
    }
    console.error('Error uploading photo:', error);
    return jsonError('No se pudo subir la foto. Intente nuevamente.', 500);
  }
}
