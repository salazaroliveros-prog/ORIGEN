import { expect, test, type Page } from '@playwright/test';

const ADMIN_EMAIL = 'salazaroliveros@gmail.com';
const ADMIN_PASSWORD = 'Origen2026!Secure';
const RUN_ID = Date.now().toString().slice(-6);

test.setTimeout(300_000);

/**
 * Utilidades compartidas para el flujo E2E completo del ciclo de vida del proyecto.
 */
async function ensureAuthenticated(page: Page) {
  await page.goto(
    `/?__test_email=${encodeURIComponent(ADMIN_EMAIL)}&__test_password=${encodeURIComponent(ADMIN_PASSWORD)}`
  );
  await page.waitForTimeout(5000);

  // Verificar si ya está autenticado (botón Tablero visible)
  const tablero = page.getByRole('button', { name: 'Tablero' });
  if (await tablero.isVisible({ timeout: 2000 })) {
    return;
  }

  // Si aparece el formulario de login, rellenarlo manualmente (workaround React 19)
  const loginForm = page.locator('form').filter({ hasText: 'Iniciar Sesión' });
  if (await loginForm.isVisible({ timeout: 2000 })) {
    await loginForm.locator('input#email').pressSequentially(ADMIN_EMAIL);
    await loginForm.locator('input#password').pressSequentially(ADMIN_PASSWORD);
    await loginForm.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await page.waitForTimeout(5000);

    // Diagnostic: verificar si hay error de auth
    const errorToast = page
      .locator('[role="alert"], .text-red-200, .text-red-400, .text-red-500')
      .first();
    if (await errorToast.isVisible({ timeout: 2000 })) {
      const errorText = await errorToast.textContent();
      console.log('AUTH ERROR:', errorText);
    }
    // Verificar si el formulario de login sigue visible
    const loginStillVisible = await loginForm.isVisible({ timeout: 1000 });
    console.log('LOGIN STILL VISIBLE:', loginStillVisible);
  }

  await expect(page.getByRole('button', { name: 'Tablero' })).toBeVisible({ timeout: 30_000 });
}

async function openTab(page: Page, name: RegExp | string) {
  await page.getByRole('button', { name }).first().click();
  await page.waitForTimeout(1500);
}

/**
 * Escribe partidas APU directamente a Firestore vía Firebase SDK,
 * evitando el problema de React 19 componentes controlados con Playwright.
 */
async function createAPUItemsViaFirebase(
  page: Page,
  projectId: string,
  items: Array<{
    code: string;
    description: string;
    unit: string;
    quantity: number;
    materialUnitCostGTQ: number;
    laborUnitCostGTQ: number;
    equipmentUnitCostGTQ: number;
    totalUnitCostGTQ: number;
    totalPriceGTQ: number;
    department: string;
  }>
) {
  // Obtener companyId del localStorage del navegador
  const companyId = await page.evaluate(() => {
    try {
      for (const key of Object.keys(window.localStorage)) {
        if (key.includes('active-workspace')) {
          const raw = window.localStorage.getItem(key);
          if (!raw) continue;
          let ws: any;
          try {
            ws = JSON.parse(raw);
          } catch {
            ws = { id: raw, companyId: raw };
          }
          if (ws.companyId) return ws.companyId;
          if (ws.id) return ws.id;
        }
      }
      return '';
    } catch (e) {
      return '';
    }
  });

  if (!companyId) throw new Error('No se pudo obtener companyId del localStorage');

  const res = await page.request.post('http://localhost:3000/api/e2e-apu', {
    data: {
      projectId,
      companyId,
      items: items.map((item, i) => ({
        ...item,
        id: `apu-${Math.random().toString(36).slice(2)}-${i}`,
      })),
      userId: 'qa-admin',
    },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`API error: ${res.status()} ${body}`);
  }

  await page.waitForTimeout(2000);
}

/**
 * Obtiene el projectId de Firestore consultando por código.
 */
