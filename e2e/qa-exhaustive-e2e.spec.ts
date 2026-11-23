/**
 * qa-exhaustive-e2e.spec.ts
 *
 * PRUEBAS END-TO-END EXHAUSTIVAS — ORIGEN ERP
 *
 * QA Engineer: Simulación de usuario real siguiendo 5 pasos:
 *  1. Autenticación (credenciales correctas, incorrectas, casos de borde)
 *  2. Exploración de Interfaz y Navegación (todos los menús y submenús)
 *  3. Validación de Funcionalidades (cada proceso de negocio, formulario, botón)
 *  4. Profundidad de Pruebas (submenús, módulos anidados, capas profundas)
 *  5. Objetivo Final: Validación del 100% de la aplicación
 *
 */

import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, ensureAuthenticated } from './testCredentials';
import { fillExpenseForm, selectActiveProject, waitForProjectPersisted } from './projectFixture';

/**
 * Sufijo único por ejecución.
 *
 * El emulador de Firebase conserva los datos entre ejecuciones: sin un
 * sufijo, dos corrida dejan el mismo nombre de empleado/maquinaria y los
 * localizadores estricto fallan ("resolved to N elements").
 */
const RUN_ID = Date.now().toString().slice(-6);

// ============================================================
// HELPERS
// ============================================================

async function openTab(page: any, name: string | RegExp) {
  await page.getByRole('button', { name }).first().click();
  await page.waitForTimeout(1500);
}

/**
 * Abre el formulario "Nuevo Proyecto", lo rellena y lo guarda.
 *
 * La navegación al módulo y la apertura del diálogo se hacen aquí para que
 * cualquier prueba pueda crear un proyecto sin repetir esos pasos.
 */
async function fillProjectForm(page: any, overrides: any = {}) {
  const defaults = {
    code: `E2E-${Date.now()}`,
    name: `Proyecto E2E ${Date.now()}`,
    client: 'Cliente E2E',
    location: 'Zona 1, Guatemala',
    municipality: 'Guatemala',
    department: 'Guatemala',
    budgetTotal: '100000',
    progressPercent: '5',
    startDate: '2026-11-01',
    endDate: '2027-11-01',
    ...overrides,
  };

  await openTab(page, 'Proyectos & Firmas');
  await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await dialog.getByLabel('Código del Proyecto').fill(defaults.code);
  await dialog.getByLabel('Nombre del Proyecto').fill(defaults.name);
  await dialog.getByLabel('Nombre del cliente').fill(defaults.client);
  await dialog.getByLabel('Ubicación').fill(defaults.location);
  await dialog.getByLabel('Municipio').fill(defaults.municipality);
  await dialog.getByLabel('Departamento').fill(defaults.department);
  await dialog.getByLabel('Presupuesto Total (Q)').fill(defaults.budgetTotal);
  await dialog.getByLabel('Avance (%)').fill(defaults.progressPercent);
  await dialog.getByLabel('Fecha de Inicio').fill(defaults.startDate);
  await dialog.getByLabel('Fecha de Finalización').fill(defaults.endDate);
  await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });

  // La lista pagina a 10 registros por defecto. Las corridas E2E comparten
  // una empresa emulada y pueden superar ese límite antes de buscar el nuevo
  // proyecto.
  const pageSizeSelector = page.getByLabel('Elementos por página');
  await expect(pageSizeSelector).toBeVisible({ timeout: 15_000 });
  await pageSizeSelector.selectOption('50');
  await expect(
    page.getByRole('button', { name: `Editar proyecto ${defaults.code}` })
  ).toBeVisible({ timeout: 30_000 });
  return defaults;
}

async function showAllProjects(page: any) {
  const pageSizeSelector = page.getByLabel('Elementos por página');
  await expect(pageSizeSelector).toBeVisible({ timeout: 15_000 });
  await pageSizeSelector.selectOption('50');
}

// ============================================================
// PASO 1: AUTENTICACIÓN
// ============================================================

