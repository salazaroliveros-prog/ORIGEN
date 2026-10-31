import { expect, test } from '@playwright/test';

test('Production diagnostic: Check Firebase Auth errors on production', async ({ page }) => {
  test.setTimeout(60_000);

  const errors: string[] = [];
  const warnings: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning') warnings.push(msg.text());
  });

  page.on('pageerror', (err) => {
    errors.push('Page error: ' + err.message);
  });

  await page.goto('https://origen-one-kohl.vercel.app/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  const authDialog = page.getByRole('dialog', { name: 'Iniciar sesión' });
  if (await authDialog.isVisible({ timeout: 2000 })) {
    await authDialog.getByLabel('Correo electrónico').fill('salazaroliveros@gmail.com');
    await authDialog.getByLabel('Contraseña', { exact: true }).fill('Origen2026!Secure');
    await authDialog.getByRole('button', { name: 'Iniciar sesión con correo' }).click();
    await page.waitForTimeout(5000);
  }

  console.log('=== ERRORS ===');
  console.log(errors.slice(0, 20).join('\n'));
  console.log('\n=== WARNINGS ===');
  console.log(warnings.slice(0, 10).join('\n'));

  const bodyText = await page.locator('body').textContent();
  console.log('\n=== BODY TEXT (first 500) ===');
  console.log(bodyText?.slice(0, 500));

  await page.screenshot({ path: 'prod-auth-diagnostic.png', fullPage: true });
});
