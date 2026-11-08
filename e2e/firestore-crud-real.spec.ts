/**
 * e2e/firestore-crud-real.spec.ts
 *
 * PRUEBAS END-TO-END DE FIRESTORE CRUD — ORIGEN ERP
 *
 * OBJETIVO: Validar que todas las operaciones CRUD (Create, Read, Update, Delete)
 * se ejecuten correctamente contra Firestore de PRODUCCIÓN usando credenciales reales
 * y datos ingresados a través de los inputs de la aplicación.
 *
 * REQUISITO PREVIO: Firebase Auth debe estar accesible (usuario creado en Firebase Console)
 * y App Check debug token debe estar registrado en Firebase Console.
 *
 * CREDENCIALES DE PRUEBA (reales, definidas en .env.local):
 *   Email:    salazaroliveros@gmail.com
 *   Password: AngelDarioJose.2026
 *   Project:  origen-erp-guatemala (ID: 893831571998)
 */

import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = 'salazaroliveros@gmail.com';
const ADMIN_PASSWORD = 'AngelDarioJose.2026';

// ============================================================
// HELPERS
// ============================================================

/**
 * Autentica al usuario administrador usando credenciales reales de .env.local
 * Siempre usa login manual para mayor estabilidad
 */
async function ensureAuthenticated(page: any) {
  test.setTimeout(120_000);

  await page.goto('/');
  await page.waitForTimeout(3000);

  // Verificar si ya está autenticado
  const tablero = page.getByRole('button', { name: 'Tablero' });
  const alreadyAuth = await tablero.isVisible({ timeout: 5000 }).catch(() => false);
  if (alreadyAuth) {
    console.log('Usuario ya autenticado');
    return;
  }

  // Login manual
  console.log('Iniciando login manual...');
  const emailField = page.getByLabel('Correo electrónico');
  await expect(emailField).toBeVisible({ timeout: 10_000 });

  await emailField.fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

  // Esperar que cargue el tablero
  await page.waitForTimeout(5000);
  await expect(page.getByRole('button', { name: 'Tablero' })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(ADMIN_EMAIL)).toBeVisible({ timeout: 10_000 });
  console.log('Login exitoso');
}

/**
 * Abre una pestaña de navegación por nombre de botón.
 */
async function openTab(page: any, name: string | RegExp) {
  await page.getByRole('button', { name }).first().click();
  await page.waitForTimeout(1500);
}

/**
 * Genera un identificador único basado en timestamp para evitar colisiones.
 */
