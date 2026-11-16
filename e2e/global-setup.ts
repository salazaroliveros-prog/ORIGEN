import { chromium, expect } from '@playwright/test';

/**
 * Primer acceso: en un emulador recién arrancado la empresa y la membresía del
 * usuario se provisionan en el primer login. Si varias pruebas hacen ese primer
 * login en paralelo, la app se queda cargando y las pruebas fallan por timeout
 * aunque el producto funcione. Este calentamiento deja el backend listo antes
 * de repartir trabajo entre workers.
 */
async function warmUpSession(baseURL: string): Promise<void> {
  const email = process.env.E2E_ADMIN_EMAIL ?? '';
  const password = process.env.E2E_ADMIN_PASSWORD ?? '';
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    const browserErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 120_000 });

    const dashboard = page.getByRole('link', { name: 'Tablero' }).first();
    const emailField = page.getByLabel('Correo electrónico');
    const passwordField = page.getByLabel('Contraseña', { exact: true });

    // La app monta primero el shell "Cargando…": hay que esperar a que aparezca
    // la sesión activa o el formulario de acceso.
    const deadline = Date.now() + 120_000;
    let loggedIn = false;
    while (Date.now() < deadline) {
      if (await dashboard.isVisible().catch(() => false)) {
        loggedIn = true;
        break;
      }
      if (await emailField.isVisible().catch(() => false)) {
        break;
      }
      await page.waitForTimeout(1_000);
    }

    if (!loggedIn) {
      if (!(await emailField.isVisible().catch(() => false))) {
        throw new Error(`La app no mostró ni la sesión activa ni el formulario de acceso. URL actual: ${page.url()}`);
      }

      await emailField.fill(email);
      await passwordField.fill(password);
      await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
      try {
        await dashboard.waitFor({ state: 'visible', timeout: 180_000 });
      } catch (error) {
        const bodyText = await page.locator('body').innerText().catch(() => '(no se pudo leer el contenido)');
        const emailVisible = await emailField.isVisible().catch(() => false);
        const passwordVisible = await passwordField.isVisible().catch(() => false);
        throw new Error(
          [
            'La autenticación E2E no llegó al tablero.',
            `URL: ${page.url()}`,
            `Correo visible: ${emailVisible}; contraseña visible: ${passwordVisible}`,
            `Contenido visible: ${bodyText.slice(0, 2500)}`,
            `Errores del navegador: ${browserErrors.slice(-20).join(' | ') || '(ninguno)'}`,
            `Error original: ${error instanceof Error ? error.message : String(error)}`,
          ].join('\\n')
        );
      }
    }

    // "Tablero" aparece antes de que la empresa/membresía estén provisionadas:
    // el objetivo del calentamiento es terminar cuando el espacio ya está listo.
    await page.locator('#main-content').waitFor({ state: 'attached', timeout: 180_000 });
    await expect
      .poll(
        async () => (await page.locator('#main-content').getAttribute('aria-busy')) === 'false',
        { timeout: 180_000 }
      )
      .toBe(true);
  } finally {
    await browser.close();
  }
}

export default async function globalSetup() {
  if (process.env.E2E_ALLOW_FIREBASE_MUTATIONS !== '1') {
    throw new Error(
      'E2E puede crear, modificar y borrar datos. Configura E2E_ALLOW_FIREBASE_MUTATIONS=1 solo para un backend desechable o de pruebas.'
    );
  }

  if (!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD) {
    throw new Error('Configura E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para ejecutar Playwright.');
  }

  const target = process.env.E2E_FIREBASE_TARGET;
  if (target !== 'emulator' && target !== 'live') {
    throw new Error(
      'Define E2E_FIREBASE_TARGET=emulator o live para identificar el backend de pruebas.'
    );
  }

  const baseURL = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3000');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(baseURL.hostname)) {
    throw new Error(
      'Playwright requiere el servidor web local; el backend se valida por projectId.'
    );
  }

  const configResponse = await fetch(new URL('/api/firebase-config.js', baseURL));
  if (!configResponse.ok) {
    throw new Error('No se pudo consultar la configuracion Firebase del servidor local.');
  }
  const configSource = await configResponse.text();
  const configMatch = /^firebase\.initializeApp\((.*)\);\s*$/.exec(configSource);
  if (!configMatch) {
    throw new Error('La respuesta de configuracion Firebase no tiene el formato esperado.');
  }
  const { projectId } = JSON.parse(configMatch[1]);
  const emulatorMode = configResponse.headers.get('X-Firebase-Emulator-Mode') === 'true';

  if (target === 'emulator' && (projectId !== 'demo-origen-erp-test' || !emulatorMode)) {
    throw new Error('E2E dice emulator, pero el servidor no esta conectado a los emuladores demo.');
  }
  if (target === 'live') {
    if (
      projectId.startsWith('demo-') ||
      emulatorMode ||
      process.env.E2E_CONFIRM_LIVE_PROJECT !== projectId
    ) {
      throw new Error(
        'Live requiere E2E_CONFIRM_LIVE_PROJECT igual al projectId servido por la app.'
      );
    }
  }

  await warmUpSession(baseURL.toString());
  console.log('[global-setup] Sesión E2E lista y empresa provisionada.');
}
