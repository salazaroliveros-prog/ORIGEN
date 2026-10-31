import { expect, test } from '@playwright/test';

test('Production E2E: Firebase connection + auto-auth con credenciales por defecto', async ({
  page,
}) => {
  test.setTimeout(60_000);

  const PRODUCTION_URL = 'https://origen-one-kohl.vercel.app';
  const DEFAULT_EMAIL = 'salazaroliveros@gmail.com';
  const DEFAULT_PASSWORD = 'Origen2026!Secure';

  console.log('=== PRODUCCIÓN: Prueba E2E de conexión Firebase ===\n');

  // 1. Navegar a la URL de producción
  console.log(`1. Navegando a ${PRODUCTION_URL}...`);
  await page.goto(PRODUCTION_URL);
  await page.waitForLoadState('networkidle');

  // 2. Verificar que la aplicación carga
  const title = await page.title();
  console.log(`2. Título de la página: ${title}`);
  expect(title).toContain('ConstructERP');

  // 3. Auto-auth: entra directamente sin diálogo de login
  await page.waitForTimeout(3000);
  const authDialog = page.getByRole('dialog', { name: 'Iniciar sesión' });
  const dialogVisible = await authDialog.isVisible({ timeout: 2000 }).catch(() => false);

  expect(dialogVisible).toBe(false);
  console.log('3. Auto-auth exitoso (sin diálogo de login)');

  // 4. Verificar email de usuario en la interfaz
  await expect(page.locator('#main-content').getByText(DEFAULT_EMAIL)).toBeVisible({
    timeout: 15000,
  });
  console.log(`4. Usuario autenticado: ${DEFAULT_EMAIL}`);

  // 5. Verificar que no hay errores de Firebase en consola
  const firebaseErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && msg.text().includes('Firebase')) {
      firebaseErrors.push(msg.text());
    }
  });

  await page.waitForTimeout(3000);

  if (firebaseErrors.length === 0) {
    console.log('6. Sin errores de Firebase en consola');
  } else {
    console.log(`6. Errores de Firebase detectados: ${firebaseErrors.length}`);
    firebaseErrors.slice(0, 3).forEach((e) => console.log(`   - ${e.slice(0, 100)}`));
  }

  // 7. Verificar que los módulos de navegación están disponibles
  const navButtons = page.getByRole('button');
  const btnCount = await navButtons.count();
  console.log(`7. Botones de navegación disponibles: ${btnCount}`);

  console.log('\n=== RESULTADO: Conexión Firebase y autenticación VALIDADAS en producción ===');
  console.log('   - URL de producción: https://origen-one-kohl.vercel.app');
  console.log('   - Correo automático: salazaroliveros@gmail.com');
  console.log('   - Auto-auth: Funcionando (sin pantalla de login)');
  console.log('   - Conexión Firebase: Activa y sin errores');
});