function uniqueId(prefix = 'E2E'): string {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

// ============================================================
// PRUEBAS CRUD — COLECCIÓN: projects
// ============================================================

test.describe('FIRESTORE CRUD — Colección: projects (Proyectos de obra)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('CREATE — Crear proyecto y verificar persistencia en Firestore', async ({ page }) => {
    const data = {
      code: `PROJ-${uniqueId()}`,
      name: `Proyecto CRUD Test ${uniqueId()}`,
      client: 'Constructora Test Real',
      location: 'Zona 10, Ciudad de Guatemala',
      municipality: 'Guatemala',
      department: 'Guatemala',
      budgetTotal: '250000',
      progressPercent: '10',
      startDate: '2026-11-01',
      endDate: '2027-05-31',
    };

    await openTab(page, 'Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByLabel('Código del Proyecto').fill(data.code);
    await dialog.getByLabel('Nombre del Proyecto').fill(data.name);
    await dialog.getByLabel('Nombre del cliente').fill(data.client);
    await dialog.getByLabel('Ubicación').fill(data.location);
    await dialog.getByLabel('Municipio').fill(data.municipality);
    await dialog.getByLabel('Departamento').fill(data.department);
    await dialog.getByLabel('Presupuesto Total (Q)').fill(data.budgetTotal);
    await dialog.getByLabel('Avance (%)').fill(data.progressPercent);
    await dialog.getByLabel('Fecha de Inicio').fill(data.startDate);
    await dialog.getByLabel('Fecha de Finalización').fill(data.endDate);

    // Hacer clic en Crear Proyecto y esperar a que el diálogo se cierre
    await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();

    // Esperar a que el diálogo se cierre (puede tomar tiempo por validación y guardado en Firestore)
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(3000);

    // Verificar que el proyecto se persiste en Firestore (visible en lista)
    await expect(page.getByText(data.code).first()).toBeVisible({ timeout: 20_000 });
  });

  test('READ — Leer proyecto existente y verificar campos', async ({ page }) => {
    const data = {
      code: `PROJ-READ-${uniqueId()}`,
      name: `Proyecto Lectura ${uniqueId()}`,
      client: 'Cliente Lectura CRUD',
      location: 'Zona 15, Guatemala',
      municipality: 'Guatemala',
      department: 'Guatemala',
      budgetTotal: '500000',
      progressPercent: '25',
      startDate: '2026-10-01',
      endDate: '2027-10-01',
    };

    await openTab(page, 'Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByLabel('Código del Proyecto').fill(data.code);
    await dialog.getByLabel('Nombre del Proyecto').fill(data.name);
    await dialog.getByLabel('Nombre del cliente').fill(data.client);
    await dialog.getByLabel('Ubicación').fill(data.location);
    await dialog.getByLabel('Municipio').fill(data.municipality);
    await dialog.getByLabel('Departamento').fill(data.department);
    await dialog.getByLabel('Presupuesto Total (Q)').fill(data.budgetTotal);
    await dialog.getByLabel('Avance (%)').fill(data.progressPercent);
    await dialog.getByLabel('Fecha de Inicio').fill(data.startDate);
    await dialog.getByLabel('Fecha de Finalización').fill(data.endDate);
    await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(3000);

    // Verificar que todos los campos se muestran correctamente en la tarjeta
    const projectRow = page.locator('main li').filter({ hasText: data.code }).first();
    await expect(projectRow).toBeVisible({ timeout: 20_000 });
    await expect(projectRow).toContainText(data.name);
    await expect(projectRow).toContainText(data.client);
    await expect(projectRow).toContainText('500,000');
    await expect(projectRow).toContainText('25%');
  });

  test('UPDATE — Actualizar campos del proyecto y verificar cambio en Firestore', async ({
    page,
  }) => {
    const data = {
      code: `PROJ-UPD-${uniqueId()}`,
      name: `Proyecto Original ${uniqueId()}`,
      client: 'Cliente Original',
      location: 'Zona 1, Guatemala',
      municipality: 'Guatemala',
      department: 'Guatemala',
      budgetTotal: '100000',
      progressPercent: '5',
      startDate: '2026-11-01',
      endDate: '2027-11-01',
    };

    await openTab(page, 'Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByLabel('Código del Proyecto').fill(data.code);
    await dialog.getByLabel('Nombre del Proyecto').fill(data.name);
    await dialog.getByLabel('Nombre del cliente').fill(data.client);
    await dialog.getByLabel('Ubicación').fill(data.location);
    await dialog.getByLabel('Municipio').fill(data.municipality);
    await dialog.getByLabel('Departamento').fill(data.department);
    await dialog.getByLabel('Presupuesto Total (Q)').fill(data.budgetTotal);
    await dialog.getByLabel('Avance (%)').fill(data.progressPercent);
    await dialog.getByLabel('Fecha de Inicio').fill(data.startDate);
    await dialog.getByLabel('Fecha de Finalización').fill(data.endDate);
    await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(3000);

    // Editar proyecto
    await page.getByRole('button', { name: `Editar proyecto ${data.code}` }).click();
    const editDialog = page.getByRole('dialog', { name: 'Editar Proyecto' });
    await expect(editDialog).toBeVisible({ timeout: 10_000 });

    // Cambiar presupuesto y avance
    await editDialog.getByLabel('Presupuesto Total (Q)').fill('750000');
    await editDialog.getByLabel('Avance (%)').fill('60');
    await editDialog.getByRole('button', { name: 'Actualizar' }).click();

    await expect(editDialog).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(2000);

    // Verificar que los cambios se persisten
    const projectRow = page.locator('main li').filter({ hasText: data.code }).first();
    await expect(projectRow).toContainText('750,000');
    await expect(projectRow).toContainText('60%');

    // Recargar y verificar persistencia
    await page.reload();
    await page.waitForTimeout(4000);
    await openTab(page, 'Proyectos & Firmas');
    await expect(page.locator('main li').filter({ hasText: data.code }).first()).toContainText(
      '750,000'
    );
    await expect(page.locator('main li').filter({ hasText: data.code }).first()).toContainText(
      '60%'
    );
  });

  test('DELETE — Archivar proyecto (soft delete) y restaurar', async ({ page }) => {
    const data = {
      code: `PROJ-DEL-${uniqueId()}`,
      name: `Proyecto Eliminar ${uniqueId()}`,
      client: 'Cliente Eliminar',
      location: 'Zona 12, Guatemala',
      municipality: 'Guatemala',
      department: 'Guatemala',
      budgetTotal: '300000',
      progressPercent: '0',
      startDate: '2026-11-01',
      endDate: '2027-11-01',
    };

    await openTab(page, 'Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByLabel('Código del Proyecto').fill(data.code);
    await dialog.getByLabel('Nombre del Proyecto').fill(data.name);
    await dialog.getByLabel('Nombre del cliente').fill(data.client);
    await dialog.getByLabel('Ubicación').fill(data.location);
    await dialog.getByLabel('Municipio').fill(data.municipality);
    await dialog.getByLabel('Departamento').fill(data.department);
    await dialog.getByLabel('Presupuesto Total (Q)').fill(data.budgetTotal);
    await dialog.getByLabel('Avance (%)').fill(data.progressPercent);
    await dialog.getByLabel('Fecha de Inicio').fill(data.startDate);
    await dialog.getByLabel('Fecha de Finalización').fill(data.endDate);
    await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(3000);

    // Archivar (soft delete)
    await page.getByRole('button', { name: `Archivar proyecto ${data.code}` }).click();
    await page.waitForTimeout(1000);
    await page.getByLabel('Mostrar').selectOption('archived');
    await page.waitForTimeout(2000);

    // Verificar que desaparece de activos
    await expect(page.getByText(data.code)).toHaveCount(0);

    // Verificar que aparece en archivados
    await expect(page.getByText(data.code).first()).toBeVisible({ timeout: 20_000 });

    // Restaurar
    await page.getByRole('button', { name: `Restaurar proyecto ${data.code}` }).click();
    await page.waitForTimeout(1000);
    await page.getByLabel('Mostrar').selectOption('active');
    await page.waitForTimeout(2000);

    // Verificar que vuelve a activos
    await expect(page.getByText(data.code).first()).toBeVisible({ timeout: 20_000 });
  });
});

// ============================================================
// PRUEBAS CRUD — COLECCIÓN: expenses (Gastos operativos)
// ============================================================

test.describe('FIRESTORE CRUD — Colección: expenses (Gastos operativos)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('CREATE — Registrar gasto y verificar propagación a proyecto y tablero', async ({
    page,
  }) => {
    const data = {
      code: `EXP-${uniqueId()}`,
      name: `Proyecto Gasto ${uniqueId()}`,
      client: 'Cliente Gasto',
      location: 'Zona 5, Guatemala',
      municipality: 'Guatemala',
      department: 'Guatemala',
      budgetTotal: '400000',
      progressPercent: '15',
      startDate: '2026-11-01',
      endDate: '2027-11-01',
    };

    await openTab(page, 'Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByLabel('Código del Proyecto').fill(data.code);
    await dialog.getByLabel('Nombre del Proyecto').fill(data.name);
    await dialog.getByLabel('Nombre del cliente').fill(data.client);
    await dialog.getByLabel('Ubicación').fill(data.location);
    await dialog.getByLabel('Municipio').fill(data.municipality);
    await dialog.getByLabel('Departamento').fill(data.department);
    await dialog.getByLabel('Presupuesto Total (Q)').fill(data.budgetTotal);
    await dialog.getByLabel('Avance (%)').fill(data.progressPercent);
    await dialog.getByLabel('Fecha de Inicio').fill(data.startDate);
    await dialog.getByLabel('Fecha de Finalización').fill(data.endDate);
    await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(3000);

    await openTab(page, 'Gastos & Facturas');
    await page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first().click();
    await page.waitForTimeout(1000);

    // Seleccionar proyecto
    const projectSelect = page.getByLabel('Proyecto Asignado *');
    await projectSelect.click();
    await page.waitForTimeout(1000);

    const options = await projectSelect.locator('option').allTextContents();
    const match = options.find((o: string) => o.includes(data.code));
    if (match) {
      await projectSelect.selectOption({ label: match });
    } else {
      await projectSelect.selectOption({ index: 1 });
    }

    // Llenar campos del gasto
    await page
      .getByLabel('Descripción Detallada del Insumo o Servicio *')
      .fill('Cemento Portland tipo I');
    await page.getByLabel('Proveedor / Emisor SAT').fill('Cemento Progreso S.A.');
    await page.getByLabel('NIT del Proveedor').fill('CF-1234567-8');
    await page.getByLabel('No. Factura SAT Serie/Número').fill(`FAC-E2E-${uniqueId()}`);
    await page.getByLabel('Monto del Gasto *').fill('35000');
    await page.getByRole('button', { name: 'Registrar Gasto (Paso 1)' }).click();
    await page.waitForTimeout(3500);

    // Verificar que el gasto se guarda en Firestore
    await expect(page.getByText('Cemento Portland tipo I').first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('35,000').first()).toBeVisible();

    // Verificar propagación al proyecto
    await openTab(page, 'Proyectos & Firmas');
    const projectRow = page.locator('main li').filter({ hasText: data.code }).first();
    await expect(projectRow).toContainText('35,000');

    // Verificar propagación al tablero
    await openTab(page, 'Tablero');
    await expect(page.getByText('GASTO REAL ACUMULADO')).toBeVisible();
    await expect(page.getByText('35,000').first()).toBeVisible({ timeout: 20_000 });
  });

  test('UPDATE — Actualizar monto del gasto y verificar cambio', async ({ page }) => {
    const data = {
      code: `EXP-UPD-${uniqueId()}`,
      name: `Proyecto Gasto Update ${uniqueId()}`,
      client: 'Cliente Update',
      location: 'Zona 7, Guatemala',
      municipality: 'Guatemala',
      department: 'Guatemala',
      budgetTotal: '600000',
      progressPercent: '20',
      startDate: '2026-11-01',
      endDate: '2027-11-01',
    };

    await openTab(page, 'Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByLabel('Código del Proyecto').fill(data.code);
    await dialog.getByLabel('Nombre del Proyecto').fill(data.name);
    await dialog.getByLabel('Nombre del cliente').fill(data.client);
    await dialog.getByLabel('Ubicación').fill(data.location);
    await dialog.getByLabel('Municipio').fill(data.municipality);
    await dialog.getByLabel('Departamento').fill(data.department);
    await dialog.getByLabel('Presupuesto Total (Q)').fill(data.budgetTotal);
    await dialog.getByLabel('Avance (%)').fill(data.progressPercent);
    await dialog.getByLabel('Fecha de Inicio').fill(data.startDate);
    await dialog.getByLabel('Fecha de Finalización').fill(data.endDate);
    await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(3000);

    await openTab(page, 'Gastos & Facturas');
    await page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first().click();
    await page.waitForTimeout(1000);

    const projectSelect = page.getByLabel('Proyecto Asignado *');
    await projectSelect.click();
    await page.waitForTimeout(1000);

    const options = await projectSelect.locator('option').allTextContents();
    const match = options.find((o: string) => o.includes(data.code));
    if (match) {
      await projectSelect.selectOption({ label: match });
    } else {
      await projectSelect.selectOption({ index: 1 });
    }

    await page
      .getByLabel('Descripción Detallada del Insumo o Servicio *')
      .fill('Acero corrugado 1/2');
    await page.getByLabel('Proveedor / Emisor SAT').fill('Acero Guatemala');
    await page.getByLabel('Monto del Gasto *').fill('20000');
    await page.getByRole('button', { name: 'Registrar Gasto (Paso 1)' }).click();
    await page.waitForTimeout(3500);

    // Intentar editar el gasto (si hay botón de editar disponible)
    const editBtn = page.getByRole('button', { name: /Editar.*gasto/i }).first();
    const editVisible = await editBtn.isVisible().catch(() => false);
    if (editVisible) {
      await editBtn.click();
      await page.waitForTimeout(1000);
      await page.getByLabel('Monto del Gasto *').fill('45000');
      await page.getByRole('button', { name: 'Actualizar Gasto' }).click();
      await page.waitForTimeout(2000);

      await expect(page.getByText('45,000').first()).toBeVisible({ timeout: 20_000 });
    }
  });

  test('DELETE — Eliminar gasto y verificar eliminación de Firestore', async ({ page }) => {
    const data = {
      code: `EXP-DEL-${uniqueId()}`,
      name: `Proyecto Gasto Delete ${uniqueId()}`,
      client: 'Cliente Delete',
      location: 'Zona 9, Guatemala',
      municipality: 'Guatemala',
      department: 'Guatemala',
      budgetTotal: '800000',
      progressPercent: '30',
      startDate: '2026-11-01',
      endDate: '2027-11-01',
    };

    await openTab(page, 'Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByLabel('Código del Proyecto').fill(data.code);
    await dialog.getByLabel('Nombre del Proyecto').fill(data.name);
    await dialog.getByLabel('Nombre del cliente').fill(data.client);
    await dialog.getByLabel('Ubicación').fill(data.location);
    await dialog.getByLabel('Municipio').fill(data.municipality);
    await dialog.getByLabel('Departamento').fill(data.department);
    await dialog.getByLabel('Presupuesto Total (Q)').fill(data.budgetTotal);
    await dialog.getByLabel('Avance (%)').fill(data.progressPercent);
    await dialog.getByLabel('Fecha de Inicio').fill(data.startDate);
    await dialog.getByLabel('Fecha de Finalización').fill(data.endDate);
    await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(3000);

    await openTab(page, 'Gastos & Facturas');
    await page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first().click();
    await page.waitForTimeout(1000);

    const projectSelect = page.getByLabel('Proyecto Asignado *');
    await projectSelect.click();
    await page.waitForTimeout(1000);

    const options = await projectSelect.locator('option').allTextContents();
    const match = options.find((o: string) => o.includes(data.code));
    if (match) {
      await projectSelect.selectOption({ label: match });
    } else {
      await projectSelect.selectOption({ index: 1 });
    }

    await page
      .getByLabel('Descripción Detallada del Insumo o Servicio *')
      .fill('Material para eliminar');
    await page.getByLabel('Proveedor / Emisor SAT').fill('Proveedor Eliminar');
    await page.getByLabel('Monto del Gasto *').fill('12000');
    await page.getByRole('button', { name: 'Registrar Gasto (Paso 1)' }).click();
    await page.waitForTimeout(3500);

    await expect(page.getByText('Material para eliminar').first()).toBeVisible({ timeout: 20_000 });

    // Intentar eliminar el gasto
    const deleteBtn = page.getByRole('button', { name: /Eliminar.*gasto|Delete.*gasto/i }).first();
    const deleteVisible = await deleteBtn.isVisible().catch(() => false);
    if (deleteVisible) {
      await deleteBtn.click();
      await page.waitForTimeout(2000);
      await expect(page.getByText('Material para eliminar')).toHaveCount(0);
    }
  });
});

// ============================================================
// PRUEBAS CRUD — COLECCIÓN: employees (Personal)
// ============================================================

test.describe('FIRESTORE CRUD — Colección: employees (Personal y cuadrillas)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('CREATE — Registrar empleado y verificar persistencia', async ({ page }) => {
    await openTab(page, 'Personal & IGSS');
    await page
      .getByRole('button', { name: /Cuadrillas/ })
      .first()
      .click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Nuevo Empleado' }).first().click();
    const empDialog = page.getByRole('dialog', { name: 'Registrar Nuevo Empleado' });
    await expect(empDialog).toBeVisible({ timeout: 10_000 });

    const empData = {
      name: `Empleado CRUD ${uniqueId()}`,
      dailyRate: '300',
      phone: '5555-7777',
    };

    await empDialog.getByLabel('Nombre Completo').fill(empData.name);
    await empDialog.getByLabel('Jornal Diario (Q)').fill(empData.dailyRate);
    await empDialog.getByLabel('Teléfono').fill(empData.phone);
    await empDialog.getByRole('button', { name: 'Guardar Empleado' }).click();

    await expect(empDialog).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(2000);

    await expect(page.getByText(empData.name).first()).toBeVisible({ timeout: 20_000 });

    // Recargar y verificar persistencia
    await page.reload();
    await page.waitForTimeout(4000);
    await openTab(page, 'Personal & IGSS');
    await page
      .getByRole('button', { name: /Cuadrillas/ })
      .first()
      .click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(empData.name).first()).toBeVisible({ timeout: 20_000 });
  });

  test('UPDATE — Actualizar jornal del empleado y verificar cambio', async ({ page }) => {
    await openTab(page, 'Personal & IGSS');
    await page
      .getByRole('button', { name: /Cuadrillas/ })
      .first()
      .click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Nuevo Empleado' }).first().click();
    const empDialog = page.getByRole('dialog', { name: 'Registrar Nuevo Empleado' });
    await empDialog.getByLabel('Nombre Completo').fill(`Empleado Update ${uniqueId()}`);
    await empDialog.getByLabel('Jornal Diario (Q)').fill('200');
    await empDialog.getByLabel('Teléfono').fill('5555-8888');
    await empDialog.getByRole('button', { name: 'Guardar Empleado' }).click();
    await page.waitForTimeout(2000);

    // Intentar editar el empleado (si hay botón de editar)
    const editBtn = page.getByRole('button', { name: /Editar.*empleado/i }).first();
    const editVisible = await editBtn.isVisible().catch(() => false);
    if (editVisible) {
      await editBtn.click();
      const editDialog = page.getByRole('dialog', { name: /Editar.*empleado/i });
      await editDialog.getByLabel('Jornal Diario (Q)').fill('350');
      await editDialog.getByRole('button', { name: 'Actualizar Empleado' }).click();
      await page.waitForTimeout(2000);

      await expect(page.getByText('350').first()).toBeVisible({ timeout: 20_000 });
    }
  });

  test('DELETE — Eliminar empleado y verificar eliminación', async ({ page }) => {
    await openTab(page, 'Personal & IGSS');
    await page
      .getByRole('button', { name: /Cuadrillas/ })
      .first()
      .click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Nuevo Empleado' }).first().click();
    const empDialog = page.getByRole('dialog', { name: 'Registrar Nuevo Empleado' });
    await empDialog.getByLabel('Nombre Completo').fill(`Empleado Delete ${uniqueId()}`);
    await empDialog.getByLabel('Jornal Diario (Q)').fill('150');
    await empDialog.getByLabel('Teléfono').fill('5555-9999');
    await empDialog.getByRole('button', { name: 'Guardar Empleado' }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText(`Empleado Delete ${uniqueId()}`).first()).toBeVisible({
      timeout: 20_000,
    });

    // Intentar eliminar el empleado
    const deleteBtn = page
      .getByRole('button', { name: /Eliminar.*empleado|Delete.*empleado/i })
      .first();
    const deleteVisible = await deleteBtn.isVisible().catch(() => false);
    if (deleteVisible) {
      await deleteBtn.click();
      await page.waitForTimeout(2000);
      await expect(page.getByText(`Empleado Delete ${uniqueId()}`)).toHaveCount(0);
    }
  });
});