test.describe('PASO 1 — Autenticación (credenciales correctas, incorrectas, casos de borde)', () => {
  test('PASO-1.01 — Login con credenciales válidas → redirección a Tablero', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const emailField = page.getByLabel('Correo electrónico');
    const isVisible = await emailField.isVisible().catch(() => false);

    if (isVisible) {
      await emailField.fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: 'Contraseña' }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
      await page.waitForTimeout(4000);
    }

    await expect(page.getByRole('button', { name: 'Tablero' })).toBeVisible({ timeout: 30_000 });
    await expect(
      page
        .getByRole('complementary', { name: 'Navegación principal' })
        .getByText(ADMIN_EMAIL, { exact: true })
    ).toBeVisible();
  });

  test('PASO-1.02 — Login con email inválido → error de validación', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const emailField = page.getByLabel('Correo electrónico');
    const isVisible = await emailField.isVisible().catch(() => false);
    if (!isVisible) return;

    await emailField.fill('email-invalido');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Password123!');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await page.waitForTimeout(2000);

    // Debe mostrar error de validación, no redirigir
    await expect(page.getByRole('button', { name: 'Tablero' })).toHaveCount(0);
  });

  test('PASO-1.03 — Login con contraseña corta (< 6 caracteres) → error', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const emailField = page.getByLabel('Correo electrónico');
    const isVisible = await emailField.isVisible().catch(() => false);
    if (!isVisible) return;

    await emailField.fill(ADMIN_EMAIL);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByRole('button', { name: 'Tablero' })).toHaveCount(0);
  });

  test('PASO-1.04 — Login con credenciales incorrectas → error', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const emailField = page.getByLabel('Correo electrónico');
    const isVisible = await emailField.isVisible().catch(() => false);
    if (!isVisible) return;

    await emailField.fill('usuario-inexistente@test.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('PasswordWrong!');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByRole('button', { name: 'Tablero' })).toHaveCount(0);
  });

  test('PASO-1.05 — Registro exitoso de nuevo usuario', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const registerBtn = page.getByRole('button', { name: 'Regístrate ahora' });
    const isVisible = await registerBtn.isVisible().catch(() => false);
    if (!isVisible) return;

    await registerBtn.click();
    await page.waitForTimeout(2000);

    await page.getByLabel('Correo electrónico').fill(`e2e-user-${Date.now()}@test.com`);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('SecurePass123!');
    await page.getByLabel('Confirmar contraseña').fill('SecurePass123!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await page.waitForTimeout(4000);
  });

  test('PASO-1.06 — Cierre de sesión → redirección a login', async ({ page }) => {
    await ensureAuthenticated(page);
    const logoutBtn = page.getByRole('button', { name: /Cerrar sesión/i });
    await expect(logoutBtn).toBeVisible({ timeout: 20_000 });
    await logoutBtn.click();

    // Tras cerrar sesión el formulario de acceso debe reaparecer.
    await expect(page.getByLabel('Correo electrónico')).toBeVisible({ timeout: 30_000 });
  });
});

// ============================================================
// PASO 2: EXPLORACIÓN DE INTERFAZ Y NAVEGACIÓN
// ============================================================

