import { expect, type Page } from '@playwright/test';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

export async function ensureAuthenticated(page: Page) {
	await page.goto('/');
	// Wait for the app to fully load
	await page.waitForLoadState('networkidle', { timeout: 30_000 });
	
	// Check if already authenticated by looking for user email or dashboard
	const dashboard = page.getByRole('button', { name: 'Tablero' }).first();
	const userEmailVisible = await page.getByText(ADMIN_EMAIL).isVisible().catch(() => false);
	
	if (!(await dashboard.isVisible().catch(() => false)) && !userEmailVisible) {
		const emailField = page.getByLabel('Correo electrónico');
		await expect(emailField).toBeVisible({ timeout: 30_000 });
		await emailField.fill(ADMIN_EMAIL);
		await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD);
		await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
		// Wait for authentication to complete - look for user email or dashboard
		await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible({ timeout: 60_000 });
		await page.waitForLoadState('networkidle', { timeout: 30_000 });
	}
	await expect(dashboard).toBeVisible({ timeout: 60_000 });
}