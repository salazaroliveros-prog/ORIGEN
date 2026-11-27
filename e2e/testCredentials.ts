import { navItem } from './navigation';
import { expect, type Page } from '@playwright/test';

// Cargar desde .env.e2e si está disponible (vía --env-file)
// Fallback a valores locales conocidos
const getEnv = (key: string, fallback: string): string => {
  return process.env[key] || fallback;
};

export const ADMIN_EMAIL = getEnv('E2E_ADMIN_EMAIL', 'salazaroliveros@gmail.com');
export const ADMIN_PASSWORD = getEnv('E2E_ADMIN_PASSWORD', 'AngelDarioJose.2026');

console.log(
  `[testCredentials] Email: ${ADMIN_EMAIL}, Password: ${ADMIN_PASSWORD ? '***' : 'VACIO'}`
);

/**
 * Espera a que el espacio de trabajo esté resuelto.
 */
async function waitForWorkspaceReady(page: Page) {
  // Buscar el elemento #main-content pero sin ser tan estricto
  try {
    await expect(page.locator('#main-content')).toHaveAttribute('aria-busy', 'false', {
      timeout: 20_000,
    });
  } catch {
    // Si falla, simplemente esperar a que la página se estabilice
    await page.waitForTimeout(2_000);
  }
}

/**
 * Inicia sesión con la cuenta E2E y espera a que el shell autenticado esté listo.
 */
export async function ensureAuthenticated(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const dashboard = navItem(page, /Tablero/);
  const emailField = page.getByLabel('Correo electrónico');

  // Esperar a que aparezca ALGO
  await expect(dashboard.or(emailField).first()).toBeVisible({ timeout: 60_000 });

  // Si ya estamos en dashboard, listo
  if (await dashboard.isVisible().catch(() => false)) {
    await waitForWorkspaceReady(page);
    return;
  }

  // Si está el formulario de login, proceder
  if (await emailField.isVisible().catch(() => false)) {
    console.log(`[ensureAuthenticated] Logging in with ${ADMIN_EMAIL}...`);
    await emailField.fill(ADMIN_EMAIL);
    await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD);

    const loginBtn = page.getByRole('button', { name: /Iniciar Sesión/i }).first();
    await loginBtn.click();

    // Esperar redirección y dashboard
    await page
      .waitForURL((url) => !url.toString().includes('/login'), { timeout: 20_000 })
      .catch(() => {});
    await page.waitForTimeout(2_000);

    // Verificar dashboard con más tolerancia
    const isDashboard = await dashboard.isVisible({ timeout: 20_000 }).catch(() => false);
    if (!isDashboard) {
      // Buscar alternativas
      const hasTablero = await page
        .locator('button, a')
        .filter({ hasText: 'Tablero' })
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      if (!hasTablero) {
        const bodyText = await page
          .locator('body')
          .innerText()
          .catch(() => '');
        console.error(`[ensureAuthenticated] No dashboard found. Page:\n${bodyText.slice(0, 500)}`);
        throw new Error('Dashboard not visible after login');
      }
    }

    await waitForWorkspaceReady(page);
    return;
  }

  throw new Error('No login form or dashboard found');
}