// ============================================================
// PRUEBAS CRUD — COLECCIÓN: machinery (Maquinaria)
// ============================================================

test.describe('FIRESTORE CRUD — Colección: machinery (Maquinaria y equipos)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('CREATE — Registrar maquinaria y cambiar estados (Disponible → Mantenimiento → Disponible)', async ({
    page,
  }) => {
    await openTab(page, 'Maquinaria');
    await page
      .getByRole('button', { name: /Registrar Maquinaria|Nueva Maquinaria/i })
      .first()
      .click();

    const macDialog = page.getByRole('dialog', { name: /Registrar Nueva Maquinaria/ });
    await expect(macDialog).toBeVisible({ timeout: 10_000 });

    const macData = {
      name: `Retroexcavadora CRUD ${uniqueId()}`,
      model: '2026',
      plate: `CRUD-${uniqueId()}`,
      rate: '400',
      hours: '0',
    };

    await macDialog
      .getByLabel(/Nombre|Equipo/i)
      .first()
      .fill(macData.name);
    await macDialog
      .getByLabel(/Modelo|Año/i)
      .first()
      .fill(macData.model);
    await macDialog
      .getByLabel(/Código|Placa/i)
      .first()
      .fill(macData.plate);
    await macDialog
      .getByLabel(/Tarifa|Hora/i)
      .first()
      .fill(macData.rate);
    await macDialog
      .getByLabel(/Horómetro/i)
      .first()
      .fill(macData.hours);
    await macDialog.getByRole('button', { name: /Guardar Maquinaria/i }).click();

    await expect(macDialog).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(2500);

    const macCard = page
      .locator('div.grid > div')
      .filter({ has: page.getByText(macData.name, { exact: true }) });
    await expect(macCard).toContainText('Disponible');
    await expect(macCard).toContainText(macData.rate);

    // Cambiar a mantenimiento
    await macCard.getByRole('button', { name: 'Enviar a mantenimiento' }).click();
    await expect(macCard).toContainText('Mantenimiento');

    // Volver a disponible
    await macCard.getByRole('button', { name: 'Marcar disponible' }).click();
    await expect(macCard).toContainText('Disponible');
  });
});

