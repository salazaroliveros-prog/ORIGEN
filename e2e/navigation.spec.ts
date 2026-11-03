import { test, expect } from '@playwright/test';

/**
 * ORIGEN ERP - Navigation E2E Tests
 * 
 * Tests de extremo a extremo para navegación
 */

test.describe('Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate between pages', async ({ page }) => {
    await page.click('text=Dashboard');
    await expect(page).toHaveURL('/');
    
    await page.click('text=Projects');
    await expect(page).toHaveURL(/.*projects/);
    
    await page.click('text=Financial');
    await expect(page).toHaveURL(/.*financial/);
    
    await page.click('text=Payroll');
    await expect(page).toHaveURL(/.*payroll/);
  });

  test('should use sidebar navigation', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
    await page.click('nav >> text=Projects');
    await expect(page).toHaveURL(/.*projects/);
  });

  test('should toggle sidebar', async ({ page }) => {
    const sidebar = page.locator('nav');
    await page.click('button[aria-label="Toggle sidebar"]');
    await expect(sidebar).toHaveClass(/collapsed/);
  });

  test('should use mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.click('button[aria-label="Open menu"]');
    await expect(page.locator('dialog')).toBeVisible();
  });

  test('should display breadcrumbs', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=Building Project A');
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
    await expect(page.locator('text=Home')).toBeVisible();
    await expect(page.locator('text=Projects')).toBeVisible();
  });

  test('should navigate via breadcrumbs', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=Building Project A');
    await page.click('nav[aria-label="Breadcrumb"] >> text=Projects');
    await expect(page).toHaveURL(/.*projects/);
  });

  test('should handle back navigation', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=Building Project A');
    await page.goBack();
    await expect(page).toHaveURL(/.*projects/);
  });

  test('should handle forward navigation', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=Building Project A');
    await page.goBack();
    await page.goForward();
    await expect(page).toHaveURL(/.*projects\/[^/]+/);
  });
});
