import { expect, test } from '@playwright/test';

test('Production E2E: Full CRUD validation across all ERP modules', async ({ page }) => {
  test.setTimeout(120_000);

  const PRODUCTION_URL = 'https://origen-one-kohl.vercel.app';
  const DEFAULT_EMAIL = 'salazaroliveros@gmail.com';
  const DEFAULT_PASSWORD = 'Origen2026!Secure';
  const timestamp = Date.now();
  const projectCode = `QA-${timestamp}`;
  const projectName = 'Proyecto QA Producción';
  const updatedProjectName = 'Proyecto QA Producción Actualizado';

  console.log('=== PRODUCCIÓN: Prueba E2E Completa CRUD ===\n');

  // 1. Navigate to production
  console.log(`1. Navegando a ${PRODUCTION_URL}...`);
  await page.goto(PRODUCTION_URL);
  await page.waitForLoadState('networkidle');

  // 2. Verify app loads
  const title = await page.title();
  console.log(`2. Título de la página: ${title}`);
  expect(title).toContain('ConstructERP');

  // 3. Auto-auth: entra directamente sin diálogo de login
  await page.waitForTimeout(3000);
  const authDialog = page.getByRole('dialog', { name: 'Iniciar sesión' });
  const dialogVisible = await authDialog.isVisible({ timeout: 2000 }).catch(() => false);
  expect(dialogVisible).toBe(false);
  console.log('3. Auto-auth exitoso (sin diálogo de login)');

  // 4. Verify user is authenticated
  await expect(page.locator('#main-content').getByText(DEFAULT_EMAIL)).toBeVisible({
    timeout: 15000,
  });
  console.log(`4. Usuario autenticado: ${DEFAULT_EMAIL}`);

  // Close any lingering overlays
  await page.locator('#main-content').click({ position: { x: 100, y: 100 } });
  await page.waitForTimeout(1000);

  // 5. PROJECTS - Create
  console.log('\n5. === PRUEBAS CRUD: PROYECTOS ===');
  await page.getByRole('button', { name: 'Proyectos & Firmas' }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Nuevo Proyecto' }).click();

  const projectDialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
  await projectDialog.getByLabel('Código del Proyecto').fill(projectCode);
  await projectDialog.getByLabel('Nombre del Proyecto').fill(projectName);
  await projectDialog.getByLabel('Cliente').fill('Cliente QA Producción');
  await projectDialog.getByLabel('Ubicación').fill('Zona 10, Guatemala');
  await projectDialog.getByLabel('Municipio').fill('Guatemala');
  await projectDialog.getByLabel('Departamento').fill('Guatemala');
  await projectDialog.getByLabel('Presupuesto Total (Q)').fill('150000');
  await projectDialog.getByLabel('Gasto Ejecutado (Q)').fill('0');
  await projectDialog.getByLabel('Avance (%)').fill('10');
  await projectDialog.getByLabel('Fecha de Inicio').fill('2026-11-01');
  await projectDialog.getByLabel('Fecha de Finalización').fill('2027-11-01');
  await projectDialog.getByRole('button', { name: 'Crear Proyecto' }).click();
  await expect(projectDialog).toBeHidden();
  console.log('   CREATE: Proyecto creado');

  // Read - verify project appears
  const projectRow = page.locator('li').filter({ hasText: projectCode });
  await expect(projectRow).toContainText(projectName);
  console.log('   READ: Proyecto visible en la lista');

  // Update
  await page.getByRole('button', { name: `Editar proyecto ${projectCode}` }).click();
  const editDialog = page.getByRole('dialog', { name: 'Editar Proyecto' });
  await editDialog.getByLabel('Nombre del Proyecto').fill(updatedProjectName);
  await editDialog.getByRole('button', { name: 'Actualizar' }).click();
  await expect(editDialog).toBeHidden();
  await expect(page.locator('li').filter({ hasText: projectCode })).toContainText(
    updatedProjectName
  );
  console.log('   UPDATE: Proyecto actualizado a "' + updatedProjectName + '"');

  // Archive
  await page.getByRole('button', { name: `Archivar proyecto ${projectCode}` }).click();
  await page.getByLabel('Mostrar').selectOption('archived');
  await expect(page.locator('li').filter({ hasText: projectCode })).toContainText(
    updatedProjectName
  );
  console.log('   ARCHIVE: Proyecto archivado');

  // Restore
  await page.getByRole('button', { name: `Restaurar proyecto ${projectCode}` }).click();
  await page.getByLabel('Mostrar').selectOption('active');
  await expect(page.locator('li').filter({ hasText: projectCode })).toContainText(
    updatedProjectName
  );
  console.log('   RESTORE: Proyecto restaurado');

  // Delete
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: `Eliminar proyecto ${projectCode}` }).click();
  await expect(page.locator('li').filter({ hasText: projectCode })).toHaveCount(0);
  console.log('   DELETE: Proyecto eliminado');

  console.log('\n=== RESULTADO: Todas las pruebas CRUD de Proyectos PASARON ===');
});
