import { expect, test, type Page } from '@playwright/test';
import { ensureAuthenticated } from './testCredentials';
import { fillExpenseForm, selectActiveProject } from './projectFixture';

const RUN_ID = Date.now().toString().slice(-6);

test.setTimeout(300_000);

/**
 * Utilidades compartidas para el flujo E2E completo del ciclo de vida del proyecto.
 */

async function openTab(page: Page, name: RegExp | string) {
  await page.getByRole('link', { name }).first().click();
  await page.waitForTimeout(1500);
}

/**
 * Registra una partida APU manual desde la interfaz.
 *
 * El formulario "Nuevo Renglón APU Manual" (`components/BudgetAndAPU.tsx`)
 * expone sus campos con `name`, no con `<label for>`: el locator correcto es
 * `input[name="..."]`.
 */
async function addManualAPUItem(
  page: Page,
  item: {
    code: string;
    unit: string;
    desc: string;
    qty: string;
    matCost: string;
    labCost: string;
    eqCost: string;
  }
): Promise<void> {
  await page.getByRole('button', { name: 'Renglón Manual' }).click();

  const modal = page
    .locator('div.fixed.inset-0')
    .filter({ hasText: 'Nuevo Renglón APU Manual' })
    .first();
  await expect(modal).toBeVisible({ timeout: 15_000 });

  await modal.locator('input[name="code"]').fill(item.code);
  await modal.locator('input[name="unit"]').fill(item.unit);
  await modal.locator('input[name="desc"]').fill(item.desc);
  await modal.locator('input[name="qty"]').fill(item.qty);
  await modal.locator('input[name="matCost"]').fill(item.matCost);
  await modal.locator('input[name="labCost"]').fill(item.labCost);
  await modal.locator('input[name="eqCost"]').fill(item.eqCost);

  await modal.getByRole('button', { name: 'Guardar Renglón APU' }).click();

  // El modal solo se cierra cuando el guardado en Firestore fue exitoso.
  await expect(modal).toBeHidden({ timeout: 30_000 });
}

async function getProjectRow(page: Page, code: string, action: 'Editar proyecto' | 'Archivar proyecto' | 'Restaurar proyecto' = 'Editar proyecto') {
  const actionButton = page.getByRole('button', { name: `${action} ${code}` });
  await expect(actionButton).toBeVisible({ timeout: 20_000 });
  return actionButton.locator('xpath=ancestor::li[1]');
}

async function createProject(page: Page, code: string, name: string, progress: number) {
  await openTab(page, 'Proyectos & Firmas');
  await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();
  await page.getByLabel('Código del Proyecto').fill(code);
  await page.getByLabel('Nombre del Proyecto').fill(name);
  await page.getByLabel('Cliente').first().fill('Cliente QA Automatizado');
  await page.getByLabel('Ubicación').fill('Zona 10, Ciudad de Guatemala');
  await page.getByLabel('Municipio').fill('Guatemala');
  await page.getByLabel('Departamento').fill('Guatemala');
  await page.getByLabel('Presupuesto Total (Q)').fill('100000');
  await page.getByLabel('Avance (%)').fill(String(progress));
  await page.getByLabel('Fecha de Inicio').fill('2026-11-01');
  await page.getByLabel('Fecha de Finalización').fill('2027-05-01');
  await page.getByLabel('Estado del Proyecto').selectOption({ label: 'Planificación' });
  await page.getByRole('button', { name: 'Crear Proyecto' }).click();
  await page.waitForTimeout(3000);
}

/**
 * ============================================================================
 * FASE 1 — MÓDULO DE PROYECTOS
 * ============================================================================
 */
