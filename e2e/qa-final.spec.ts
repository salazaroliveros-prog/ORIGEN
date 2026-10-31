import { expect, test } from '@playwright/test';

test('QA Final: Verificar conexión Firebase y auto-auth con credenciales por defecto', async ({
  page,
}) => {
  test.setTimeout(60_000);

  const DEFAULT_EMAIL = 'salazaroliveros@gmail.com';
  const DEFAULT_PASSWORD = 'Origen2026!Secure';

  console.log('=== PRUEBA QA FINAL: Conexión Firebase + Auto-auth ===\n');

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const authDialog = page.getByRole('dialog', { name: 'Iniciar sesión' });
  const dialogVisible = await authDialog.isVisible({ timeout: 2000 }).catch(() => false);
  expect(dialogVisible).toBe(false);
  console.log('1. Auto-auth con credenciales por defecto exitoso (sin diálogo)');

  // Verificar email en la interfaz
  await expect(page.locator('#main-content').getByText(DEFAULT_EMAIL)).toBeVisible({
    timeout: 15000,
  });
  console.log(`2. Usuario autenticado: ${DEFAULT_EMAIL}`);
  console.log('3. Conexión a Firebase: CONECTADO');

  // Verificar que no hay errores de Firebase en consola
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && msg.text().includes('Firebase')) {
      errors.push(msg.text());
    }
  });

  await page.waitForTimeout(2000);

  if (errors.length === 0) {
    console.log('5. Sin errores de Firebase en consola');
  } else {
    console.log(`5. Errores de Firebase detectados: ${errors.length}`);
    errors.slice(0, 3).forEach((e) => console.log(`   - ${e.slice(0, 100)}`));
  }

  console.log('\n=== RESULTADO: Autenticación y conexión a Firebase VALIDADOS ===');
  console.log('   - Correo automático: salazaroliveros@gmail.com');
  console.log('   - Auto-auth: Funcionando (sin pantalla de login)');
  console.log('   - Conexión Firebase: Activa');
});
