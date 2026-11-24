/**
 * Subida de archivos a Firebase Storage en nombre del usuario autenticado.
 *
 * Se usa la API REST de Storage con el ID token del usuario (no el SDK cliente
 * sin sesión ni un service account): así **las `storage.rules` reales** son las
 * que autorizan la escritura.
 */

export class StorageUploadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'StorageUploadError';
  }
}

export interface StorageUploadParams {
  idToken: string;
  bucket: string;
  storagePath: string;
  contentType: string;
  data: Uint8Array;
}

export interface StorageUploadResult {
  storagePath: string;
}

function storageApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
    const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';
    return `http://${host}:9199`;
  }
  return 'https://firebasestorage.googleapis.com';
}

export async function uploadImageAsUser({
  idToken,
  bucket,
  storagePath,
  contentType,
  data,
}: StorageUploadParams): Promise<StorageUploadResult> {
  const url = `${storageApiBaseUrl()}/v0/b/${encodeURIComponent(
    bucket
  )}/o?name=${encodeURIComponent(storagePath)}&uploadType=media`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': contentType,
    },
    body: data,
  });

  if (!response.ok) {
    throw new StorageUploadError(
      response.status === 403
        ? 'No tienes permiso para subir archivos a este proyecto.'
        : 'No se pudo guardar la foto en Storage.',
      response.status
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    name?: unknown;
  };

  const storedPath = typeof payload.name === 'string' && payload.name ? payload.name : storagePath;
  return { storagePath: storedPath };
}

export interface StorageDownloadResult {
  data: Uint8Array;
  contentType: string;
}

export async function downloadStorageObjectAsUser(params: {
  idToken: string;
  bucket: string;
  storagePath: string;
}): Promise<StorageDownloadResult> {
  const { idToken, bucket, storagePath } = params;
  if (!idToken || !bucket || !storagePath) {
    throw new StorageUploadError('Faltan datos para descargar la foto.', 400);
  }
  const url = `${storageApiBaseUrl()}/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(storagePath)}?alt=media`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!response.ok) {
    throw new StorageUploadError(
      response.status === 403
        ? 'No tienes permiso para ver esta foto del proyecto.'
        : 'No se pudo recuperar la foto almacenada.',
      response.status
    );
  }
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.byteLength === 0 || data.byteLength > 10 * 1024 * 1024) {
    throw new StorageUploadError('El archivo almacenado no supera la validación de tamaño.', 413);
  }
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
  if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(contentType)) {
    throw new StorageUploadError('El archivo almacenado no es una imagen permitida.', 415);
  }
  return { data, contentType };
}
