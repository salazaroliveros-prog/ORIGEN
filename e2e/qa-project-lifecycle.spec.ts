import { expect, test, type Page } from '@playwright/test';

const ADMIN_EMAIL = 'salazaroliveros@gmail.com';
const ADMIN_PASSWORD = 'Origen2026!Secure';
const RUN_ID = Date.now().toString().slice(-6);

async function ensureAuthenticated(page: Page) {
  test.setTimeout(180_000);
  await page.goto('/');
  await page.waitForTimeout(3000);

  const emailField = page.getByLabel('Correo electrónico');
  if (!(await emailField.isVisible().catch(() => false))) return;

  await emailField.fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForTimeout(4000);

  if (
    await page
      .getByRole('button', { name: 'Regístrate ahora' })
      .isVisible()
      .catch(() => false)
  ) {
    await page.getByRole('button', { name: 'Regístrate ahora' }).click();
    await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
    await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD);
    await page.getByLabel('Confirmar contraseña').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await page.waitForTimeout(6000);
  }

  await expect(page.getByRole('button', { name: 'Tablero' })).toBeVisible({ timeout: 30_000 });
}

async function openTab(page: Page, name: RegExp) {
  await page.getByRole('button', { name }).first().click();
  await page.waitForTimeout(1500);
}

async function createProject(page: Page, code: string, name: string, progress: number) {
  await openTab(page, /Proyectos & Firmas/);
  await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();
  await page.getByLabel('Código del Proyecto').fill(code);
  await page.getByLabel('Nombre del Proyecto').fill(name);
  await page.getByLabel('Cliente').fill('Cliente QA Automatizado');
  await page.getByLabel('Ubicación').fill('Zona 10, Ciudad de Guatemala');
  await page.getByLabel('Municipio').fill('Guatemala');
  await page.getByLabel('Departamento').fill('Guatemala');
  await page.getByLabel('Presupuesto Total (Q)').fill('100000');
  await page.getByLabel('Gasto Ejecutado (Q)').fill('0');
  await page.getByLabel('Avance (%)').fill(String(progress));
  await page.getByLabel('Fecha de Inicio').fill('2026-11-01');
  await page.getByLabel('Fecha de Finalización').fill('2027-05-01');
  await page.getByLabel('Estado del Proyecto').selectOption({ label: 'En Ejecución' });
  await page.getByRole('button', { name: 'Crear Proyecto' }).click();
  await page.waitForTimeout(3000);
}

