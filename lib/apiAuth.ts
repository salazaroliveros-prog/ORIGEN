import type { NextRequest } from 'next/server';

/**
 * Autenticación de rutas API con el ID token de Firebase.
 *
 * El repositorio no tiene credenciales de `firebase-admin` (no hay service
 * account), así que la verificación se hace contra Identity Toolkit
 * (`accounts:lookup`), que valida firma, emisor y expiración del token usando
 * la API key pública del proyecto. Es *fail-closed*: ante cualquier duda el
 * resultado es no autenticado, nunca acceso libre.
 */

export interface ApiUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
}

export type ApiAuthResult =
  | { ok: true; user: ApiUser; idToken: string }
  | { ok: false; status: 401 | 403 | 503; message: string };

const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

interface IdentityToolkitAccount {
  localId?: unknown;
  email?: unknown;
  emailVerified?: unknown;
  displayName?: unknown;
}

interface IdentityToolkitResponse {
  users?: IdentityToolkitAccount[];
}

/** Extrae el token de `Authorization: Bearer <token>`. */
export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers?.get?.('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifica el ID token del usuario y devuelve su identidad.
 * No lanza: las rutas deben responder con el status/mensaje del resultado.
 */
export async function requireApiUser(request: NextRequest): Promise<ApiAuthResult> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return {
      ok: false,
      status: 401,
      message: 'Debes iniciar sesión para usar este servicio.',
    };
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      message: 'La autenticación del servidor no está configurada.',
    };
  }

  try {
    const response = await fetch(IDENTITY_TOOLKIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      return { ok: false, status: 401, message: 'Tu sesión expiró o no es válida.' };
    }

    const payload = (await response.json().catch(() => null)) as IdentityToolkitResponse | null;
    const account = payload?.users?.[0];
    if (!account || typeof account.localId !== 'string' || !account.localId) {
      return { ok: false, status: 401, message: 'Tu sesión expiró o no es válida.' };
    }

    return {
      ok: true,
      idToken,
      user: {
        uid: account.localId,
        email: typeof account.email === 'string' ? account.email : null,
        emailVerified: account.emailVerified === true,
        displayName: typeof account.displayName === 'string' ? account.displayName : null,
      },
    };
  } catch {
    return {
      ok: false,
      status: 503,
      message: 'No se pudo verificar la sesión. Intenta nuevamente.',
    };
  }
}

export type DocumentAccess = 'allowed' | 'denied' | 'unavailable';

function firestoreApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
    const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';
    return `http://${host}:8080`;
  }
  return 'https://firestore.googleapis.com';
}

/**
 * Comprueba si el usuario puede leer un documento de Firestore **aplicando las
 * reglas de seguridad**: la consulta REST se envía con el ID token del usuario,
 * así que son las reglas reales (no el service account) las que autorizan.
 */
export async function canReadDocumentAsUser(
  idToken: string,
  collectionName: string,
  documentId: string
): Promise<DocumentAccess> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return 'unavailable';

  const databaseId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || '(default)';
  // `(default)` no debe codificarse: Firestore REST lo espera literal.
  const safeDatabaseId = databaseId === '(default)' ? '(default)' : encodeURIComponent(databaseId);
  const url = `${firestoreApiBaseUrl()}/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${safeDatabaseId}/documents/${encodeURIComponent(
    collectionName
  )}/${encodeURIComponent(documentId)}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (response.ok) return 'allowed';
    if (response.status === 403 || response.status === 404) return 'denied';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}