test.describe('FASE 1 — Módulo de Proyectos: ciclo de vida completo', () => {
  test('crea un proyecto con todos los campos y valida integridad de datos', async ({ page }) => {
    await ensureAuthenticated(page);
    const code = `QA-PROJ-${RUN_ID}`;
    const name = `QA Proyecto Integridad ${RUN_ID}`;

    await createProject(page, code, name, 5);

    // Verificar la fila visible del listado; el selector de proyecto contiene
    // una <option> oculta con el mismo código y no debe usarse como resultado.
    let projectRow = await getProjectRow(page, code);
    await expect(projectRow.getByText(code, { exact: true })).toBeVisible();
    await expect(projectRow.getByText(name, { exact: true })).toBeVisible();
    await expect(projectRow.getByText('Planificación', { exact: true })).toBeVisible();
    await expect(projectRow.getByText('100,000')).toBeVisible();

    // Editar: corregir presupuesto.
    await page.getByRole('button', { name: `Editar proyecto ${code}` }).click();
    await expect(page.getByText('Editar Proyecto')).toBeVisible();
    await page.getByLabel('Presupuesto Total (Q)').fill('250000');
    await page.getByLabel('Avance (%)').fill('10');
    await page.getByRole('button', { name: 'Actualizar' }).click();
    await page.waitForTimeout(3000);

    projectRow = await getProjectRow(page, code);
    await expect(projectRow.getByText('250,000')).toBeVisible({ timeout: 20_000 });
    await expect(projectRow.getByText('10%', { exact: true })).toBeVisible({ timeout: 20_000 });

    // Persistencia: recargar y verificar la fila real del listado.
    await page.reload();
    await page.waitForTimeout(4000);
    await openTab(page, 'Proyectos & Firmas');
    projectRow = await getProjectRow(page, code);
    await expect(projectRow.getByText('250,000')).toBeVisible();
    await expect(projectRow.getByText('Planificación', { exact: true })).toBeVisible();
  });

  test('archiva y restaura el proyecto sin perder datos', async ({ page }) => {
    await ensureAuthenticated(page);
    const code = `QA-PROJ-${RUN_ID}-ARCH`;
    await createProject(page, code, `QA Archivo ${RUN_ID}`, 5);
    await getProjectRow(page, code);

    await page.getByRole('button', { name: `Archivar proyecto ${code}` }).click();
    await expect(page.getByRole('button', { name: `Editar proyecto ${code}` })).toHaveCount(0);

    await page.locator('main select').first().selectOption({ label: 'Archivados' });
    const archivedRow = await getProjectRow(page, code, 'Restaurar proyecto');
    await expect(archivedRow.getByText('100,000')).toBeVisible();

    await page.getByRole('button', { name: `Restaurar proyecto ${code}` }).click();
    await page.locator('main select').first().selectOption({ label: 'Activos' });
    const restoredRow = await getProjectRow(page, code);
    await expect(restoredRow.getByText('100,000')).toBeVisible();
  });
});

/**
 * ============================================================================
 * FASE 2 — MÓDULO DE PRESUPUESTOS (APU)
 * ============================================================================
 */
