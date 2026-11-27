'use client';

import { getToken } from 'firebase/app-check';
import { appCheckInstance, auth } from '@/lib/firebaseService';

/**
 * Obtiene el ID token del usuario autenticado (o `null` si no hay sesión).
 * Las rutas API que consumen cuota (Gemini, clima, subida de fotos) exigen
 * este token; sin él responden 401.
 */
export async function getIdTokenOrNull(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/**
 * `fetch` que adjunta el ID token de Firebase cuando hay sesión.
 * Si no hay sesión la petición sale igual y el servidor la rechaza: así el
 * error es explícito (401) y no se rompe la UI por una excepción local.
 */
/** App Check emite el token que las rutas API exigen (cuota de Gemini, etc.). */
async function getAppCheckTokenOrNull(): Promise<string | null> {
  if (!appCheckInstance) return null;
  try {
    const result = await getToken(appCheckInstance, false);
    return result.token || null;
  } catch {
    return null;
  }
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const [token, appCheckToken] = await Promise.all([getIdTokenOrNull(), getAppCheckTokenOrNull()]);
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (appCheckToken) {
    headers.set('X-Firebase-AppCheck', appCheckToken);
  }
  return fetch(input, { ...init, headers });
}
