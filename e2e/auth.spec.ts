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
    // Next.js inyecta el `<title>` de `metadata` en un fragmento de la
    // respuesta que puede llegar después de `domcontentloaded`: hay que
    // esperarlo explícitamente.
    await page.waitForFunction(() => document.title.trim().length > 0, undefined, {
      timeout: 30_000,
    });

    const title = await page.title();
    expect(title).toMatch(/ORIGEN|ConstructERP|ERP|Guatemala/i);
  });

  test('el correo del administrador autenticado es visible en pantalla', async ({ page }) => {
    await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible({ timeout: 30_000 });
  });

  test('la navegación principal con enlace real de la app es visible', async ({ page }) => {
    // 'Tablero' es un botón de navegación de la barra lateral según Sidebar.tsx
    await expect(page.getByRole('button', { name: 'Tablero' }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test('la sesión autenticada no muestra el formulario de inicio de sesión', async ({ page }) => {
    const emailInput = page.getByLabel('Correo electrónico');
    const isVisible = await emailInput.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });
});
