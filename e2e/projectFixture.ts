import { navItem } from './navigation';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { ensureAuthenticated } from './testCredentials';

/**
 * Datos de un proyecto de prueba.
 *
 * Los módulos que dependen de un proyecto (gastos, cotizaciones, maquinaria…)
 * muestran un estado vacío cuando la empresa no tiene ninguno: sin un
 * proyecto activo no hay forma de ejercitar el flujo real.
 */
export interface TestProject {
  code: string;
  name: string;
}

/**
 * Crea un proyecto desde la interfaz y espera a que aparezca en la lista.
 *
 * Usa los mismos selectores que `system-crud.spec.ts` (que es la referencia
 * de los nombres reales de los campos del formulario).
 */
export async function createTestProject(page: Page, project: TestProject): Promise<void> {
  // `ProjectFormSchema` limita el código a 20 caracteres y exige el patrón
  // `^[A-Z0-9-]+$`: un código más largo deja el formulario abierto con un
  // error de validación que no se ve en la lista.
  if (project.code.length > 20 || !/^[A-Z0-9-]+$/.test(project.code)) {
    throw new Error(
      `Código de proyecto inválido para la prueba: "${project.code}" (máx. 20 caracteres, solo A-Z, 0-9 y guiones).`
    );
  }

  await navItem(page, /Proyectos/).click();
  await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
  await dialog.getByLabel('Código del Proyecto').fill(project.code);
  await dialog.getByLabel('Nombre del Proyecto').fill(project.name);
  await dialog.getByLabel('Nombre del cliente').fill('Cliente E2E');
  await dialog.getByLabel('Ubicación').fill('Zona 1, Guatemala');
  await dialog.getByLabel('Municipio').fill('Guatemala');
  await dialog.getByLabel('Departamento').fill('Guatemala');
  await dialog.getByLabel('Presupuesto Total (Q)').fill('100000');
  await dialog.getByLabel('Avance (%)').fill('5');
  await dialog.getByLabel('Fecha de Inicio').fill('2026-10-01');
  await dialog.getByLabel('Fecha de Finalización').fill('2027-10-01');
  await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();

  // El diálogo se cierra solo cuando el guardado en Firestore fue exitoso.
  await expect(dialog).toBeHidden({ timeout: 20_000 });

  // La sincronización se confirma en el selector accesible. No buscar el código
  // en toda la página: la opción HTML del <select> existe en el DOM, pero no
  // es texto visible y puede ser el primer resultado de getByText().
  const projectSelector = page
    .getByRole('combobox', { name: /^(Seleccionar proyecto|Proyecto activo|Lista de proyectos)$/i })
    .filter({ visible: true })
    .first();
  await expect(projectSelector).toBeVisible({ timeout: 15_000 });
  const projectOption = projectSelector.locator('option').filter({ hasText: project.code });
  await expect(projectOption).toHaveCount(1, { timeout: 30_000 });
}

/**
 * Activa un proyecto desde el selector accesible de la barra lateral.
 *
 * El formulario de gastos **no** tiene selector de proyecto: usa el
 * "proyecto activo" del ERP (`activeProjectId`). Los flujos que registran un
 * gasto deben activar el proyecto antes de abrir el formulario, de lo
 * contrario el gasto se imputa al primer proyecto de la lista.
 */
export async function selectActiveProject(page: Page, code: string): Promise<void> {
  // El selector forma parte de la barra lateral de escritorio y expone
  // un nombre accesible estable; no depende de la estructura del header.
  const openDialog = page.getByRole('dialog');
  if (await openDialog.count()) {
    await expect(openDialog.first()).toBeHidden({ timeout: 20_000 });
  }

  const selector = page
    .getByRole('combobox', { name: /^(Seleccionar proyecto|Proyecto activo|Lista de proyectos)$/i })
    .filter({ visible: true })
    .first();
  await expect(selector).toBeVisible({ timeout: 15_000 });

  // El proyecto llega por la suscripción de Firestore: esperar la opción
  // antes de seleccionarla evita carreras entre creación y cambio de contexto.
  const option = selector.locator('option').filter({ hasText: code }).first();
  await expect(option).toHaveCount(1, { timeout: 30_000 });
  const projectId = await option.getAttribute('value');
  if (!projectId) throw new Error(`No se encontró el ID del proyecto ${code}.`);
  await selector.selectOption(projectId);
}

/**
 * Espera a que el backend confirme un proyecto recién creado.
 *
 * El emulador de Firestore envía el *ack* de la escritura antes de aplicarla
 * en su almacén (~150 ms de diferencia): si la página se recarga en esa
 * ventana, el documento se pierde y nunca llega a existir.
 *
 * La comprobación se hace desde una segunda pestaña: su listener de Firestore
 * solo recibe el estado del servidor, no la caché optimista de la pestaña que
 * escribió el documento.
 */
export async function waitForProjectPersisted(page: Page, code: string): Promise<void> {
  const probe = await page.context().newPage();
  try {
    // Una página nueva comparte el contexto del navegador, pero debe esperar
    // a que Firebase restaure la sesión (o iniciar sesión con las credenciales
    // E2E) antes de que exista el selector de proyectos.
    await ensureAuthenticated(probe);
    const projectSelector = probe
      .getByRole('combobox', {
        name: /^(Seleccionar proyecto|Proyecto activo|Lista de proyectos)$/i,
      })
      .filter({ visible: true })
      .first();
    await expect(projectSelector).toBeVisible({ timeout: 30_000 });
    const projectOption = projectSelector.locator('option').filter({ hasText: code });
    await expect(projectOption).toHaveCount(1, { timeout: 30_000 });
  } finally {
    await probe.close();
  }
}

/** Datos del formulario de gasto (`ExpensesManager.tsx`). */
export interface ExpenseFormData {
  description: string;
  supplier?: string;
  nit?: string;
  invoice?: string;
  amount: string;
}

/**
 * Rellena el formulario de registro de gasto.
 *
 * Los nombres accesibles son los `aria-label` reales del formulario: usar los
 * textos del `<label>` visual no funciona porque no están asociados al control.
 */
export async function fillExpenseForm(page: Page, data: ExpenseFormData): Promise<void> {
  await page.getByLabel('Descripción del Insumo / Gasto').fill(data.description);
  if (data.supplier !== undefined) {
    await page.getByLabel('Proveedor', { exact: true }).fill(data.supplier);
  }
  if (data.nit !== undefined) {
    await page.getByLabel('NIT Proveedor').fill(data.nit);
  }
  if (data.invoice !== undefined) {
    await page.getByLabel('No. Factura FEL').fill(data.invoice);
  }
  await page.getByLabel(/^Monto \(/).fill(data.amount);
}
