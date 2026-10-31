import { expect, test } from '@playwright/test';

test('Production diagnostic: Detailed login flow', async ({ page }) => {
  test.setTimeout(60_000);

  const DEFAULT_EMAIL = 'salazaroliveros@gmail.com';
  const DEFAULT_PASSWORD = 'Origen2026!Secure';

  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('https://origen-one-kohl.vercel.app/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const authDialog = page.getByRole('dialog', { name: 'Iniciar sesión' });

  if (await authDialog.isVisible({ timeout: 2000 })) {
    console.log('AuthDialog visible');

    // Check what fields are available
    const emailInput = authDialog.getByLabel('Correo electrónico');
    const passwordInput = authDialog.getByLabel('Contraseña', { exact: true });
    const signInBtn = authDialog.getByRole('button', { name: 'Iniciar sesión con correo' });

    console.log('Email input visible:', await emailInput.isVisible());
    console.log('Password input visible:', await passwordInput.isVisible());
    console.log('Sign in button visible:', await signInBtn.isVisible());
    console.log('Sign in button disabled:', await signInBtn.isDisabled());

    await emailInput.fill(DEFAULT_EMAIL);
    await passwordInput.fill(DEFAULT_PASSWORD);

    console.log('Email filled:', await emailInput.inputValue());
    console.log('Password filled:', await passwordInput.inputValue());

    await signInBtn.click();
    await page.waitForTimeout(5000);

    // Check for error messages
    const errorAlerts = authDialog.locator('[role="alert"]');
    const alertCount = await errorAlerts.count();
    console.log('Error alerts visible:', alertCount);
    if (alertCount > 0) {
      for (let i = 0; i < alertCount; i++) {
        console.log('Error message:', await errorAlerts.nth(i).textContent());
      }
    }

    const stillVisible = await authDialog.isVisible().catch(() => false);
    console.log('Dialog still visible:', stillVisible);

    if (stillVisible) {
      // Try clicking sign in again
      console.log('Trying sign in again...');
      await signInBtn.click();
      await page.waitForTimeout(5000);

      const alertCount2 = await errorAlerts.count();
      console.log('Error alerts after 2nd attempt:', alertCount2);
      if (alertCount2 > 0) {
        for (let i = 0; i < alertCount2; i++) {
          console.log('Error message:', await errorAlerts.nth(i).textContent());
        }
      }

      const stillVisible2 = await authDialog.isVisible().catch(() => false);
      console.log('Dialog still visible after 2nd attempt:', stillVisible2);
    }
  }

  console.log('\nAll console errors:');
  console.log(errors.slice(0, 10).join('\n'));

  await page.screenshot({ path: 'login-debug.png', fullPage: true });
});
