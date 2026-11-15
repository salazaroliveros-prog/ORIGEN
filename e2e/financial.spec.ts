import { expect, test } from '@playwright/test';
import { createTestProject } from './projectFixture';
import { ensureAuthenticated } from './testCredentials';

/**
 * financial.spec.ts — Flujos de gastos y facturas en ORIGEN ERP
 *
 * Verifica la sección 'Gastos & Facturas': navegación, UI visible y apertura del
 * formulario de registro de gasto.
 *
 * El app es una SPA en '/'. No existe URL '/financial'.
 * Selectores confirmados en system-crud.spec.ts.
 *
 * Los módulos de gasto exigen un proyecto activo: sin proyectos, la pantalla
 * muestra el estado vacío "Sin proyectos disponibles" y no renderiza el botón
 * de registro. Por eso la suite crea un proyecto antes de correr.
 */

const RUN_ID = Date.now();
// El código del proyecto admite máximo 20 caracteres.
const PROJECT_CODE = `GTO-${RUN_ID}`;

test.describe.serial('Sección Gastos & Facturas', () => {
  test.beforeAll(async ({ browser }) => {
    // Se crea el proyecto en un contexto propio: `beforeEach` trabaja con un
    // contexto nuevo por prueba y no debe arrastrar el formulario abierto.
    const context = await browser.newContext();
    const page = await context.newPage();
    await ensureAuthenticated(page);
    await createTestProject(page, {
      code: PROJECT_CODE,
      name: `Proyecto para gastos E2E ${RUN_ID}`,
    });
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);

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
    await expect(page.getByLabel('Proveedor', { exact: true })).toBeVisible();
  });

  test('el formulario de gasto tiene el botón de guardar en español', async ({ page }) => {
    await page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first().click();
    await page.waitForTimeout(1000);

    await expect(
      page.getByRole('button', { name: 'Registrar Gasto (Paso 1)' }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
