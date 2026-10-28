import { expect, test } from '@playwright/test';

test('el diálogo de acceso solo ofrece correo y contraseña', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const authDialog = page.getByRole('dialog', { name: 'Iniciar sesión' });
  await expect(authDialog).toBeVisible({ timeout: 10000 });
  await expect(authDialog.getByLabel('Correo electrónico')).toBeVisible();
  await expect(authDialog.getByLabel('Contraseña')).toBeVisible();
  await expect(
    authDialog.getByRole('button', { name: /iniciar sesión con correo/i })
  ).toBeVisible();
  await expect(authDialog.getByRole('button', { name: /google/i })).toHaveCount(0);
});
