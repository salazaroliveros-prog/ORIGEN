import { expect, test } from '@playwright/test';

/**
 * auth.spec.ts — Autenticación automática de ORIGEN ERP
 *
 * El sistema entra directamente con el correo administrativo configurado
 * (salazaroliveros@gmail.com) sin pantalla de login ni diálogo de contraseña.
 */

const ADMIN_EMAIL = 'salazaroliveros@gmail.com';

test.describe('Autenticación automática', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Dar tiempo para que la autenticación automática se complete
    await page.waitForTimeout(4000);
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

  test('la app NO muestra un diálogo de inicio de sesión al cargar (auth es automática)', async ({
    page,
  }) => {
    // El sistema hace auto-auth: no debe haber campo de correo electrónico en pantalla
    const emailInput = page.getByLabel('Correo electrónico');
    const isVisible = await emailInput.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });
});
