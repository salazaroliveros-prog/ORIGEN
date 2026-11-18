/**
 * Lista de orígenes permitidos para peticiones que modifican estado.
 *
 * La usan tanto `middleware.ts` (Edge) como las rutas de `app/api/**` (Node),
 * para que el chequeo CSRF sea idéntico en ambos entornos. Sin esto, un route
 * handler con su propia lista hardcodeada rechazaba los previews de Vercel y
 * los dominios personalizados aunque el middleware ya los aceptara.
 *
 * Reglas:
 * 1. Cualquier loopback (`localhost`, `127.0.0.1`, `[::1]`) en cualquier puerto.
 * 2. Los orígenes de `ALLOWED_ORIGINS` (lista separada por comas).
 * 3. `NEXT_PUBLIC_SITE_URL`.
 * 4. El mismo host que atendió la petición (`x-forwarded-host`/`host`), que es
 *    lo que cubre previews y dominios propios sin configuración extra.
 */

const LOOPBACK_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * Normaliza un origen a partir de una URL o de un `Origin`/`Referer` completo.
 * Devuelve `null` si el valor no es una URL http(s) absoluta válida.
 */
export function normalizeOrigin(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  try {
    const { origin, protocol } = new URL(trimmed);
    if (!origin || origin === 'null') return null;
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    return origin;
  } catch {
    return null;
  }
}

/** Orígenes configurados por entorno (sin duplicados, ya normalizados). */
export function getConfiguredOrigins(): string[] {
  return Array.from(
    new Set(
      [process.env.ALLOWED_ORIGINS ?? '', process.env.NEXT_PUBLIC_SITE_URL ?? '']
        .join(',')
        .split(',')
        .map((item) => normalizeOrigin(item))
        .filter((origin): origin is string => origin !== null)
    )
  );
}

export interface RequestOriginInput {
  /** URL completa de la petición (`request.url`). */
  requestUrl?: string | null;
  /** Host real (`x-forwarded-host` en Vercel, si existe). */
  host?: string | null;
  /** Protocolo real (`x-forwarded-proto` en Vercel, si existe). */
  protocol?: string | null;
}

/**
 * Orígenes del propio despliegue que atendió la petición.
 *
 * En Vercel `request.nextUrl.origin` puede reflejar el host interno del
 * runtime; por eso se prefiere `x-forwarded-host`.
 */
export function buildRequestOrigins({ requestUrl, host, protocol }: RequestOriginInput): string[] {
  const origins = new Set<string>();

  const fromUrl = normalizeOrigin(requestUrl);
  if (fromUrl) origins.add(fromUrl);

  const cleanHost = host?.split(',')[0]?.trim();
  if (cleanHost) {
    const proto = (protocol?.split(',')[0]?.trim() || 'https').replace(/:$/, '');
    origins.add(`${proto}://${cleanHost}`);
    // Un mismo host puede servirse por http o https (túneles de desarrollo).
    origins.add(`${proto === 'https' ? 'http' : 'https'}://${cleanHost}`);
  }

  return Array.from(origins);
}

/** Indica si un valor (`Origin`/`Referer`) está en la lista permitida. */
export function isAllowedOriginValue(
  value: string | null | undefined,
  requestOrigins: string[] = []
): boolean {
  const normalized = normalizeOrigin(value);
  if (!normalized) return false;
  if (LOOPBACK_ORIGIN.test(normalized)) return true;
  if (getConfiguredOrigins().includes(normalized)) return true;
  return requestOrigins.includes(normalized);
}