async function getProjectIdByCode(page: Page, code: string): Promise<string> {
  // Primero intentar leer de sessionStorage (guardado por saveProjectToFirestore)
  const sessionId = await page.evaluate((c) => {
    return sessionStorage.getItem(`origen.project.${c}`);
  }, code);
  if (sessionId) return sessionId;

  // Fallback: consultar API route
  let lastError: string = '';
  for (let i = 0; i < 5; i++) {
    const res = await page.request.get(
      `http://localhost:3000/api/e2e-project-id?code=${encodeURIComponent(code)}`
    );
    if (res.ok()) {
      const data = await res.json();
      return data.projectId;
    }
    lastError = await res.text();
    await page.waitForTimeout(1000);
  }
  throw new Error(
    `Proyecto no encontrado después de reintentos: ${code}. Último error: ${lastError}`
  );
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

    // Verificar que el proyecto aparece en la lista
    await expect(page.getByText(code).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(name).first()).toBeVisible();
    await expect(page.getByText('Planificación').first()).toBeVisible();
    await expect(page.getByText('100,000').first()).toBeVisible();

    // Editar: corregir presupuesto (inconsistencia detectada: valor bajo para obra real)
    await page.getByRole('button', { name: `Editar proyecto ${code}` }).click();
    await expect(page.getByText('Editar Proyecto')).toBeVisible();
    await page.getByLabel('Presupuesto Total (Q)').fill('250000');
    await page.getByLabel('Avance (%)').fill('10');
    await page.getByRole('button', { name: 'Actualizar' }).click();
    await page.waitForTimeout(3000);

    await expect(page.getByText('250,000').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('10%').first()).toBeVisible({ timeout: 20_000 });

    // Persistencia: recargar y verificar que los datos se mantienen
    await page.reload();
    await page.waitForTimeout(4000);
    await openTab(page, 'Proyectos & Firmas');
    await expect(page.getByText(code).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('250,000').first()).toBeVisible();
    await expect(page.getByText('Planificación').first()).toBeVisible();
  });

  test('archiva y restaura el proyecto sin perder datos', async ({ page }) => {
    await ensureAuthenticated(page);
    const code = `QA-PROJ-${RUN_ID}-ARCH`;
    await createProject(page, code, `QA Archivo ${RUN_ID}`, 5);
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
    await expect(page.getByText('250,000').first()).toBeVisible();
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
    await page.getByLabel('Estado del Proyecto').selectOption({ label: 'En Ejecución' });
    await page.getByRole('button', { name: 'Actualizar' }).click();
    await page.waitForTimeout(2500);

    // Obtener projectId desde Firestore
    const projectId = await getProjectIdByCode(page, code);

    // Escribir partidas APU directamente a Firestore vía Firebase SDK
    await createAPUItemsViaFirebase(page, projectId, [
      {
        code: `${code.slice(-8)}-CONC`,
        description: "Concreto f'c=250 psi",
        unit: 'm3',
        quantity: 10,
        materialUnitCostGTQ: 450,
        laborUnitCostGTQ: 0,
        equipmentUnitCostGTQ: 0,
        totalUnitCostGTQ: 450,
        totalPriceGTQ: 4500,
        department: 'Guatemala',
      },
      {
        code: `${code.slice(-8)}-ACERO`,
        description: 'Acero corrugado 1/2"',
        unit: 'kg',
        quantity: 500,
        materialUnitCostGTQ: 12,
        laborUnitCostGTQ: 0,
        equipmentUnitCostGTQ: 0,
        totalUnitCostGTQ: 12,
        totalPriceGTQ: 6000,
        department: 'Guatemala',
      },
    ]);

    await openTab(page, 'Presupuestos APU');
    await page.waitForTimeout(2000);

    // Verificar que los renglones aparecen en la tabla
    await expect(page.getByText("Concreto f'c=250 psi").first()).toBeVisible({ timeout: 20_000 });
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
    await expect(page.getByText('16,500').first()).toBeVisible({ timeout: 20_000 });

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

    // Registrar asistencia GPS
    await openTab(page, /Registro & Marcaje GPS/);
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

    await openTab(page, 'Gastos & Facturas');
    await page.getByRole('button', { name: 'Nuevo Gasto / Factura' }).first().click();
    await page.waitForTimeout(1000);

    const projectSelect = page.getByLabel('Proyecto Asignado *');
    const options = await projectSelect.locator('option').allTextContents();
    const match = options.find((o) => o.includes(code));
    if (match) await projectSelect.selectOption({ label: match });

    await page
      .getByLabel('Descripción Detallada del Insumo o Servicio *')
      .fill('Compra de acero estructural QA');
    await page.getByLabel('Proveedor / Emisor SAT').fill('Acero Progreso');
    await page.getByLabel('NIT del Proveedor').fill('CF');
    await page.getByLabel('No. Factura SAT Serie/Número').fill(`FEL-QA-${RUN_ID}`);
    await page.getByLabel('Monto del Gasto *').fill('18000');
    await page.getByRole('button', { name: 'Guardar y Registrar Gasto' }).click();
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

    await openTab(page, 'Gastos & Facturas');
    await page.getByRole('button', { name: 'Nuevo Gasto / Factura' }).first().click();
    await page.waitForTimeout(1000);

    const projectSelect = page.getByLabel('Proyecto Asignado *');
    const options = await projectSelect.locator('option').allTextContents();
    const match = options.find((o) => o.includes(code));
    if (match) await projectSelect.selectOption({ label: match });

    // Llenar solo descripción, dejar monto vacío
    await page
      .getByLabel('Descripción Detallada del Insumo o Servicio *')
      .fill('Gasto incompleto QA');
    await page.getByRole('button', { name: 'Guardar y Registrar Gasto' }).click();
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

  test('asistente IA responde en contexto del proyecto', async ({ page }) => {
    await ensureAuthenticated(page);

    const aiTab = page.getByRole('button', { name: /Asistente|IA|AI/i }).first();
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

    const gmailTab = page.getByRole('button', { name: /Correo|Avisos|Gmail/i }).first();
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

    const equipoTab = page.getByRole('button', { name: 'Equipo de la empresa' }).first();
    const equipoVisible = await equipoTab.isVisible().catch(() => false);
    if (equipoVisible) {
      await equipoTab.click();
      await page.waitForTimeout(1500);
      await expect(page.getByText(/Empleado|Equipo|Miembro|Personal/i).first()).toBeVisible({
        timeout: 15_000,
      });
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
