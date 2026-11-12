import { expect, type Page } from '@playwright/test';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

export async function ensureAuthenticated(page: Page) {
	await page.goto('/');
	// Wait for the app to fully load
	await page.waitForLoadState('networkidle', { timeout: 30_000 });
	const dashboard = page.getByRole('button', { name: 'Tablero' }).first();
	if (!(await dashboard.isVisible().catch(() => false))) {
		const emailField = page.getByLabel('Correo electrónico');
		await expect(emailField).toBeVisible({ timeout: 30_000 });
		await emailField.fill(ADMIN_EMAIL);
		await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD);
		await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
		// Wait for authentication to complete and dashboard to load
		await page.waitForLoadState('networkidle', { timeout: 60_000 });
	}
	await expect(dashboard).toBeVisible({ timeout: 60_000 });
}