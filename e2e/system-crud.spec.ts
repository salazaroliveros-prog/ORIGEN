import { expect, test, type Page } from '@playwright/test';
import { navItem } from './navigation';
import { fillExpenseForm, selectActiveProject } from './projectFixture';
import { ensureAuthenticated } from './testCredentials';

/**
 * Prueba CRUD extremo a extremo sobre los emuladores de Firebase.
 * Los selectores son los mismos que validan los flujos reales en los demás
 * specs (roles ARIA y etiquetas accesibles), no posiciones de `input`.
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

async function openTab(page: Page, name: RegExp | string) {
  await navItem(page, name).click();
  await page.waitForTimeout(1200);
}

async function showAllProjectsForTest(page: Page) {
  const pageSize = page.getByLabel('Elementos por página');
  if (await pageSize.isVisible().catch(() => false)) {
    await pageSize.selectOption('50');
  }
}

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
    });

    await test.step('proyectos: CREATE, READ, UPDATE', async () => {
      await openTab(page, /Proyectos & Firmas/);
      await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();
      const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await dialog.getByLabel('Código del Proyecto').fill(projectCode);
      await dialog.getByLabel('Nombre del Proyecto').fill(projectName);
      await dialog.getByLabel('Nombre del cliente').fill('Cliente Test');
      await dialog.getByLabel('Ubicación').fill('Zona 1, Ciudad de Guatemala');
      await dialog.getByLabel('Municipio').fill('Guatemala');
      await dialog.getByLabel('Departamento').fill('Guatemala');
      await dialog.getByLabel('Presupuesto Total (Q)').fill('100000');
      await dialog.getByLabel('Avance (%)').fill('5');
      await dialog.getByLabel('Fecha de Inicio').fill('2026-11-01');
      await dialog.getByLabel('Fecha de Finalización').fill('2027-05-01');
      await dialog.getByLabel('Estado del Proyecto').selectOption({ label: 'En Ejecución' });
      await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();
      await expect(dialog).toBeHidden({ timeout: 30_000 });

      await showAllProjectsForTest(page);
      await expect(
        page.getByText(projectCode, { exact: false }).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByText(projectName, { exact: false }).filter({ visible: true }).first()
      ).toBeVisible();

      await page.getByRole('button', { name: `Editar proyecto ${projectCode}` }).click();
      const editDialog = page.getByRole('dialog');
      await expect(editDialog).toBeVisible();
      await editDialog.getByLabel('Nombre del Proyecto').fill('Proyecto E2E Actualizado');
      await editDialog.getByRole('button', { name: 'Actualizar' }).click();
      await expect(editDialog).toBeHidden({ timeout: 30_000 });
      await expect(
        page.getByText('Proyecto E2E Actualizado').filter({ visible: true }).first()
      ).toBeVisible({ timeout: 20_000 });
    });

    await test.step('APU: CREATE', async () => {
      await selectActiveProject(page, projectCode);
      await openTab(page, /Presupuestos APU/);
      await page.getByRole('button', { name: 'Renglón Manual' }).click();
      const modal = page
        .locator('div.fixed.inset-0')
        .filter({ hasText: 'Nuevo Renglón APU Manual' })
        .first();
      await expect(modal).toBeVisible({ timeout: 15_000 });
      await modal.locator('input[name="code"]').fill(apuCode);
      await modal.locator('input[name="unit"]').fill('m3');
      await modal.locator('input[name="desc"]').fill('Concreto reforzado');
      await modal.locator('input[name="qty"]').fill('2');
      await modal.locator('input[name="matCost"]').fill('200');
      await modal.getByRole('button', { name: 'Guardar Renglón APU' }).click();
      await expect(modal).toBeHidden({ timeout: 30_000 });
      await expect(
        page.getByText(apuCode, { exact: false }).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 20_000 });
    });

    await test.step('gastos: CREATE & READ', async () => {
      await openTab(page, /Gastos & Facturas/);
      await page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first().click();
      await fillExpenseForm(page, {
        description: 'Insumo E2E CRUD',
        supplier: expenseSupplier,
        nit: '1234567-8',
        invoice: expenseFactura,
        amount: '1500',
      });
      await page.getByRole('button', { name: 'Registrar Gasto (Paso 1)' }).click();
      await expect(
        page.getByText('Insumo E2E CRUD', { exact: false }).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 30_000 });
    });

    await test.step('personal: CREATE & READ', async () => {
      await openTab(page, /Personal & IGSS/);
      await navItem(page, /Cuadrillas/).click();
      await page.getByRole('button', { name: 'Nuevo Empleado' }).first().click();
      const empDialog = page.getByRole('dialog', { name: 'Registrar Nuevo Empleado' });
      await expect(empDialog).toBeVisible({ timeout: 15_000 });
      await empDialog.getByLabel('Nombre Completo').fill(employeeName);
      await empDialog.getByLabel('Jornal Diario (Q)').fill('250');
      await empDialog.getByRole('button', { name: 'Guardar Empleado' }).click();
      await expect(empDialog).toBeHidden({ timeout: 30_000 });
      await expect(
        page.getByText(employeeName, { exact: false }).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 20_000 });
    });

    await test.step('cotizaciones: CREATE', async () => {
      await openTab(page, /Cotizaciones/);
      await page
        .getByRole('button', { name: /Nueva Cotización Rápida/i })
        .first()
        .click();
      const quoteModal = page
        .locator('div.fixed.inset-0')
        .filter({ hasText: 'Generador Rápido de Cotizaciones' });
      await expect(quoteModal).toBeVisible({ timeout: 15_000 });
      await quoteModal.getByPlaceholder('Ej. Ing. Guillermo Morales').fill(quoteClientName);
      await quoteModal
        .getByPlaceholder('Descripción técnica del trabajo…')
        .fill('Obra de prueba E2E');
      await quoteModal.getByPlaceholder('Cant.').fill('1');
      await quoteModal.getByPlaceholder('Precio Q').fill('1500');
      await quoteModal.getByRole('button', { name: 'Agregar a la lista' }).click();
      await quoteModal.getByRole('button', { name: /Guardar como Enviada/i }).click();
      await expect(quoteModal).toBeHidden({ timeout: 30_000 });
      await expect(
        page.getByText(quoteClientName, { exact: false }).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 20_000 });
    });

    await test.step('maquinaria: CREATE', async () => {
      await openTab(page, /Maquinaria/);
      await page
        .getByRole('button', { name: /Registrar Maquinaria|Nueva Maquinaria/i })
        .first()
        .click();
      const macDialog = page.getByRole('dialog', { name: /Registrar Nueva Maquinaria/ });
      await expect(macDialog).toBeVisible({ timeout: 15_000 });
      await macDialog
        .getByLabel(/Nombre|Equipo/i)
        .first()
        .fill(machineryName);
      await macDialog
        .getByLabel(/Modelo|Año/i)
        .first()
        .fill('2026');
      await macDialog
        .getByLabel(/Código|Placa/i)
        .first()
        .fill(`EQ-${runId}`);
      await macDialog
        .getByLabel(/Tarifa|Hora/i)
        .first()
        .fill('300');
      await macDialog.getByRole('button', { name: /Guardar Maquinaria/i }).click();
      await expect(macDialog).toBeHidden({ timeout: 30_000 });
      await expect(
        page.getByText(machineryName, { exact: false }).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 20_000 });
    });

    await test.step('Firebase interaction', async () => {
      expect(firebaseRequests.length).toBeGreaterThan(0);
      console.log(`Firebase requests: ${firebaseRequests.length}`);
    });
  });
});
