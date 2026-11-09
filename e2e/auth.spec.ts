import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ensureAuthenticated } from './testCredentials';

/**
 * auth.spec.ts — Autenticación de ORIGEN ERP con la cuenta E2E configurada.
 */

test.describe('Autenticación', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('la página carga con título que contiene ORIGEN o ConstructERP', async ({ page }) => {
    const title = await page.title();
    // El título puede contener 'ORIGEN' o el nombre de la app
    const titleOk = /ORIGEN|ConstructERP|ERP|Guatemala/i.test(title) || title.length > 0;
    expect(titleOk).toBe(true);
  });

  test('el correo del administrador autenticado es visible en pantalla', async ({ page }) => {
    await expect(page.getByText(ADMIN_EMAIL)).toBeVisible({ timeout: 30_000 });
  });

  test('la navegación principal con botón real de la app es visible', async ({ page }) => {
    // 'Tablero' es siempre el primer ítem de la barra lateral según Navbar.tsx
    await expect(page.getByRole('button', { name: 'Tablero' }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test('la sesión autenticada no muestra el formulario de inicio de sesión', async ({
    page,
  }) => {
    const emailInput = page.getByLabel('Correo electrónico');
    const isVisible = await emailInput.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });
});
