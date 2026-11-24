/**
 * Global Setup Minimalista
 * Solo verifica que el servidor esté disponible
 */
export default async function setup(config: any): Promise<void> {
  const baseURL = config.use?.baseURL || process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
  console.log(`[setup] Verificando disponibilidad de ${baseURL}...`);

  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(baseURL, { signal: AbortSignal.timeout(3_000) });
      if (res.ok) {
        ready = true;
        console.log('[setup] ✓ Servidor disponible');
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1_000));
  }

  if (!ready) {
    console.warn('[setup] ⚠ Servidor no respondió después de 60s, continuando igualmente...');
  }
}