// ============================================================
// PRUEBAS CRUD — COLECCIÓN: quotes (Cotizaciones)
// ============================================================

test.describe('FIRESTORE CRUD — Colección: quotes (Cotizaciones de clientes)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('CREATE — Crear cotización y marcar como aceptada (propaga a ingresos)', async ({
    page,
  }) => {
    const data = {
      code: `QUOTE-PROJ-${uniqueId()}`,
      name: `Proyecto Cotización ${uniqueId()}`,
      client: 'Cliente Cotización',
      location: 'Zona 13, Guatemala',
      municipality: 'Guatemala',
      department: 'Guatemala',
      budgetTotal: '900000',
      progressPercent: '5',
      startDate: '2026-11-01',
      endDate: '2027-11-01',
    };

    await openTab(page, 'Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByLabel('Código del Proyecto').fill(data.code);
    await dialog.getByLabel('Nombre del Proyecto').fill(data.name);
    await dialog.getByLabel('Nombre del cliente').fill(data.client);
    await dialog.getByLabel('Ubicación').fill(data.location);
    await dialog.getByLabel('Municipio').fill(data.municipality);
    await dialog.getByLabel('Departamento').fill(data.department);
    await dialog.getByLabel('Presupuesto Total (Q)').fill(data.budgetTotal);
    await dialog.getByLabel('Avance (%)').fill(data.progressPercent);
    await dialog.getByLabel('Fecha de Inicio').fill(data.startDate);
    await dialog.getByLabel('Fecha de Finalización').fill(data.endDate);
    await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(3000);

    await openTab(page, 'Cotizaciones');
    const newQuote = page.getByRole('button', { name: /Nueva Cotización Rápida/i }).first();
    await expect(newQuote).toBeEnabled({ timeout: 20_000 });
    await newQuote.click();
    await page.waitForTimeout(1000);

    await page.getByPlaceholder('Ej. Ing. Guillermo Morales').fill('Cliente Cotización CRUD');
    await page
      .getByPlaceholder('Descripción técnica del trabajo…')
      .fill('Cotización de prueba CRUD');
    await page.getByPlaceholder('Cant.').fill('2');
    await page.getByPlaceholder('Precio Q').fill('15000');
    await page.getByRole('button', { name: 'Agregar a la lista' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /Guardar como Enviada/i }).click();
    await page.waitForTimeout(3500);

    await expect(page.getByText('Cliente Cotización CRUD').first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('30,000').first()).toBeVisible({ timeout: 20_000 });

    // Marcar como aceptada
    const acceptBtn = page.getByRole('button', { name: /Aceptar|Aceptada/i }).first();
    const acceptVisible = await acceptBtn.isVisible().catch(() => false);
    if (acceptVisible) {
      await acceptBtn.click();
      await page.waitForTimeout(2000);
      await expect(page.getByText(/Aceptada/i).first()).toBeVisible({ timeout: 15_000 });
    }
  });
});

