import { expect, type Page } from '@playwright/test';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

/**
 * Espera a que el espacio de trabajo esté resuelto.
 *
 * La barra lateral se pinta antes de que llegue la membresía de la empresa: las
 * pestañas condicionadas por rol ('Gastos & Facturas', 'Maquinaria'…) aparecen
 * después. `#main-content` expone `aria-busy` mientras el workspace carga, así
 * que esperar a `aria-busy="false"` evita fallos intermitentes en los tests que
 * asumen que esas pestañas ya existen.
 */
async function waitForWorkspaceReady(page: Page) {
  await expect(page.locator('#main-content')).toHaveAttribute('aria-busy', 'false', {
    timeout: 60_000,
  });
}

/**
 * Inicia sesión con la cuenta E2E y espera a que el shell autenticado esté listo.
 *
 * La señal de sesión iniciada es el botón "Tablero" de la barra lateral: se
 * renderiza en cuanto la app monta el shell, sin depender de que el "user pill"
 * con el correo haya terminado de pintar (evita timeouts en cascada).
 */
export async function ensureAuthenticated(page: Page) {
  // `domcontentloaded` en vez de `load`: en modo dev Next carga cientos de
  // chunks y el evento `load` puede tardar más que el timeout del test.
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const dashboard = page.getByRole('button', { name: 'Tablero' }).first();
  const emailField = page.locator('input[type="email"]');

  // `isVisible()` NO espera: si la app todavía no ha montado el shell, la
  // comprobación devuelve false y el flujo acaba esperando un formulario de
  // acceso que nunca aparece (la sesión sí estaba activa). Hay que esperar a
  // que aparezca CUALQUIERA de las dos señales antes de decidir.
  await expect(dashboard.or(emailField).first()).toBeVisible({ timeout: 60_000 });

  if (await dashboard.isVisible()) {
    await waitForWorkspaceReady(page);
    return;
  }

  await emailField.fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
  await expect(dashboard).toBeVisible({ timeout: 60_000 });
  await waitForWorkspaceReady(page);
}
