import { expect, test } from '@playwright/test';

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
    // Asegurar que el usuario exista en el emulador de Auth (se pierde al reiniciar)
    await page.request.post(
      'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key',
      {
        data: {
          email: 'salazaroliveros@gmail.com',
          password: 'Origen2026!Secure',
          returnSecureToken: true,
        },
      }
    ).catch(() => {});

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Login manual si aparece el formulario de autenticación
    const loginButton = page.getByRole('button', { name: 'Iniciar Sesión' });
    const loginVisible = await loginButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (loginVisible) {
      await page.getByLabel('Correo electrónico').fill('salazaroliveros@gmail.com');
      await page.locator('#password').fill('Origen2026!Secure');
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
    await expect(page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first()).toBeVisible({
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