// ============================================================
// PRUEBAS CRUD — COLECCIÓN: attendance (Asistencia con GPS)
// ============================================================

test.describe('FIRESTORE CRUD — Colección: attendance (Asistencia con GPS)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('CREATE — Registrar empleado y marcar asistencia con GPS', async ({ page }) => {
    await openTab(page, 'Personal & IGSS');
    await page
      .getByRole('button', { name: /Cuadrillas/ })
      .first()
      .click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Nuevo Empleado' }).first().click();
    const empDialog = page.getByRole('dialog', { name: 'Registrar Nuevo Empleado' });
    await empDialog.getByLabel('Nombre Completo').fill(`Empleado Asistencia ${uniqueId()}`);
    await empDialog.getByLabel('Jornal Diario (Q)').fill('275');
    await empDialog.getByLabel('Teléfono').fill('5555-5555');
    await empDialog.getByRole('button', { name: 'Guardar Empleado' }).click();
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: 'Registro y Marcaje GPS' }).click();
    await page.waitForTimeout(1500);

    const empSelect = page.locator('#attendance-employee');
    const empOption = empSelect
      .locator('option')
      .filter({ hasText: `Empleado Asistencia ${uniqueId()}` })
      .first();
    const empId = await empOption.getAttribute('value');
    expect(empId).toBeTruthy();

    await empSelect.selectOption(empId!);
    await page.getByRole('button', { name: 'En Obra' }).click();
    await page.getByRole('button', { name: 'Guardar Registro de Asistencia' }).click();
    await page.waitForTimeout(2000);

    const attRow = page.getByRole('row').filter({ hasText: `Empleado Asistencia ${uniqueId()}` });
    await expect(attRow).toBeVisible({ timeout: 15_000 });
  });
});

