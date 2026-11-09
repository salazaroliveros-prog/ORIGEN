import { expect, type Page } from '@playwright/test';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

export async function ensureAuthenticated(page: Page) {
	await page.goto('/');
	const dashboard = page.getByRole('button', { name: 'Tablero' }).first();
	if (!(await dashboard.isVisible().catch(() => false))) {
		const emailField = page.getByLabel('Correo electrónico');
		await expect(emailField).toBeVisible();
		await emailField.fill(ADMIN_EMAIL);
		await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD);
		await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
	}
	await expect(dashboard).toBeVisible({ timeout: 30_000 });
}