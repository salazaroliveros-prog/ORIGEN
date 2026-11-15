import { expect, type Page } from '@playwright/test';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

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
  const emailField = page.getByLabel('Correo electrónico');

  // `isVisible()` NO espera: si la app todavía no ha montado el shell, la
  // comprobación devuelve false y el flujo acaba esperando un formulario de
  // acceso que nunca aparece (la sesión sí estaba activa). Hay que esperar a
  // que aparezca CUALQUIERA de las dos señales antes de decidir.
  await expect(dashboard.or(emailField).first()).toBeVisible({ timeout: 60_000 });

  if (await dashboard.isVisible()) {
    return;
  }

  await emailField.fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
  await expect(dashboard).toBeVisible({ timeout: 60_000 });
}
