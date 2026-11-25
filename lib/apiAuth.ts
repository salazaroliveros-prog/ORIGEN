import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';

/**
 * Autenticación de rutas API con el ID token de Firebase.
 *
 * Intenta primero Firebase Admin SDK (verifica revocación de tokens y
 * requiere FIREBASE_ADMIN_CREDENTIALS en Vercel Dashboard). Si no está
 * disponible, hace fallback a Identity Toolkit (accounts:lookup) que valida
 * firma, emisor y expiración usando la API key pública. Es *fail-closed*:
 * ante cualquier duda el resultado es no autenticado, nunca acceso libre.
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

/** Extrae el token de App Check del header `X-Firebase-AppCheck`. */
export function getAppCheckToken(request: NextRequest): string | null {
  const header = request.headers?.get?.('x-firebase-appcheck');
  if (!header) return null;
  const token = header.trim();
  return token.length > 0 ? token : null;
}

// Firebase Admin SDK (condicional: requiere FIREBASE_ADMIN_CREDENTIALS en Vercel)
let adminAuth: ReturnType<typeof getAdminAuth> | null = null;
let adminAppCheck: ReturnType<typeof getAppCheck> | null = null;

function getAdminAuthInstance() {
  if (adminAuth) return adminAuth;
  if (getApps().length > 0) {
    adminAuth = getAdminAuth(getApps()[0]);
    adminAppCheck = getAppCheck(getApps()[0]);
    return adminAuth;
  }
  const creds = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (!creds) return null;
  try {
    const serviceAccount = JSON.parse(creds);
    const app = initializeApp({
      credential: cert(serviceAccount),
    });
    adminAuth = getAdminAuth(app);
    adminAppCheck = getAppCheck(app);
    return adminAuth;
  } catch {
    return null;
  }
}

export function getAdminAppCheckInstance() {
  getAdminAuthInstance(); // asegura inicialización
  return adminAppCheck;
}

/**
 * Verifica el ID token con Firebase Admin SDK (comprueba revocación).
 * Devuelve null si no hay Admin SDK configurado o el token es inválido.
 */
export async function verifyIdTokenWithAdmin(
  idToken: string
): Promise<{ uid: string; email: string | null; emailVerified: boolean } | null> {
  const auth = getAdminAuthInstance();
  if (!auth) return null;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: !!decoded.email_verified,
    };
  } catch {
    return null;
  }
}

/**
 * Verifica un token de Firebase App Check con el Admin SDK.
 * Devuelve true si el token es válido, false en caso contrario.
 */
export async function verifyAppCheckToken(appCheckToken: string): Promise<boolean> {
  const appCheck = getAdminAppCheckInstance();
  if (!appCheck) return false;
  try {
    await appCheck.verifyToken(appCheckToken);
    return true;
  } catch {
    return false;
  }
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

  // Intento 1: Firebase Admin SDK (verifica revocación de tokens)
  const adminResult = await verifyIdTokenWithAdmin(idToken);
  if (adminResult) {
    return {
      ok: true,
      idToken,
      user: {
        uid: adminResult.uid,
        email: adminResult.email,
        emailVerified: adminResult.emailVerified,
        displayName: null,
      },
    };
  }

  // Intento 2: Identity Toolkit (fallback cuando no hay Admin SDK)
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

/**
 * Middleware de verificación de App Check para rutas API.
 * Devuelve una respuesta 403 si el token no es válido, o null si pasa
 * (o si App Check no está configurado, en cuyo caso se permite pasar).
 */
export async function requireAppCheck(request: NextRequest): Promise<NextResponse | null> {
  const appCheckToken = getAppCheckToken(request);
  if (!appCheckToken) {
    // Si App Check no está configurado (no hay Admin SDK), permitir pasar.
    // Si está configurado pero no hay token, denegar.
    const appCheck = getAdminAppCheckInstance();
    if (!appCheck) return null;
    return NextResponse.json(
      { success: false, error: 'Token de App Check requerido.' },
      { status: 403 }
    );
  }

  const valid = await verifyAppCheckToken(appCheckToken);
  if (!valid) {
    return NextResponse.json(
      { success: false, error: 'Token de App Check inválido.' },
      { status: 403 }
    );
  }

  return null;
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