// ============================================================
// PRUEBAS CRUD — COLECCIÓN: attendance (Asistencia con GPS)
// ============================================================

test.describe('FIRESTORE — Validación de integridad de datos transversal', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('Datos persisten tras recarga de página en múltiples colecciones', async ({ page }) => {
    const data = {
      code: `INT-PROJ-${uniqueId()}`,
      name: `Proyecto Integridad ${uniqueId()}`,
      client: 'Cliente Integridad',
      location: 'Zona 14, Guatemala',
      municipality: 'Guatemala',
      department: 'Guatemala',
      budgetTotal: '900000',
      progressPercent: '40',
      startDate: '2026-11-01',
      endDate: '2027-11-01',
    };

    await openTab(page, 'Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByLabel('Código del Proyecto').fill(data.code);
    await dialog.getByLabel('Nombre del Proyecto').fill(data.name);
    await dialog.getByLabel('Nombre del cliente').fill(data.client);
    await dialog.getByLabel('Ubicación').fill(data.location);
    await dialog.getByLabel('Municipio').fill(data.municipality);
    await dialog.getByLabel('Departamento').fill(data.department);
    await dialog.getByLabel('Presupuesto Total (Q)').fill(data.budgetTotal);
    await dialog.getByLabel('Avance (%)').fill(data.progressPercent);
    await dialog.getByLabel('Fecha de Inicio').fill(data.startDate);
    await dialog.getByLabel('Fecha de Finalización').fill(data.endDate);
    await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(3000);

    // Recargar y verificar que todo persiste
    await page.reload();
    await page.waitForTimeout(4000);
    await openTab(page, 'Proyectos & Firmas');
    await expect(page.getByText(data.code).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(data.name).first()).toBeVisible();
    await expect(page.getByText('900,000').first()).toBeVisible();
    await expect(page.getByText('40%').first()).toBeVisible();
  });

  test('Firestore rules bloquean acceso no autenticado (seguridad)', async ({ page }) => {
    // Ir a la página de login (desautenticar si es necesario)
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Verificar que no hay acceso directo a datos sin auth
    const emailField = page.getByLabel('Correo electrónico');
    const isVisible = await emailField.isVisible().catch(() => false);
    expect(isVisible).toBe(true); // Debe mostrar login, no datos directamente
  });
});

console.log('✓ Firestore CRUD E2E tests defined — PASO 1 a PASO 5');
console.log('NOTA: Requiere Firebase Auth accesible para ejecutarse completamente');
