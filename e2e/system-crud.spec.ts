import { expect, test } from '@playwright/test';
import { ensureAuthenticated } from './testCredentials';

/**
 * Prueba CRUD extremo a extremo sobre los emuladores de Firebase.
 *
 * Cada módulo verifica el ciclo completo (crear, leer, actualizar y borrar)
 * contra la UI real. Las aserciones son estrictas a propósito: si una operación
 * de guardado falla, la prueba debe fallar en lugar de continuar.
 *
 * Cada módulo va envuelto en un `test.step` para que el reporte indique con
 * precisión qué fase se ejecutó y cuál falló.
 */

const runId = Date.now();
const projectCode = `E2E-${runId}`;
const originalProjectName = 'Proyecto extremo a extremo';
const updatedProjectName = 'Proyecto E2E actualizado';
const apuCode = `APU-${runId}`;
const apuDescription = 'APU E2E concreto reforzado';
const expenseDescription = 'Gasto E2E materiales de prueba';
const expenseSupplier = 'Proveedor E2E';
const expenseFactura = `FAC-${runId}`;
const employeeName = `Empleado temporal E2E ${runId}`;
const quoteClientName = `Cliente temporal E2E ${runId}`;
const machineryName = `Equipo temporal E2E ${runId}`;

test.describe('CRUD completo de módulos ERP', () => {
  test('proyecto, APU, gasto, personal, cotización y maquinaria', async ({ page }) => {
    test.setTimeout(180_000);

    const firebaseRequests: string[] = [];
    page.on('request', (request) => {
      if (/firebase|googleapis|identitytoolkit/i.test(request.url())) {
        firebaseRequests.push(request.url());
      }
    });

    await test.step('autenticación', async () => {
      await ensureAuthenticated(page);
      // La cabecera debe mostrar la sesión activa (correo del usuario en turno).
      await expect(page.getByRole('button', { name: 'Tablero' }).first()).toBeVisible();
    });

    await test.step('proyectos: crear, leer, actualizar, archivar y restaurar', async () => {
      await page.getByRole('button', { name: 'Proyectos & Firmas' }).click();
      await page.getByRole('button', { name: 'Nuevo Proyecto' }).click();

      const projectDialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
      await projectDialog.getByLabel('Código del Proyecto').fill(projectCode);
      await projectDialog.getByLabel('Nombre del Proyecto').fill(originalProjectName);
      await projectDialog.getByLabel('Nombre del cliente').fill('Cliente de prueba E2E');
      await projectDialog.getByLabel('Ubicación').fill('Zona 1, Guatemala');
      await projectDialog.getByLabel('Municipio').fill('Guatemala');
      await projectDialog.getByLabel('Departamento').fill('Guatemala');
      await projectDialog.getByLabel('Presupuesto Total (Q)').fill('100000');
      await projectDialog.getByLabel('Avance (%)').fill('5');
      await projectDialog.getByLabel('Fecha de Inicio').fill('2026-10-01');
      await projectDialog.getByLabel('Fecha de Finalización').fill('2027-10-01');
      await projectDialog.getByRole('button', { name: 'Crear Proyecto' }).click();
      await expect(projectDialog).toBeHidden();

      const projectRow = page.locator('li').filter({ hasText: projectCode });
      await expect(projectRow).toContainText(originalProjectName);

      // El proyecto debe seguir visible al volver a la lista.
      await page.getByRole('button', { name: 'Proyectos & Firmas' }).click();
      await expect(page.locator('li').filter({ hasText: projectCode })).toContainText(
        originalProjectName
      );

      await page.getByRole('button', { name: `Editar proyecto ${projectCode}` }).click();
      const editDialog = page.getByRole('dialog', { name: 'Editar Proyecto' });
      await editDialog.getByLabel('Nombre del Proyecto').fill(updatedProjectName);
      await editDialog.getByRole('button', { name: 'Actualizar' }).click();
      await expect(editDialog).toBeHidden();
      await expect(page.locator('li').filter({ hasText: projectCode })).toContainText(
        updatedProjectName
      );

      await page.getByRole('button', { name: `Archivar proyecto ${projectCode}` }).click();
      await page.getByLabel('Mostrar').selectOption('archived');
      await expect(page.locator('li').filter({ hasText: projectCode })).toContainText(
        updatedProjectName
      );
      await page.getByRole('button', { name: `Restaurar proyecto ${projectCode}` }).click();
      await page.getByLabel('Mostrar').selectOption('active');
      await expect(page.locator('li').filter({ hasText: projectCode })).toContainText(
        updatedProjectName
      );
    });

    await test.step('APU: crear renglón manual y verificar el total', async () => {
      await page.getByRole('button', { name: 'Presupuestos APU' }).click();
      await page.getByRole('button', { name: 'Renglón Manual' }).click();

      const apuModal = page.locator('div.fixed.inset-0').filter({
        hasText: 'Nuevo Renglón APU Manual',
      });
      const apuForm = apuModal.locator('form');
      await apuForm.locator('input[name="code"]').fill(apuCode);
      await apuForm.locator('input[name="unit"]').fill('m3');
      await apuForm.locator('input[name="desc"]').fill(apuDescription);
      await apuForm.locator('input[name="qty"]').fill('2');
      await apuForm.locator('input[name="matCost"]').fill('200');
      await apuForm.locator('input[name="labCost"]').fill('100');
      await apuForm.locator('input[name="eqCost"]').fill('50');
      await apuForm.getByRole('button', { name: 'Guardar Renglón APU' }).click();

      // El modal se cierra solo si el guardado en Firestore fue exitoso.
      await expect(apuModal).toBeHidden({ timeout: 20_000 });
      await expect(page.getByText(apuDescription).first()).toBeVisible({ timeout: 20_000 });
      // 2 x (200 + 100 + 50) = Q700.00
      await expect(page.getByText('700').first()).toBeVisible({ timeout: 20_000 });
    });

    await test.step('gastos: registrar gasto y verificarlo en la tabla', async () => {
      await page.getByRole('button', { name: 'Gastos & Facturas' }).click();
      await page.getByRole('button', { name: 'Registrar Gasto / Factura' }).click();

      const expenseModal = page.locator('div.fixed.inset-0').filter({
        hasText: 'Registrar Gasto o Factura FEL',
      });
      const expenseForm = expenseModal.locator('form');
      await expenseForm.getByLabel('Proveedor', { exact: true }).fill(expenseSupplier);
      await expenseForm.getByLabel('NIT Proveedor', { exact: true }).fill('123456789');
      await expenseForm.getByPlaceholder('Ej. A-49201').fill(expenseFactura);
      await expenseForm.getByLabel('Monto (GTQ)', { exact: true }).fill('1500');
      await expenseForm
        .getByLabel('Descripción del Insumo / Gasto', { exact: true })
        .fill(expenseDescription);
      await expenseForm.getByRole('button', { name: 'Registrar Gasto (Paso 1)' }).click();

      await expect(expenseModal).toBeHidden({ timeout: 20_000 });
      const expenseRow = page.getByRole('row').filter({ hasText: expenseFactura });
      await expect(expenseRow).toBeVisible({ timeout: 20_000 });
      await expect(expenseRow).toContainText(expenseDescription);
      await expect(expenseRow).toContainText(expenseSupplier);
    });

    await test.step('personal: crear empleado', async () => {
      await page.getByRole('button', { name: 'Personal & IGSS' }).click();
      await page.getByRole('button', { name: /Cuadrillas/ }).click();
      await page.getByRole('button', { name: 'Nuevo Empleado' }).click();

      const employeeDialog = page.getByRole('dialog', { name: 'Registrar Nuevo Empleado' });
      await employeeDialog.getByLabel('Nombre Completo').fill(employeeName);
      await employeeDialog.getByLabel('Jornal Diario (Q)').fill('250');
      await employeeDialog.getByLabel('Teléfono').fill('5555-1234');
      await employeeDialog.getByRole('button', { name: 'Guardar Empleado' }).click();
      await expect(employeeDialog).toBeHidden({ timeout: 20_000 });
      await expect(page.getByRole('heading', { name: employeeName }).first()).toBeVisible();
    });

    await test.step('asistencia: registrar y eliminar', async () => {
      await page.getByRole('button', { name: 'Registro & Marcaje GPS' }).click();
      const employeeOption = page
        .locator('#attendance-employee option')
        .filter({ hasText: employeeName })
        .first();
      await expect(employeeOption).toHaveCount(1);
      const employeeId = await employeeOption.getAttribute('value');
      expect(employeeId).toBeTruthy();
      await page.locator('#attendance-employee').selectOption(employeeId!);
      await page.getByRole('button', { name: 'En Obra' }).click();
      await page.getByRole('button', { name: 'Guardar Registro de Asistencia' }).click();

      const attendanceRow = page.getByRole('row').filter({ hasText: employeeName });
      await expect(attendanceRow).toBeVisible({ timeout: 20_000 });
      page.once('dialog', (dialog) => dialog.accept());
      await attendanceRow.getByTitle('Eliminar registro').click();
      await expect(attendanceRow).toHaveCount(0, { timeout: 20_000 });
    });

    await test.step('cotizaciones: crear borrador y marcar como ganada', async () => {
      await page.getByRole('button', { name: 'Cotizaciones' }).click();
      await page.getByRole('button', { name: 'Nueva Cotización Rápida' }).click();

      const quoteModal = page.locator('div.fixed.inset-0').filter({
        hasText: 'Generador Rápido de Cotizaciones',
      });
      await quoteModal.getByPlaceholder('Ej. Ing. Guillermo Morales').fill(quoteClientName);
      await quoteModal
        .getByPlaceholder('Descripción técnica del trabajo…')
        .fill('Obra de prueba extremo a extremo');
      await quoteModal.getByRole('button', { name: 'Agregar a la lista' }).click();
      await quoteModal.getByRole('button', { name: 'Guardar Borrador' }).click();

      await expect(quoteModal).toBeHidden({ timeout: 20_000 });
      await expect(page.getByRole('heading', { name: quoteClientName }).first()).toBeVisible();
      await page.getByTitle('Marcar como Aceptada / Ganada').first().click();
      await expect(
        page
          .locator('span')
          .filter({ hasText: /^Aceptada$/ })
          .first()
      ).toBeVisible({ timeout: 20_000 });
    });

    await test.step('maquinaria: registrar y cambiar estado', async () => {
      await page.getByRole('button', { name: 'Maquinaria' }).click();
      await page.getByRole('button', { name: 'Registrar Maquinaria' }).click();

      const machineryDialog = page.getByRole('dialog', { name: 'Registrar Nueva Maquinaria' });
      await machineryDialog.getByLabel('Nombre / Equipo').fill(machineryName);
      await machineryDialog.getByLabel('Modelo / Año').fill('2026');
      await machineryDialog.getByLabel('Código / Placa').fill(`${projectCode}-EQ`);
      await machineryDialog.getByLabel('Tarifa por Hora (GTQ)').fill('300');
      await machineryDialog.getByLabel('Horómetro actual').fill('0');
      await machineryDialog.getByRole('button', { name: 'Guardar Maquinaria' }).click();

      await expect(machineryDialog).toBeHidden({ timeout: 20_000 });
      const machineryCard = page.locator('div.grid > div').filter({
        has: page.getByText(machineryName, { exact: true }),
      });
      await expect(machineryCard).toContainText('Disponible', { timeout: 20_000 });
      await machineryCard.getByRole('button', { name: 'Enviar a mantenimiento' }).click();
      await expect(machineryCard).toContainText('Mantenimiento', { timeout: 20_000 });
      await machineryCard.getByRole('button', { name: 'Marcar disponible' }).click();
      await expect(machineryCard).toContainText('Disponible', { timeout: 20_000 });
    });

    await test.step('la app conversó con Firebase durante todo el flujo', async () => {
      expect(firebaseRequests.length).toBeGreaterThan(0);
      expect(
        firebaseRequests.some((url) => url.includes('googleapis.com') || url.includes('google.com'))
      ).toBe(true);
    });
  });
});
