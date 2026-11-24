import { Buffer } from 'node:buffer';
import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/api';
import { canReadDocumentAsUser, requireApiUser } from '@/lib/apiAuth';
import { downloadStorageObjectAsUser, StorageUploadError } from '@/lib/storageRest';

interface FirestoreDocument {
  fields?: Record<string, { stringValue?: unknown }>;
}

function firestoreApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
    const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';
    return `http://${host}:8080`;
  }
  return 'https://firestore.googleapis.com';
}

function stringField(fields: FirestoreDocument['fields'], name: string): string | null {
  const value = fields?.[name]?.stringValue;
  return typeof value === 'string' ? value : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; photoId: string }> }
) {
  try {
    const auth = await requireApiUser(request);
    if (!auth.ok) return jsonError(auth.message, auth.status);

    const { projectId, photoId } = await Promise.resolve(context.params);
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(projectId) || !/^[a-zA-Z0-9_-]{1,128}$/.test(photoId)) {
      return jsonError('La referencia de la foto no es válida.', 400);
    }

    const projectAccess = await canReadDocumentAsUser(auth.idToken, 'projects', projectId);
    if (projectAccess === 'unavailable') {
      return jsonError('No se pudo verificar el acceso al proyecto.', 503);
    }
    if (projectAccess !== 'allowed') {
      return jsonError('No tienes acceso a este proyecto.', 403);
    }

    const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const databaseId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || '(default)';
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!firebaseProjectId || !storageBucket) {
      return jsonError('La configuración de almacenamiento no está disponible.', 503);
    }
    const safeDatabaseId =
      databaseId === '(default)' ? '(default)' : encodeURIComponent(databaseId);
    const metadataUrl = `${firestoreApiBaseUrl()}/v1/projects/${encodeURIComponent(firebaseProjectId)}/databases/${safeDatabaseId}/documents/projects/${encodeURIComponent(projectId)}/photos/${encodeURIComponent(photoId)}`;
    const metadataResponse = await fetch(metadataUrl, {
      headers: { Authorization: `Bearer ${auth.idToken}` },
      cache: 'no-store',
    });
    if (metadataResponse.status === 403 || metadataResponse.status === 404) {
      return jsonError('La foto no existe o no tienes permiso para verla.', 404);
    }
    if (!metadataResponse.ok) {
      return jsonError('No se pudo verificar la referencia de la foto.', 503);
    }

    const metadata = (await metadataResponse.json()) as FirestoreDocument;
    const fields = metadata.fields;
    const storedProjectId = stringField(fields, 'projectId');
    const storagePath = stringField(fields, 'storagePath');
    const filename = stringField(fields, 'filename');
    if (
      storedProjectId !== projectId ||
      !filename ||
      storagePath !== `projects/${projectId}/progress/${filename}`
    ) {
      return jsonError('La referencia de almacenamiento no coincide con el proyecto.', 403);
    }

    const file = await downloadStorageObjectAsUser({
      idToken: auth.idToken,
      bucket: storageBucket,
      storagePath,
    });
    return new NextResponse(Buffer.from(file.data), {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof StorageUploadError) {
      return jsonError(error.message, error.status === 403 ? 403 : 502);
    }
    console.error('Error retrieving project photo:', error);
    return jsonError('No se pudo recuperar la foto del proyecto.', 500);
  }
}
