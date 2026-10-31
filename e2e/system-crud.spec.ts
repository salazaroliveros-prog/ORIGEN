import { expect, test } from '@playwright/test';

const projectCode = `E2E-${Date.now()}`;
const originalProjectName = 'Proyecto extremo a extremo';
const updatedProjectName = 'Proyecto E2E actualizado';
const apuDescription = 'APU E2E concreto reforzado';
const expenseDescription = 'Gasto E2E materiales de prueba';
const employeeName = 'Empleado temporal E2E';
const quoteClientName = 'Cliente temporal E2E';
const machineryName = 'Equipo temporal E2E';

test('autenticación y operaciones de módulos ERP en Firebase Emulator', async ({ page }) => {
  test.setTimeout(90_000);

  expect(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBe('demo-origen-e2e');
  expect(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:8080');
  expect(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST).toBe('127.0.0.1:9099');

  const firebaseRequests: string[] = [];
  page.on('request', (request) => {
    if (/firebase|googleapis|identitytoolkit/i.test(request.url())) {
      firebaseRequests.push(request.url());
    }
  });

  const configResponse = await page.request.get('/api/firebase-config.js');
  expect(configResponse.ok()).toBe(true);
  expect(await configResponse.text()).toContain('"projectId":"demo-origen-e2e"');

  await page.goto('/');
  await page.waitForTimeout(3000);

  const authDialog = page.getByRole('dialog', { name: 'Iniciar sesión' });
  const dialogVisible = await authDialog.isVisible({ timeout: 2000 }).catch(() => false);
  expect(dialogVisible).toBe(false);
  console.log('Auto-auth exitoso (sin diálogo de login)');

  const DEFAULT_EMAIL = 'salazaroliveros@gmail.com';
  const projectsNavigation = page.getByRole('button', { name: 'Proyectos & Firmas' });
  await expect(projectsNavigation).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(DEFAULT_EMAIL)).toBeVisible();

  await projectsNavigation.click();
  await page.getByRole('button', { name: 'Nuevo Proyecto' }).click();
  const projectDialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
  await projectDialog.getByLabel('Código del Proyecto').fill(projectCode);
  await projectDialog.getByLabel('Nombre del Proyecto').fill(originalProjectName);
  await projectDialog.getByLabel('Cliente').fill('Cliente de prueba E2E');
  await projectDialog.getByLabel('Ubicación').fill('Zona 1, Guatemala');
  await projectDialog.getByLabel('Municipio').fill('Guatemala');
  await projectDialog.getByLabel('Departamento').fill('Guatemala');
  await projectDialog.getByLabel('Presupuesto Total (Q)').fill('100000');
  await projectDialog.getByLabel('Gasto Ejecutado (Q)').fill('0');
  await projectDialog.getByLabel('Avance (%)').fill('5');
  await projectDialog.getByLabel('Fecha de Inicio').fill('2026-10-01');
  await projectDialog.getByLabel('Fecha de Finalización').fill('2027-10-01');
  await projectDialog.getByRole('button', { name: 'Crear Proyecto' }).click();
  await expect(projectDialog).toBeHidden();

  const projectRow = page.locator('li').filter({ hasText: projectCode });
  await expect(projectRow).toContainText(originalProjectName);

  await page.reload();
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

  await page.getByRole('button', { name: 'Presupuestos APU' }).click();
  await page.getByRole('button', { name: 'Renglón Manual' }).click();
  const apuModal = page.locator('div.fixed.inset-0').filter({
    hasText: 'Nuevo Renglón APU Manual',
  });
  const apuForm = apuModal.locator('form');
  const apuInputs = apuForm.locator('input');
  await apuInputs.nth(0).fill(`${projectCode.slice(-8)}`);
  await apuInputs.nth(1).fill('m3');
  await apuInputs.nth(2).fill(apuDescription);
  await apuInputs.nth(3).fill('2');
  await apuInputs.nth(4).fill('200');
  await apuInputs.nth(5).fill('100');
  await apuInputs.nth(6).fill('50');
  await apuForm.getByRole('button', { name: 'Guardar Renglón APU' }).click();

  const apuRow = page.getByRole('row').filter({ hasText: apuDescription });
  await expect(apuRow).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await apuRow.getByTitle('Eliminar partida').click();
  await expect(apuRow).toHaveCount(0);

  await page.getByRole('button', { name: 'Gastos & Facturas' }).click();
  await page.getByRole('button', { name: 'Nuevo Gasto / Factura' }).click();
  await page.getByLabel('Descripción Detallada del Insumo o Servicio *').fill(expenseDescription);
  await page.getByLabel('Proveedor / Emisor SAT').fill('Proveedor temporal E2E');
  await page.getByLabel('NIT del Proveedor').fill('CF');
  await page.getByLabel('No. Factura SAT Serie/Número').fill(projectCode);
  await page.getByLabel('Monto del Gasto *').fill('1450');
  await page.getByRole('button', { name: 'Guardar y Registrar Gasto' }).click();

  const expenseRow = page.getByRole('row').filter({ hasText: expenseDescription });
  await expect(expenseRow).toBeVisible();
  await expect(expenseRow).toContainText('Proveedor temporal E2E');
  await expenseRow.getByTitle('Eliminar registro').click();
  await expect(expenseRow).toHaveCount(0);

  await page.getByRole('button', { name: 'Personal & IGSS' }).click();
  await page.getByRole('button', { name: /Cuadrillas/ }).click();
  await page.getByRole('button', { name: 'Nuevo Empleado' }).click();
  const employeeDialog = page.getByRole('dialog', { name: 'Registrar Nuevo Empleado' });
  await employeeDialog.getByLabel('Nombre Completo').fill(employeeName);
  await employeeDialog.getByLabel('Jornal Diario (Q)').fill('250');
  await employeeDialog.getByLabel('Teléfono').fill('5555-1234');
  await employeeDialog.getByRole('button', { name: 'Guardar Empleado' }).click();
  await expect(employeeDialog).toBeHidden();
  await expect(page.getByText(employeeName, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Registro & Marcaje GPS' }).click();
  const employeeOption = page
    .locator('#attendance-employee option')
    .filter({ hasText: employeeName });
  const employeeId = await employeeOption.getAttribute('value');
  expect(employeeId).toBeTruthy();
  await page.locator('#attendance-employee').selectOption(employeeId!);
  await page.getByRole('button', { name: 'En Obra' }).click();
  await page.getByRole('button', { name: 'Guardar Registro de Asistencia' }).click();
  const attendanceRow = page.getByRole('row').filter({ hasText: employeeName });
  await expect(attendanceRow).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await attendanceRow.getByTitle('Eliminar registro').click();
  await expect(attendanceRow).toHaveCount(0);

  await page.getByRole('button', { name: 'Cotizaciones' }).click();
  await page.getByRole('button', { name: 'Nueva Cotización Rápida' }).click();
  const quoteModal = page.locator('div.fixed.inset-0').filter({
    hasText: 'Generador Rápido de Cotizaciones',
  });
  await quoteModal.getByPlaceholder('Ej. Ing. Guillermo Morales').fill(quoteClientName);
  await quoteModal
    .getByPlaceholder('Descripción técnica del trabajo...')
    .fill('Obra de prueba extremo a extremo');
  await quoteModal.getByRole('button', { name: 'Agregar a la lista' }).click();
  await quoteModal.getByRole('button', { name: 'Guardar Borrador' }).click();
  await expect(quoteModal).toBeHidden();
  await expect(page.getByText(quoteClientName, { exact: true })).toBeVisible();
  await page.getByTitle('Marcar como Aceptada / Ganada').click();
  await expect(page.locator('span').filter({ hasText: /^Aceptada$/ })).toBeVisible();

  await page.getByRole('button', { name: 'Maquinaria' }).click();
  await page.getByRole('button', { name: 'Registrar Maquinaria' }).click();
  const machineryDialog = page.getByRole('dialog', { name: 'Registrar Nueva Maquinaria' });
  await machineryDialog.getByLabel('Nombre / Equipo').fill(machineryName);
  await machineryDialog.getByLabel('Modelo / Año').fill('2026');
  await machineryDialog.getByLabel('Código / Placa').fill(`${projectCode}-EQ`);
  await machineryDialog.getByLabel('Tarifa por Hora (GTQ)').fill('300');
  await machineryDialog.getByLabel('Horómetro actual').fill('0');
  await machineryDialog.getByRole('button', { name: 'Guardar Maquinaria' }).click();
  await expect(machineryDialog).toBeHidden();
  const machineryCard = page.locator('div.grid > div').filter({
    has: page.getByText(machineryName, { exact: true }),
  });
  await expect(machineryCard).toContainText('Disponible');
  await machineryCard.getByRole('button', { name: 'Enviar a mantenimiento' }).click();
  await expect(machineryCard).toContainText('Mantenimiento');
  await machineryCard.getByRole('button', { name: 'Marcar disponible' }).click();
  await expect(machineryCard).toContainText('Disponible');

  expect(firebaseRequests.length).toBeGreaterThan(0);
  expect(
    firebaseRequests.every((url) => ['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  ).toBe(true);
});