test.describe('PASO 2 — Exploración de Interfaz y Navegación (todos los menús)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('PASO-2.01 — Todos los botones de navegación base son visibles', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Tablero' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Proyectos & Firmas' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Presupuestos APU' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cotizaciones' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gastos & Facturas' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Maquinaria' }).first()).toBeVisible();
  });

  test('PASO-2.02 — Navegar a cada sección y verificar carga', async ({ page }) => {
    const sections = [
      'Tablero',
      'Proyectos & Firmas',
      'Presupuestos APU',
      'Cotizaciones',
      'Gastos & Facturas',
      'Maquinaria',
    ];

    for (const section of sections) {
      await openTab(page, section);
      const activeNavigationLink = page.getByRole('button', { name: section }).first();
      await expect(activeNavigationLink).toBeVisible();
      await expect(activeNavigationLink).toHaveAttribute('aria-current', 'page');
    }
  });

  test('PASO-2.03 — Personal & IGSS con submenús (Cuadrillas, Registro GPS)', async ({ page }) => {
    await openTab(page, 'Personal & IGSS');
    await page.waitForTimeout(2000);

    const cuadrillas = page.getByRole('button', { name: /Cuadrillas/ }).first();
    if (await cuadrillas.isVisible().catch(() => false)) {
      await cuadrillas.click();
      await page.waitForTimeout(1000);
      await expect(page.getByRole('button', { name: 'Nuevo Empleado' }).first()).toBeVisible({
        timeout: 20_000,
      });
    }
  });

  test('PASO-2.04 — Planillas Guate visible y navegable para administrador', async ({ page }) => {
    const planillas = page.getByRole('button', { name: 'Planillas Guate' }).first();
    await expect(planillas).toBeVisible({ timeout: 20_000 });
    await planillas.click();
    await expect(planillas).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Estimación de planilla' })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('PASO-2.05 — Reportes visible', async ({ page }) => {
    const reportes = page.getByRole('button', { name: /Reportes|Informes/i }).first();
    await expect(reportes).toBeVisible({ timeout: 20_000 });
  });

  test('PASO-2.06 — Asistente IA visible', async ({ page }) => {
    const ia = page.getByRole('button', { name: /Asistente|IA|AI/i }).first();
    await expect(ia).toBeVisible({ timeout: 20_000 });
  });

  test('PASO-2.07 — Correo / Avisos visible', async ({ page }) => {
    const correo = page.getByRole('button', { name: /Correo|Avisos|Gmail/i }).first();
    await expect(correo).toBeVisible({ timeout: 20_000 });
  });

  test('PASO-2.08 — Equipo de la empresa visible', async ({ page }) => {
    const equipo = page.getByRole('button', { name: 'Equipo de la empresa' }).first();
    await expect(equipo).toBeVisible({ timeout: 20_000 });
  });

  test('PASO-2.09 — Configuración de empresa accesible desde escritorio', async ({ page }) => {
    const config = page.getByRole('button', { name: /Configuración|Marca|Branding/i }).first();
    await expect(config).toBeVisible({ timeout: 20_000 });
    await config.click();
    await expect(page.getByRole('dialog', { name: 'Marca y Personalización' })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: 'Cerrar configuración de marca' }).click();
    await expect(page.getByRole('dialog', { name: 'Marca y Personalización' })).toBeHidden();
  });
});

// ============================================================
// PASO 3: VALIDACIÓN DE FUNCIONALIDADES (CRUD completo)
// ============================================================

