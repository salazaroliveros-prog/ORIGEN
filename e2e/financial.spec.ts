import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './testCredentials';

/**
 * financial.spec.ts — Flujos de gastos y facturas en ORIGEN ERP
 *
 * Verifica la sección 'Gastos & Facturas': navegación, UI visible y apertura del
 * formulario de registro de gasto.
 *
 * El app es una SPA en '/'. No existe URL '/financial'.
 * Selectores confirmados en system-crud.spec.ts.
 */

test.describe('Sección Gastos & Facturas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Login manual si aparece el formulario de autenticación
    const loginButton = page.getByRole('button', { name: 'Iniciar Sesión' });
    const loginVisible = await loginButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (loginVisible) {
      await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
      await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD);
      await loginButton.click();
      await page.waitForTimeout(4000);
    }

    // Navegar a la sección de gastos
    await page.getByRole('button', { name: 'Gastos & Facturas' }).first().click();
    await page.waitForTimeout(2000);
  });

  test('la sección Gastos & Facturas muestra el botón para registrar un gasto', async ({
    page,
  }) => {
    await expect(
      page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first()
    ).toBeVisible({
      timeout: 20_000,
    });
  });

  test('el formulario de nuevo gasto se puede abrir y tiene los campos correctos', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first().click();
    await page.waitForTimeout(1000);

    // Campos confirmados en ExpensesManager.tsx
    await expect(page.getByLabel('Descripción del Insumo / Gasto')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByLabel('Monto (GTQ)')).toBeVisible();
    await expect(page.getByLabel('Proveedor')).toBeVisible();
  });

  test('el formulario de gasto tiene el botón de guardar en español', async ({ page }) => {
    await page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first().click();
    await page.waitForTimeout(1000);

    await expect(
      page.getByRole('button', { name: 'Registrar Gasto (Paso 1)' }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