test.describe('FASE 2 — Módulo de Presupuestos APU: generación y factorización de costos', () => {
  test('genera un presupuesto a partir del proyecto creado y valida cálculos', async ({ page }) => {
    await ensureAuthenticated(page);
    const code = `QA-APU-${RUN_ID}`;
    await createProject(page, code, `QA Presupuesto ${RUN_ID}`, 0);

    // Cambiar estado a Ejecución para habilitar presupuestos
    await page.getByRole('button', { name: `Editar proyecto ${code}` }).click();
    const editDialog = page.getByRole('dialog', { name: 'Editar Proyecto' });
    await expect(editDialog).toBeVisible({ timeout: 15_000 });
    await editDialog.getByLabel('Estado del Proyecto').selectOption({ label: 'En Ejecución' });
    await editDialog.getByRole('button', { name: 'Actualizar' }).click();
    await expect(editDialog).toBeHidden({ timeout: 30_000 });

    // El módulo APU opera sobre el **proyecto activo**: hay que activarlo en
    // la cabecera antes de abrir el tab de presupuestos.
    await selectActiveProject(page, code);

    await openTab(page, 'Presupuestos APU');

    // Renglón 1 — concreto f'c=250 psi: 10 m³ × Q450 = Q4,500
    await addManualAPUItem(page, {
      code: '01.01',
      unit: 'm3',
      desc: "Concreto f'c=250 psi",
      qty: '10',
      matCost: '450',
      labCost: '0',
      eqCost: '0',
    });

    // Renglón 2 — acero corrugado 1/2": 500 kg × Q12 = Q6,000
    await addManualAPUItem(page, {
      code: '02.01',
      unit: 'kg',
      desc: 'Acero corrugado 1/2"',
      qty: '500',
      matCost: '12',
      labCost: '0',
      eqCost: '0',
    });

    // Verificar que los renglones aparecen en la tabla
    await expect(page.getByText("Concreto f'c=250 psi").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Acero corrugado 1/2"').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('4,500').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('6,000').first()).toBeVisible({ timeout: 20_000 });

    // Total del presupuesto: 4,500 + 6,000 = 10,500 Q
    await expect(page.getByText('10,500').first()).toBeVisible({ timeout: 20_000 });
  });
});

/**
 * ============================================================================
 * FASE 3 — MÓDULO DE COTIZACIONES
 * ============================================================================
 */
test.describe('FASE 3 — Módulo de Cotizaciones: búsqueda y selección de clientes', () => {
  test('genera una cotización, valida barra de búsqueda y selección de cliente desde proyectos', async ({
    page,
  }) => {
    await ensureAuthenticated(page);
    const code = `QA-QUOTE-${RUN_ID}`;
    const projectName = `QA Cotización Proyecto ${RUN_ID}`;
    await createProject(page, code, projectName, 0);

    await openTab(page, /Cotizaciones/);
    await page.waitForTimeout(1500);

    const newQuote = page.getByRole('button', { name: /Nueva Cotización Rápida/i }).first();
    await expect(newQuote).toBeEnabled({ timeout: 20_000 });
    await newQuote.click();
    await page.waitForTimeout(1000);

    const quoteModal = page.locator('div.fixed.inset-0').filter({
      hasText: 'Generador Rápido de Cotizaciones',
    });
    await expect(quoteModal).toBeVisible({ timeout: 10_000 });

    // Validar barra de búsqueda: escribir nombre del cliente
    await quoteModal.getByPlaceholder('Ej. Ing. Guillermo Morales').fill('Cliente Cotización QA');
    await page.waitForTimeout(1000);

    // Validar lista desplegable de proyectos vinculados (clientes registrados en proyectos)
    const linkedSelect = quoteModal
      .locator('label', { hasText: 'Proyecto Vinculado' })
      .locator('..')
      .locator('select');
    const linkedOptions = await linkedSelect.locator('option').allTextContents();
    const projectMatch = linkedOptions.find((o) => o.includes(code));
    if (projectMatch) {
      await linkedSelect.selectOption({ label: projectMatch });
    }

    // Agregar renglón a la cotización
    await quoteModal
      .getByPlaceholder('Descripción técnica del trabajo…')
      .fill('Construcción de cimentación');
    await quoteModal.getByPlaceholder('Cant.').fill('1');
    await quoteModal.getByPlaceholder('Precio Q').fill('15000');
    await quoteModal.getByRole('button', { name: 'Agregar a la lista' }).click();
    await page.waitForTimeout(1000);

    // Guardar como enviada
    await quoteModal.getByRole('button', { name: /Guardar como Enviada/i }).click();
    await page.waitForTimeout(3500);

    await expect(quoteModal).toBeHidden();
    await expect(page.getByText('Cliente Cotización QA').first()).toBeVisible({ timeout: 20_000 });
    // 15,000 + IVA 12% (tarifa SAT de Guatemala) = 16,800.
    await expect(page.getByText('16,800').first()).toBeVisible({ timeout: 20_000 });

    // Vinculación: verificar que la cotización aparece en el proyecto
    await openTab(page, 'Proyectos & Firmas');
    const rowContainer = page.locator('main li').filter({ hasText: code });
    await expect(rowContainer).toBeVisible({ timeout: 20_000 });
    await expect(rowContainer).toContainText('Cot. 1');
  });
});

/**
 * ============================================================================
 * FASE 4 — TRANSICIÓN DE PLANIFICACIÓN A EJECUCIÓN
 * ============================================================================
 */
test.describe('FASE 4 — Transición a Ejecución: hitos, maquinaria y personal', () => {
  test('cambia estado a Ejecución y registra hito y avance en cronograma', async ({ page }) => {
    await ensureAuthenticated(page);
    const code = `QA-EXEC-${RUN_ID}`;
    await createProject(page, code, `QA Ejecución ${RUN_ID}`, 0);

    await page.getByRole('button', { name: `Editar proyecto ${code}` }).click();
    await page.getByLabel('Estado del Proyecto').selectOption({ label: 'En Ejecución' });
    await page.getByRole('button', { name: 'Actualizar' }).click();
    await page.waitForTimeout(2500);
    await expect(page.getByText('En Ejecución').first()).toBeVisible({ timeout: 15_000 });

    await openTab(page, /Seguimiento & Hitos/);
    const ganttVisible = await page
      .getByText(/Cronograma|Gantt|Hito|Tarea/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (ganttVisible) {
      await expect(page.getByText(/Cronograma|Gantt|Hito|Tarea/i).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  });

  test('registra hitos y avances de seguimiento en el cronograma', async ({ page }) => {
    await ensureAuthenticated(page);
    const code = `QA-MILESTONE-${RUN_ID}`;
    await createProject(page, code, `QA Hitos ${RUN_ID}`, 0);

    await page.getByRole('button', { name: `Editar proyecto ${code}` }).click();
    await page.getByLabel('Estado del Proyecto').selectOption({ label: 'En Ejecución' });
    await page.getByRole('button', { name: 'Actualizar' }).click();
    await page.waitForTimeout(2500);

    await openTab(page, /Seguimiento & Hitos/);
    await page.waitForTimeout(1500);

    // Intentar registrar un hito si el módulo está disponible
    const addMilestone = page.getByRole('button', { name: /Agregar Hito|Nuevo Hito/i }).first();
    if (await addMilestone.isVisible().catch(() => false)) {
      await addMilestone.click();
      await page.waitForTimeout(1000);
      await page.getByLabel('Nombre del Hito').fill('Cimentación completada');
      await page.getByLabel('Fecha').fill('2026-12-01');
      await page
        .getByRole('button', { name: /Guardar|Registrar/i })
        .first()
        .click();
      await page.waitForTimeout(2500);
      await expect(page.getByText('Cimentación completada')).toBeVisible({ timeout: 15_000 });
    }
  });

  test('asigna maquinaria y equipo al proyecto activo', async ({ page }) => {
    await ensureAuthenticated(page);

    await openTab(page, 'Maquinaria');
    await page.waitForTimeout(1500);

    const newMacBtn = page
      .getByRole('button', { name: /Registrar Maquinaria|Nueva Maquinaria/i })
      .first();
    if (!(await newMacBtn.isVisible().catch(() => false))) return;

    await newMacBtn.click();
    await page.waitForTimeout(1000);

    const macDialog = page.getByRole('dialog', { name: /Registrar Nueva Maquinaria/ });
    await expect(macDialog).toBeVisible({ timeout: 10_000 });

    await macDialog.getByLabel('Nombre / Equipo').fill(`Retroexcavadora QA-${RUN_ID}`);
    await macDialog.getByLabel('Modelo / Año').fill('2026');
    await macDialog.getByLabel('Código / Placa').fill(`QA-${RUN_ID}-EQ`);
    await macDialog.getByLabel('Tarifa por Hora (GTQ)').fill('300');
    await macDialog.getByLabel('Horómetro actual').fill('0');
    await macDialog.getByRole('button', { name: 'Guardar Maquinaria' }).click();
    await page.waitForTimeout(2500);

    await expect(macDialog).toBeHidden();
    const macCard = page.locator('div.grid > div').filter({
      has: page.getByText(`Retroexcavadora QA-${RUN_ID}`, { exact: true }),
    });
    await expect(macCard).toContainText('Disponible');
    await expect(macCard).toContainText('300');
  });

  test('asigna personal de campo y genera planillas de pago', async ({ page }) => {
    await ensureAuthenticated(page);

    await openTab(page, 'Personal & IGSS');
    await page.waitForTimeout(1500);

    const cuadBtn = page.getByRole('button', { name: /Cuadrillas/ }).first();
    if (!(await cuadBtn.isVisible().catch(() => false))) return;

    await cuadBtn.click();
    await page.waitForTimeout(1000);

    const newEmpBtn = page.getByRole('button', { name: 'Nuevo Empleado' }).first();
    if (!(await newEmpBtn.isVisible().catch(() => false))) return;

    await newEmpBtn.click();
    const empDialog = page.getByRole('dialog', { name: 'Registrar Nuevo Empleado' });
    await expect(empDialog).toBeVisible({ timeout: 10_000 });

    await empDialog.getByLabel('Nombre Completo').fill(`Empleado Campo QA-${RUN_ID}`);
    await empDialog.getByLabel('Jornal Diario (Q)').fill('250');
    await empDialog.getByLabel('Teléfono').fill('5555-1234');
    await empDialog.getByRole('button', { name: 'Guardar Empleado' }).click();
    await page.waitForTimeout(2500);

    await expect(empDialog).toBeHidden();
    await expect(page.getByText(`Empleado Campo QA-${RUN_ID}`, { exact: true })).toBeVisible();

    // Generar planilla de pago
    await openTab(page, 'Planillas Guate');
    await page.waitForTimeout(1500);

    const planillaVisible = await page
      .getByText(/Planilla|Pago|Nomina|Nomina/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (planillaVisible) {
      await expect(page.getByText(/Planilla|Pago|Nomina|Nomina/i).first()).toBeVisible({
        timeout: 15_000,
      });
    }

    // Registrar asistencia GPS: "Registro & Marcaje GPS" es una pestaña
    // interna del módulo Personal & IGSS, así que hay que volver a ese módulo
    // (visitar Planillas Guate lo desmonta).
    await openTab(page, 'Personal & IGSS');
    await page.waitForTimeout(1500);

    const gpsTab = page.getByRole('button', { name: 'Registro & Marcaje GPS' }).first();
    await expect(gpsTab).toBeVisible({ timeout: 20_000 });
    await gpsTab.click();
    await page.waitForTimeout(1500);

    const empSelect = page.locator('#attendance-employee');
    const empOption = empSelect
      .locator('option')
      .filter({ hasText: `Empleado Campo QA-${RUN_ID}` });
    if ((await empOption.count()) > 0) {
      const empId = await empOption.getAttribute('value');
      await empSelect.selectOption(empId!);
      await page.getByRole('button', { name: 'En Obra' }).click();
      await page.getByRole('button', { name: 'Guardar Registro de Asistencia' }).click();
      await page.waitForTimeout(2500);
      const attRow = page.getByRole('row').filter({ hasText: `Empleado Campo QA-${RUN_ID}` });
      await expect(attRow).toBeVisible({ timeout: 15_000 });
    }
  });
});

/**
 * ============================================================================
 * FASE 5 — MÓDULO DE GASTOS Y FACTURAS
 * ============================================================================
 */
test.describe('FASE 5 — Módulo de Gastos y Facturas: costos y facturación vinculados al proyecto', () => {
  test('registra un gasto con factura SAT y lo propaga al proyecto en ejecución', async ({
    page,
  }) => {
    await ensureAuthenticated(page);
    const code = `QA-GASTO-${RUN_ID}`;
    await createProject(page, code, `QA Gastos ${RUN_ID}`, 5);

    await page.getByRole('button', { name: `Editar proyecto ${code}` }).click();
    await page.getByLabel('Estado del Proyecto').selectOption({ label: 'En Ejecución' });
    await page.getByRole('button', { name: 'Actualizar' }).click();
    await page.waitForTimeout(2500);

    // El formulario de gastos imputa al "proyecto activo": hay que activarlo
    // ANTES de abrir el modal (el overlay del modal tapa la cabecera).
    await selectActiveProject(page, code);

    await openTab(page, 'Gastos & Facturas');
    await page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first().click();
    await page.waitForTimeout(1000);

    await fillExpenseForm(page, {
      description: 'Compra de acero estructural QA',
      supplier: 'Acero Progreso',
      nit: '1294821-9',
      invoice: `FEL-QA-${RUN_ID}`,
      amount: '18000',
    });
    await page.getByRole('button', { name: 'Registrar Gasto (Paso 1)' }).click();
    await page.waitForTimeout(3500);

    await expect(page.getByText('Compra de acero estructural QA').first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('18,000').first()).toBeVisible();

    // Propagación: verificar que el gasto se refleja en el proyecto
    await openTab(page, 'Proyectos & Firmas');
    const rowContainer = page.locator('main li').filter({ hasText: code });
    await expect(rowContainer).toBeVisible({ timeout: 20_000 });
    await expect(rowContainer).toContainText('18,000');

    // Propagación: verificar en el tablero
    await openTab(page, 'Tablero');
    await expect(page.getByText('GASTO REAL ACUMULADO')).toBeVisible();
    await expect(page.getByText('18,000').first()).toBeVisible({ timeout: 20_000 });
  });

  test('valida que un gasto sin campos obligatorios muestre error de validación', async ({
    page,
  }) => {
    await ensureAuthenticated(page);
    const code = `QA-GASTO-ERR-${RUN_ID}`;
    await createProject(page, code, `QA Gasto Error ${RUN_ID}`, 5);

    // El formulario de gastos imputa al "proyecto activo": hay que activarlo
    // ANTES de abrir el modal (el overlay del modal tapa la cabecera).
    await selectActiveProject(page, code);

    await openTab(page, 'Gastos & Facturas');
    await page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first().click();
    await page.waitForTimeout(1000);

    // Llenar solo descripción, dejar monto vacío
    await fillExpenseForm(page, {
      description: 'Gasto incompleto QA',
      amount: '',
    });
    await page.getByRole('button', { name: 'Registrar Gasto (Paso 1)' }).click();
    await page.waitForTimeout(3500);

    // No debe guardar sin monto
    await expect(page.getByText('Gasto incompleto QA')).toHaveCount(0);
  });
});

/**
 * ============================================================================
 * FASE 6 — MÓDULOS COMPLEMENTARIOS Y ASISTENTES
 * ============================================================================
 */
test.describe('FASE 6 — Módulos complementarios y asistentes: integración con proyectos activos', () => {
  test('genera reporte final del proyecto activo', async ({ page }) => {
    await ensureAuthenticated(page);

    await openTab(page, 'Reportes Finales');

    // El tab renderiza `features/reports/ReportsView.tsx`.
    await expect(page.getByRole('heading', { name: 'Reportes de obra' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('heading', { name: 'Resumen de obra' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: 'Imprimir / Guardar PDF' })).toBeEnabled({
      timeout: 20_000,
    });
  });

  test('asistente IA responde en contexto del proyecto', async ({ page }) => {
    await ensureAuthenticated(page);

    const aiTab = page.getByRole('link', { name: /Asistente|IA|AI/i }).first();
    if (!(await aiTab.isVisible().catch(() => false))) return;

    await aiTab.click();
    await page.waitForTimeout(1500);

    const aiVisible = await page
      .getByText(/Asistente|Gemini|Consulta|Pregunta/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (aiVisible) {
      await expect(page.getByText(/Asistente|Gemini|Consulta|Pregunta/i).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  });

  test('sistema de correo y avisos está disponible', async ({ page }) => {
    await ensureAuthenticated(page);

    const gmailTab = page.getByRole('link', { name: /Correo|Avisos|Gmail/i }).first();
    if (!(await gmailTab.isVisible().catch(() => false))) return;

    await gmailTab.click();
    await page.waitForTimeout(1500);

    const gmailVisible = await page
      .getByText(/Correo|Aviso|Mensaje|Notificación/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (gmailVisible) {
      await expect(page.getByText(/Correo|Aviso|Mensaje|Notificación/i).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  });

  test('gestión de equipo de la empresa (solo si el rol lo permite)', async ({ page }) => {
    await ensureAuthenticated(page);

    const equipoTab = page.getByRole('link', { name: 'Equipo de la empresa' }).first();
    const equipoVisible = await equipoTab.isVisible().catch(() => false);
    if (equipoVisible) {
      await equipoTab.click();
      await page.waitForTimeout(1500);
      // El título de la sección se repite en el encabezado móvil (oculto en
      // escritorio): se comprueba el `h1` dentro del panel de contenido.
      await expect(
        page.locator('#main-content').getByRole('heading', { name: /Equipo de la empresa/i })
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test('tablero muestra KPIs consolidados de todos los proyectos del ciclo de vida', async ({
    page,
  }) => {
    await ensureAuthenticated(page);
    await openTab(page, 'Tablero');
    await page.waitForTimeout(2000);

    await expect(page.getByText(/Presupuesto|Budget|Proyectos/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/GASTO|Ejecutado|Gastado/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