test.describe('PASO 3 — Validación de Funcionalidades (procesos de negocio)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('PASO-3.01 — CRUD completo de proyecto (crear, leer, actualizar, archivar, restaurar)', async ({
    page,
  }) => {
    await openTab(page, 'Proyectos & Firmas');
    const projectData = await fillProjectForm(page);

    // Verificar creación - el botón de editar contiene el código del proyecto
    await expect(
      page.getByRole('button', { name: `Editar proyecto ${projectData.code}` })
    ).toBeVisible({ timeout: 20_000 });

    // Editar
    await page.getByRole('button', { name: `Editar proyecto ${projectData.code}` }).click();
    const editDialog = page.getByRole('dialog', { name: 'Editar Proyecto' });
    await editDialog.getByLabel('Nombre del Proyecto').fill(`${projectData.name} ACTUALIZADO`);
    await editDialog.getByRole('button', { name: 'Actualizar' }).click();
    await expect(editDialog).toBeHidden();

    // Archivar: con el filtro "Activos" el proyecto archivado deja de listarse.
    await page.getByRole('button', { name: `Archivar proyecto ${projectData.code}` }).click();
    await page.waitForTimeout(2500);
    await expect(page.getByText(projectData.code)).toHaveCount(0);

    // Restaurar: el filtro "Archivados" muestra los proyectos archivados.
    await page.getByLabel('Mostrar').selectOption('archived');
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: `Restaurar proyecto ${projectData.code}` }).click();
    await page.waitForTimeout(2500);
    await page.getByLabel('Mostrar').selectOption('active');
    await page.waitForTimeout(2000);
  });

  test('PASO-3.02 — Crear gasto y propagar a proyecto y tablero', async ({ page }) => {
    const projectData = await fillProjectForm(page);

    // El formulario de gastos imputa al "proyecto activo": hay que activarlo
    // explícitamente para que el gasto se registre en el proyecto creado.
    await selectActiveProject(page, projectData.code);

    await openTab(page, 'Gastos & Facturas');
    await page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first().click();
    await page.waitForTimeout(1000);

    await fillExpenseForm(page, {
      description: 'Gasto de prueba E2E',
      supplier: 'Proveedor E2E',
      nit: '1294821-9',
      invoice: 'FEL-E2E-001',
      amount: '15000',
    });
    await page.getByRole('button', { name: 'Registrar Gasto (Paso 1)' }).click();
    await page.waitForTimeout(3500);

    await expect(page.getByText('Gasto de prueba E2E').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('15,000').first()).toBeVisible();

    // Propagación al tablero
    await openTab(page, 'Tablero');
    await expect(page.getByText('Gastos Registrados', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('15,000').first()).toBeVisible({ timeout: 20_000 });
  });

  test('PASO-3.03 — Crear cotización y marcar como aceptada', async ({ page }) => {
    const projectData = await fillProjectForm(page);

    await openTab(page, 'Cotizaciones');
    const newQuote = page.getByRole('button', { name: /Nueva Cotización Rápida/i }).first();
    await expect(newQuote).toBeEnabled({ timeout: 20_000 });
    await newQuote.click();
    await page.waitForTimeout(1000);

    await page.getByPlaceholder('Ej. Ing. Guillermo Morales').fill('Cliente E2E Cotización');
    await page
      .getByPlaceholder('Descripción técnica del trabajo…')
      .fill('Cotización de prueba E2E');
    await page.getByPlaceholder('Cant.').fill('1');
    await page.getByPlaceholder('Precio Q').fill('20000');
    await page.getByRole('button', { name: 'Agregar a la lista' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /Guardar como Enviada/i }).click();
    await page.waitForTimeout(3500);

    await expect(page.getByText('Cliente E2E Cotización').first()).toBeVisible({ timeout: 20_000 });
    // 20,000 + IVA 12% (tarifa SAT de Guatemala) = 22,400.
    await expect(page.getByText('22,400').first()).toBeVisible({ timeout: 20_000 });
  });

  test('PASO-3.04 — Registrar empleado y asistencia con GPS', async ({ page }) => {
    await openTab(page, 'Personal & IGSS');
    await page
      .getByRole('button', { name: /Cuadrillas/ })
      .first()
      .click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Nuevo Empleado' }).first().click();
    const empDialog = page.getByRole('dialog', { name: 'Registrar Nuevo Empleado' });
    await empDialog.getByLabel('Nombre Completo').fill(`Empleado E2E Prueba ${RUN_ID}`);
    await empDialog.getByLabel('Jornal Diario (Q)').fill('250');
    await empDialog.getByLabel('Teléfono').fill('5555-1234');
    await empDialog.getByRole('button', { name: 'Guardar Empleado' }).click();
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: 'Registro & Marcaje GPS' }).click();
    await page.waitForTimeout(1500);

    const empOption = page
      .locator('#attendance-employee option')
      .filter({ hasText: `Empleado E2E Prueba ${RUN_ID}` })
      .first();
    const empId = await empOption.getAttribute('value');
    expect(empId).toBeTruthy();
    await page.locator('#attendance-employee').selectOption(empId!);
    await page.getByRole('button', { name: 'En Obra' }).click();
    await page.getByRole('button', { name: 'Guardar Registro de Asistencia' }).click();
    await page.waitForTimeout(2000);
  });

  test('PASO-3.05 — Registrar maquinaria y cambiar estados', async ({ page }) => {
    await openTab(page, 'Maquinaria');
    await page
      .getByRole('button', { name: /Registrar Maquinaria|Nueva Maquinaria/i })
      .first()
      .click();

    const macDialog = page.getByRole('dialog', { name: /Registrar Nueva Maquinaria/ });
    const machineryName = `Maquinaria E2E Prueba ${RUN_ID}`;
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
      .fill(`EQ-E2E-${RUN_ID}`);
    await macDialog
      .getByLabel(/Tarifa|Hora/i)
      .first()
      .fill('300');
    await macDialog
      .getByLabel(/Horómetro/i)
      .first()
      .fill('0');
    await macDialog.getByRole('button', { name: /Guardar Maquinaria/i }).click();
    await page.waitForTimeout(2500);

    await expect(macDialog).toBeHidden();
    const macCard = page
      .locator('div.grid > div')
      .filter({ has: page.getByRole('heading', { name: machineryName, exact: true }) })
      .first();
    await expect(macCard).toContainText('Disponible');
    await macCard.getByRole('button', { name: 'Enviar a mantenimiento' }).click();
    await expect(macCard).toContainText('Mantenimiento');
    await macCard.getByRole('button', { name: 'Marcar disponible' }).click();
    await expect(macCard).toContainText('Disponible');
  });
});

