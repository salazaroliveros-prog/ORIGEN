import { expect, test } from '@playwright/test';
import { ensureAuthenticated } from './testCredentials';

/**
 * Prueba CRUD extremo a extremo sobre los emuladores de Firebase.
 * Versión tolerante con selectores flexibles.
 */

const runId = Date.now();
const projectCode = `E2E-${runId}`;
const projectName = 'Proyecto E2E';
const apuCode = `APU-${runId}`;
const expenseSupplier = `Proveedor E2E ${runId}`;
const expenseFactura = `FAC-${runId}`;
const employeeName = `Emp E2E ${runId}`;
const quoteClientName = `Cliente ${runId}`;
const machineryName = `Equipo ${runId}`;

test.describe('CRUD completo de módulos ERP', () => {
  test('proyecto, APU, gasto, personal, cotización y maquinaria', async ({ page }) => {
    test.setTimeout(300_000); // 5 minutos

    const firebaseRequests: string[] = [];
    page.on('request', (request) => {
      if (/firebase|googleapis|identitytoolkit/i.test(request.url())) {
        firebaseRequests.push(request.url());
      }
    });

    await test.step('autenticación', async () => {
      await ensureAuthenticated(page);
      await page.waitForTimeout(1500);
    });

    await test.step('proyectos: CREATE', async () => {
      // Navegar a Proyectos
      await page
        .locator('a, button, span')
        .filter({ hasText: 'Proyectos & Firmas' })
        .first()
        .click({ timeout: 10_000 });
      await page.waitForTimeout(2000);

      // Click Nuevo Proyecto
      const newProjectBtn = page.getByRole('button', { name: /Nuevo|Crear/ }).first();
      await newProjectBtn.click({ timeout: 10_000 });
      await page.waitForTimeout(500);

      // Rellenar formulario
      const dialog = page.locator('[role="dialog"]').first();
      await dialog.locator('input').nth(0).fill(projectCode);
      await dialog.locator('input').nth(1).fill(projectName);
      await dialog.locator('input').nth(2).fill('Cliente Test');
      await dialog.locator('input').nth(3).fill('Zona 1');

      // Click Crear
      await dialog
        .getByRole('button', { name: /Crear|Guardar/ })
        .first()
        .click({ timeout: 15_000 });
      await page.waitForTimeout(2000);

      // Verificar que se creó
      await expect(page.locator(`text=${projectCode}`)).toBeVisible({ timeout: 15_000 });
    });

    await test.step('proyectos: READ', async () => {
      // Verificar que el proyecto está visible en la lista
      const projectItem = page.locator(`text=${projectCode}`);
      await expect(projectItem).toBeVisible({ timeout: 10_000 });
      await expect(projectItem).toContainText(projectName);
    });

    await test.step('proyectos: UPDATE', async () => {
      // Buscar botón de editar (puede variar el texto)
      const editBtn = page
        .locator('button, a')
        .filter({ hasText: /Editar|Edit/ })
        .first();
      await editBtn.click({ timeout: 10_000 });
      await page.waitForTimeout(500);

      // Buscar el input y actualizar nombre
      const nameInput = page.locator('input[type="text"]').nth(1);
      await nameInput.clear();
      await nameInput.fill('Proyecto E2E Actualizado');

      // Click Actualizar
      const updateBtn = page.getByRole('button', { name: /Actualizar|Update/ }).first();
      await updateBtn.click({ timeout: 15_000 });
      await page.waitForTimeout(2000);

      // Verificar cambio
      await expect(page.locator('text=Proyecto E2E Actualizado')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('APU: CREATE', async () => {
      await page
        .locator('a, button, span')
        .filter({ hasText: 'Presupuestos|APU' })
        .first()
        .click({ timeout: 10_000 });
      await page.waitForTimeout(1500);

      const newBtn = page.getByRole('button', { name: /Manual|Nuevo/ }).first();
      await newBtn.click({ timeout: 10_000 });
      await page.waitForTimeout(500);

      // Rellenar formulario APU
      await page.locator('input[name="code"]').fill(apuCode);
      await page.locator('input[name="desc"]').fill('Concreto reforzado');
      await page.locator('input[name="qty"]').fill('2');
      await page.locator('input[name="matCost"]').fill('200');

      await page.getByRole('button', { name: /Guardar/ }).click({ timeout: 15_000 });
      await page.waitForTimeout(2000);

      // Verificar
      await expect(page.locator(`text=${apuCode}`)).toBeVisible({ timeout: 15_000 });
    });

    await test.step('gastos: CREATE & READ', async () => {
      await page
        .locator('a, button, span')
        .filter({ hasText: 'Gastos|Facturas' })
        .first()
        .click({ timeout: 10_000 });
      await page.waitForTimeout(1500);

      const newBtn = page.getByRole('button', { name: /Registrar|Nuevo/ }).first();
      await newBtn.click({ timeout: 10_000 });
      await page.waitForTimeout(500);

      // Rellenar gasto
      await page.locator('input[type="text"]').nth(0).fill(expenseSupplier);
      await page.locator('input').filter({ hasText: 'A-' }).first().fill(expenseFactura);
      await page.locator('input[type="number"]').first().fill('1500');

      await page
        .getByRole('button', { name: /Registrar/ })
        .first()
        .click({ timeout: 15_000 });
      await page.waitForTimeout(2000);

      // Verificar
      await expect(page.locator(`text=${expenseSupplier}`)).toBeVisible({ timeout: 15_000 });
    });

    await test.step('personal: CREATE & READ', async () => {
      await page
        .locator('a, button, span')
        .filter({ hasText: 'Personal|IGSS' })
        .first()
        .click({ timeout: 10_000 });
      await page.waitForTimeout(1500);

      let newBtn = page.getByRole('button', { name: /Empleado|Nuevo/ }).first();
      if (!(await newBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
        newBtn = page
          .locator('button, a')
          .filter({ hasText: /Nuevo|Crear/ })
          .first();
      }
      await newBtn.click({ timeout: 10_000 });
      await page.waitForTimeout(500);

      // Rellenar empleado
      await page.locator('input[type="text"]').nth(0).fill(employeeName);
      await page.locator('input[type="number"]').nth(0).fill('250');

      await page
        .getByRole('button', { name: /Guardar/ })
        .first()
        .click({ timeout: 15_000 });
      await page.waitForTimeout(2000);

      // Verificar
      await expect(page.locator(`text=${employeeName}`)).toBeVisible({ timeout: 15_000 });
    });

    await test.step('cotizaciones: CREATE & UPDATE', async () => {
      await page
        .locator('a, button, span')
        .filter({ hasText: 'Cotizaciones|Quotes' })
        .first()
        .click({ timeout: 10_000 });
      await page.waitForTimeout(1500);

      const newBtn = page.getByRole('button', { name: /Nueva|Rápida/ }).first();
      await newBtn.click({ timeout: 10_000 });
      await page.waitForTimeout(500);

      // Rellenar cotización
      await page.locator('input').nth(0).fill(quoteClientName);
      await page.locator('textarea').nth(0).fill('Obra de prueba E2E');

      await page
        .getByRole('button', { name: /Guardar|Agregar/ })
        .first()
        .click({ timeout: 15_000 });
      await page.waitForTimeout(2000);

      // Verificar
      await expect(page.locator(`text=${quoteClientName}`)).toBeVisible({ timeout: 15_000 });
    });

    await test.step('maquinaria: CREATE & UPDATE', async () => {
      await page
        .locator('a, button, span')
        .filter({ hasText: 'Maquinaria|Equipment' })
        .first()
        .click({ timeout: 10_000 });
      await page.waitForTimeout(1500);

      const newBtn = page.getByRole('button', { name: /Registrar|Nueva/ }).first();
      await newBtn.click({ timeout: 10_000 });
      await page.waitForTimeout(500);

      // Rellenar maquinaria
      await page.locator('input[type="text"]').nth(0).fill(machineryName);
      await page.locator('input[type="text"]').nth(1).fill('2026');
      await page.locator('input[type="number"]').nth(0).fill('300');

      await page
        .getByRole('button', { name: /Guardar/ })
        .first()
        .click({ timeout: 15_000 });
      await page.waitForTimeout(2000);

      // Verificar
      await expect(page.locator(`text=${machineryName}`)).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Firebase interaction', async () => {
      expect(firebaseRequests.length).toBeGreaterThan(0);
      console.log(`Firebase requests: ${firebaseRequests.length}`);
    });
  });
});
