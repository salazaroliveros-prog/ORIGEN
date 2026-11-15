'use client';

import { auth } from '@/lib/firebaseService';

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
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getIdTokenOrNull();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