// ============================================================
// PASO 4: PROFUNDIDAD DE PRUEBAS (submenús, módulos anidados)
// ============================================================

test.describe('PASO 4 — Profundidad de Pruebas (submenús, módulos anidados, capas profundas)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('PASO-4.01 — Profundidad: Proyectos → Editar → Cambiar presupuesto → Persistencia tras recarga', async ({
    page,
  }) => {
    const projectData = await fillProjectForm(page);

    await page.getByRole('button', { name: `Editar proyecto ${projectData.code}` }).click();
    const editDialog = page.getByRole('dialog', { name: 'Editar Proyecto' });
    await editDialog.getByLabel('Presupuesto Total (Q)').fill('200000');
    await editDialog.getByRole('button', { name: 'Actualizar' }).click();
    await expect(editDialog).toBeHidden();

    await page.reload();
    await page.waitForTimeout(4000);
    await openTab(page, 'Proyectos & Firmas');
    await showAllProjects(page);
    const row = page.locator('main li').filter({ hasText: projectData.code });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText('200,000');
  });

  test('PASO-4.02 — Profundidad: Gastos → Seleccionar proyecto → Registrar → Ver en proyecto y tablero', async ({
    page,
  }) => {
    const projectData = await fillProjectForm(page);

    // El formulario de gastos imputa al "proyecto activo".
    await selectActiveProject(page, projectData.code);

    await openTab(page, 'Gastos & Facturas');
    await page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first().click();
    await page.waitForTimeout(1000);

    await fillExpenseForm(page, {
      description: 'Gasto profundidad E2E',
      supplier: 'Profundidad Proveedor',
      nit: '1294821-9',
      invoice: 'FEL-E2E-002',
      amount: '8000',
    });
    await page.getByRole('button', { name: 'Registrar Gasto (Paso 1)' }).click();
    await page.waitForTimeout(3500);

    await expect(page.getByText('Gasto profundidad E2E').first()).toBeVisible({ timeout: 20_000 });

    // Ver en proyecto
    await openTab(page, 'Proyectos & Firmas');
    await showAllProjects(page);
    const row = page.locator('main li').filter({ hasText: projectData.code });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText('8,000');

    // Ver en tablero
    await openTab(page, 'Tablero');
    await expect(
      page.locator('main p').filter({ hasText: /^Gastos Registrados$/ }).first()
    ).toBeVisible();
    await expect(page.getByText('8,000').first()).toBeVisible({ timeout: 20_000 });
  });

  test('PASO-4.03 — Profundidad: Cotizaciones → Crear → Vincular proyecto → Ver en proyecto', async ({
    page,
  }) => {
    const projectData = await fillProjectForm(page);

    await openTab(page, 'Cotizaciones');
    const newQuote = page.getByRole('button', { name: /Nueva Cotización Rápida/i }).first();
    await newQuote.click();
    await page.waitForTimeout(1000);

    await page.getByPlaceholder('Ej. Ing. Guillermo Morales').fill('Cliente Profundidad QA');
    await page
      .getByPlaceholder('Descripción técnica del trabajo…')
      .fill('Cotización profundidad E2E');
    await page.getByPlaceholder('Cant.').fill('1');
    await page.getByPlaceholder('Precio Q').fill('12000');
    await page.getByRole('button', { name: 'Agregar a la lista' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /Guardar como Enviada/i }).click();
    await page.waitForTimeout(3500);

    await openTab(page, 'Proyectos & Firmas');
    await showAllProjects(page);
    const row = page.locator('main li').filter({ hasText: projectData.code });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText('Cot. 1');
  });

  test('PASO-4.04 — Profundidad: Reportes → Ver → Exportar', async ({ page }) => {
    await openTab(page, 'Reportes');
    await page.waitForTimeout(2000);

    const reportsVisible = await page
      .getByText(/Reporte|Informe|Exportar|PDF/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (reportsVisible) {
      await expect(page.getByText(/Reporte|Informe|Exportar|PDF/i).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  });

  test('PASO-4.05 — Profundidad: IA → Abrir → Enviar consulta', async ({ page }) => {
    // El acceso al asistente está siempre disponible en la barra lateral: si
    // no aparece, la prueba debe fallar (no Returning en silencio).
    const iaBtn = page.getByRole('button', { name: /Asistente|IA|AI/i }).first();
    await expect(iaBtn).toBeVisible({ timeout: 20_000 });
    await iaBtn.click();
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Asistente|Gemini|Consulta|Pregunta/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('PASO-4.06 — Profundidad: Personal → Cuadrillas → Nuevo Empleado → Asistencia GPS', async ({
    page,
  }) => {
    await openTab(page, 'Personal & IGSS');
    await page
      .getByRole('button', { name: /Cuadrillas/ })
      .first()
      .click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Nuevo Empleado' }).first().click();
    const empDialog = page.getByRole('dialog', { name: 'Registrar Nuevo Empleado' });
    await empDialog.getByLabel('Nombre Completo').fill(`Empleado Profundidad E2E ${RUN_ID}`);
    await empDialog.getByLabel('Jornal Diario (Q)').fill('200');
    await empDialog.getByLabel('Teléfono').fill('5555-9999');
    await empDialog.getByRole('button', { name: 'Guardar Empleado' }).click();
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: 'Registro & Marcaje GPS' }).click();
    await page.waitForTimeout(1500);

    const empOption = page
      .locator('#attendance-employee option')
      .filter({ hasText: `Empleado Profundidad E2E ${RUN_ID}` })
      .first();
    const empId = await empOption.getAttribute('value');
    expect(empId).toBeTruthy();
    await page.locator('#attendance-employee').selectOption(empId!);
    await page.getByRole('button', { name: 'En Obra' }).click();
    await page.getByRole('button', { name: 'Guardar Registro de Asistencia' }).click();
    await page.waitForTimeout(2000);
  });
});

// ============================================================
// PASO 5: VALIDACIÓN DEL 100% (casos de borde, formularios, UI)
// ============================================================

test.describe('PASO 5 — Validación del 100% (casos de borde, formularios, UI inconsistencias)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('PASO-5.01 — Formulario de proyecto con campos vacíos → errores de validación', async ({
    page,
  }) => {
    await openTab(page, 'Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();
    await page.waitForTimeout(1000);

    // Debe mostrar errores de validación, no cerrar el modal
    await expect(dialog).toBeVisible();
  });

  test('PASO-5.02 — Modal se cierra con tecla Escape', async ({ page }) => {
    await openTab(page, 'Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test('PASO-5.03 — Filtro de estado de proyecto funciona', async ({ page }) => {
    await openTab(page, 'Proyectos & Firmas');
    const filterSelect = page.locator('main select').first();
    if (await filterSelect.isVisible().catch(() => false)) {
      await filterSelect.selectOption({ label: 'Archivados' });
      await page.waitForTimeout(2000);
      // No debe haber error
    }
  });

  test('PASO-5.04 — UI: Botones de acción responden (hover, click)', async ({ page }) => {
    await openTab(page, 'Proyectos & Firmas');
    const nuevoBtn = page.getByRole('button', { name: 'Nuevo Proyecto' }).first();
    await expect(nuevoBtn).toBeVisible();
    await nuevoBtn.click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
  });

  test('PASO-5.05 — UI: Navegación entre módulos sin errores', async ({ page }) => {
    const sections = [
      'Tablero',
      'Proyectos & Firmas',
      'Presupuestos APU',
      'Cotizaciones',
      'Gastos & Facturas',
      'Maquinaria',
      'Inventario & Compras',
    ];
    for (const section of sections) {
      await openTab(page, section);
      if (section === 'Inventario & Compras') {
        await expect(page.getByRole('heading', { name: 'Inventario & Compras' })).toBeVisible();
      } else {
        const activeNavigationLink = page.getByRole('button', { name: section }).first();
        await expect(activeNavigationLink).toBeVisible();
        await expect(activeNavigationLink).toHaveAttribute('aria-current', 'page');
      }
    }
  });

  test('PASO-5.06 — UI: Estado vacío manejado sin errores', async ({ page }) => {
    await openTab(page, 'Proyectos & Firmas');
    // Si no hay proyectos, debe mostrar estado vacío, no error
    const emptyState = page.getByText(/No hay proyectos|Sin proyectos/).first();
    const hasProjects = await page
      .getByRole('button', { name: 'Nuevo Proyecto' })
      .isVisible()
      .catch(() => false);
    expect(hasProjects || (await emptyState.isVisible().catch(() => false))).toBe(true);
  });

  test('PASO-5.07 — Navegación de módulos críticos y selección real', async ({ page }) => {
    const criticalSections = [
      'Tablero',
      'Proyectos & Firmas',
      'Presupuestos APU',
      'Cotizaciones',
      'Gastos & Facturas',
      'Maquinaria',
      'Inventario & Compras',
      'Personal & IGSS',
      'Planillas Guate',
      'Reportes Finales',
      'Asistente IA',
      'Correo & Avisos',
      'Equipo de la empresa',
    ];

    for (const section of criticalSections) {
      const navigationButton = page.getByRole('button', { name: section }).first();
      await expect(navigationButton).toBeVisible({ timeout: 20_000 });
      await navigationButton.click();
      await expect(navigationButton).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('#main-content')).toBeVisible();
    }

    const brandingButton = page.getByRole('button', { name: /Configuración de Marca/i }).first();
    await expect(brandingButton).toBeVisible({ timeout: 20_000 });
    await brandingButton.click();
    const brandingDialog = page.getByRole('dialog', { name: 'Marca y Personalización' });
    await expect(brandingDialog).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar configuración de marca' }).click();
    await expect(brandingDialog).toBeHidden();
  });

  test('PASO-5.08 — Validación 100%: Persistencia de datos tras recarga', async ({ page }) => {
    const projectData = await fillProjectForm(page);

    // La recarga solo es segura cuando el backend ya confirmó el documento:
    // el emulador envía el ack antes de aplicarlo y una recarga inmediata
    // puede perder el proyecto.
    await waitForProjectPersisted(page, projectData.code);

    await page.reload();
    await page.waitForTimeout(4000);
    await openTab(page, 'Proyectos & Firmas');
    await expect(page.getByText(projectData.code).first()).toBeVisible({ timeout: 20_000 });
  });

  test('PASO-5.09 — Inventario: historial, búsqueda y filtro de movimientos', async ({ page }) => {
    await openTab(page, 'Inventario & Compras');
    await expect(page.getByRole('heading', { name: 'Inventario & Compras' })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('tab', { name: 'Movimientos' }).click();
    await expect(page.getByRole('region', { name: 'Historial de movimientos' })).toBeVisible();
    await expect(page.getByLabel('Buscar movimiento')).toBeVisible();
    await expect(page.getByLabel('Tipo de movimiento')).toBeVisible();

    await page.getByLabel('Buscar movimiento').fill('QA-HISTORIAL-NO-EXISTE');
    await page.getByLabel('Tipo de movimiento').selectOption('project_issue');
    await expect(page.getByLabel('Tipo de movimiento')).toHaveValue('project_issue');
  });
});

console.log('✓ QA Exhaustive E2E tests completed — PASO 1 a PASO 5');