test.describe.serial('QA integridad de datos - ciclo de proyecto', () => {
  test('crea, lee, actualiza y persiste un proyecto', async ({ page }) => {
    await ensureAuthenticated(page);
    const code = `QA-${RUN_ID}-A`;
    const name = `QA Torre Integridad ${RUN_ID}`;

    await createProject(page, code, name, 5);
    await expect(page.getByText(code).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(name).first()).toBeVisible();
    await expect(page.getByText('En Ejecución').first()).toBeVisible();
    await expect(page.getByText('100,000').first()).toBeVisible();

    await page.getByRole('button', { name: `Editar proyecto ${code}` }).click();
    await expect(page.getByText('Editar Proyecto')).toBeVisible();
    await page.getByLabel('Presupuesto Total (Q)').fill('150000');
    await page.getByRole('button', { name: 'Actualizar' }).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('150,000').first()).toBeVisible({ timeout: 20_000 });

    await page.reload();
    await page.waitForTimeout(4000);
    await openTab(page, /Proyectos & Firmas/);
    await expect(page.getByText(code).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('150,000').first()).toBeVisible();
    await expect(page.getByText('En Ejecución').first()).toBeVisible();
  });

  test('archiva y restaura el proyecto sin perder datos', async ({ page }) => {
    await ensureAuthenticated(page);
    const code = `QA-${RUN_ID}-B`;
    await createProject(page, code, `QA Bodega ${RUN_ID}`, 10);
    await expect(page.getByText(code).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: `Archivar proyecto ${code}` }).click();
    await page.waitForTimeout(2500);
    await expect(page.getByText(code)).toHaveCount(0);

    await page.locator('main select').first().selectOption({ label: 'Archivados' });
    await page.waitForTimeout(2000);
    await expect(page.getByText(code).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: `Restaurar proyecto ${code}` }).click();
    await page.waitForTimeout(2500);
    await page.locator('main select').first().selectOption({ label: 'Activos' });
    await page.waitForTimeout(2000);
    await expect(page.getByText(code).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('100,000').first()).toBeVisible();
  });

  test('registra un gasto y lo propaga al proyecto y al tablero', async ({ page }) => {
    await ensureAuthenticated(page);
    const code = `QA-${RUN_ID}-C`;
    await createProject(page, code, `QA Gastos ${RUN_ID}`, 5);

    await openTab(page, /Gastos & Facturas/);
    await page.getByRole('button', { name: 'Nuevo Gasto / Factura' }).first().click();
    const projectSelect = page.getByLabel('Proyecto Asignado *');
    const options = await projectSelect.locator('option').allTextContents();
    const match = options.find((option) => option.includes(code));
    if (match) await projectSelect.selectOption({ label: match });
    else await projectSelect.selectOption({ index: 1 });
    await page
      .getByLabel('Descripción Detallada del Insumo o Servicio *')
      .fill('Compra de cemento QA');
    await page.getByLabel('Proveedor / Emisor SAT').fill('Cemento Progreso');
    await page.getByLabel('NIT del Proveedor').fill('CF');
    await page.getByLabel('No. Factura SAT Serie/Número').fill('FEL-QA-001');
    await page.getByLabel('Monto del Gasto *').fill('12000');
    await page.getByRole('button', { name: 'Guardar y Registrar Gasto' }).click();
    await page.waitForTimeout(3500);

    await expect(page.getByText('Compra de cemento QA').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('12,000').first()).toBeVisible();

    await openTab(page, /Proyectos & Firmas/);
    const rowContainer = page.locator('main li').filter({ hasText: code });
    await expect(rowContainer).toBeVisible({ timeout: 20_000 });
    await expect(rowContainer).toContainText('12,000');

    await openTab(page, /Tablero/);
    await expect(page.getByText('GASTO REAL ACUMULADO')).toBeVisible();
    await expect(page.getByText('12,000').first()).toBeVisible({ timeout: 20_000 });
  });

  test('registra una cotización y la refleja como ingreso del proyecto', async ({ page }) => {
    await ensureAuthenticated(page);
    const code = `QA-${RUN_ID}-D`;
    await createProject(page, code, `QA Ingresos ${RUN_ID}`, 5);

    await openTab(page, /Cotizaciones/);
    const newQuote = page.getByRole('button', { name: /Nueva Cotización Rápida/i }).first();
    await expect(newQuote).toBeEnabled({ timeout: 20_000 });
    await newQuote.click();
    await page.waitForTimeout(1000);

    await page.getByPlaceholder('Ej. Ing. Guillermo Morales').fill('Cliente Ingreso QA');
    const linked = page
      .locator('label', { hasText: 'Proyecto Vinculado' })
      .locator('..')
      .locator('select');
    const linkedOptions = await linked.locator('option').allTextContents();
    const linkedMatch = linkedOptions.find((option) => option.includes(code));
    if (linkedMatch) await linked.selectOption({ label: linkedMatch });

    await page
      .getByPlaceholder('Descripción técnica del trabajo...')
      .fill('Renglón QA de ingresos');
    await page.getByPlaceholder('Cant.').fill('1');
    await page.getByPlaceholder('Precio Q').fill('25000');
    await page.getByRole('button', { name: 'Agregar a la lista' }).click();
    await page.getByRole('button', { name: /Guardar como Enviada/i }).click();
    await page.waitForTimeout(3500);

    await expect(page.getByText('Cliente Ingreso QA').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('28,000').first()).toBeVisible({ timeout: 20_000 });

    await openTab(page, /Proyectos & Firmas/);
    const rowContainer = page.locator('main li').filter({ hasText: code });
    await expect(rowContainer).toBeVisible({ timeout: 20_000 });
    await expect(rowContainer).toContainText('Cot. 1');
  });
});

test.describe('QA defectos detectados', () => {
  test('DEFECTO: el avance manual se conserva al crear y editar', async ({ page }) => {
    test.fail(
      true,
      'Bug: useProjectData recalcula el avance desde el cronograma y lo deja en 0% cuando el proyecto no tiene tareas/hitos configurados.'
    );
    await ensureAuthenticated(page);
    const code = `QA-${RUN_ID}-P`;
    await createProject(page, code, `QA Avance ${RUN_ID}`, 25);

    await expect(page.getByText('25%').first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: `Editar proyecto ${code}` }).click();
    await page.getByLabel('Avance (%)').fill('60');
    await page.getByRole('button', { name: 'Actualizar' }).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('60%').first()).toBeVisible({ timeout: 20_000 });

    await page.reload();
    await page.waitForTimeout(4000);
    await openTab(page, /Proyectos & Firmas/);
    await expect(page.getByText('60%').first()).toBeVisible({ timeout: 20_000 });
  });

  test('DEFECTO: un gasto sin proveedor, NIT ni factura se guarda o explica el campo faltante', async ({
    page,
  }) => {
    test.fail(
      true,
      'Bug: ExpenseRecordSchema exige supplier/nitSupplier/facturaNumber, la UI no los marca obligatorios y el error mostrado culpa a la sesión.'
    );
    await ensureAuthenticated(page);
    const code = `QA-${RUN_ID}-E`;
    await createProject(page, code, `QA Gasto Incompleto ${RUN_ID}`, 5);

    await openTab(page, /Gastos & Facturas/);
    await page.getByRole('button', { name: 'Nuevo Gasto / Factura' }).first().click();
    const projectSelect = page.getByLabel('Proyecto Asignado *');
    const options = await projectSelect.locator('option').allTextContents();
    const match = options.find((option) => option.includes(code));
    if (match) await projectSelect.selectOption({ label: match });
    else await projectSelect.selectOption({ index: 1 });
    await page
      .getByLabel('Descripción Detallada del Insumo o Servicio *')
      .fill('Gasto QA sin factura');
    await page.getByLabel('Monto del Gasto *').fill('500');
    await page.getByRole('button', { name: 'Guardar y Registrar Gasto' }).click();
    await page.waitForTimeout(3500);

    await expect(page.getByText('No se pudo guardar el gasto. Verifica tu sesión')).toHaveCount(0);
  });
});
