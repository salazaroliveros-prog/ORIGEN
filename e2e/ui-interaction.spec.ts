import { test, expect } from '@playwright/test';

/**
 * ORIGEN ERP - UI Interaction E2E Tests
 * 
 * Tests de extremo a extremo para interacción con UI
 */

test.describe('UI Interaction Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open and close modal', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=New Project');
    await expect(page.locator('dialog')).toBeVisible();
    await page.click('button[aria-label="Close"]');
    await expect(page.locator('dialog')).not.toBeVisible();
  });

  test('should use dropdown menu', async ({ page }) => {
    await page.goto('/projects');
    await page.click('button[aria-label="More options"]');
    await expect(page.locator('ul[role="menu"]')).toBeVisible();
    await page.click('text=Edit');
  });

  test('should filter data table', async ({ page }) => {
    await page.goto('/projects');
    await page.selectOption('select[name="status"]', 'active');
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('should sort data table', async ({ page }) => {
    await page.goto('/projects');
    await page.click('th >> text=Name');
    await expect(page.locator('table tbody tr').first()).toContainText('A');
  });

  test('should paginate data table', async ({ page }) => {
    await page.goto('/projects');
    await page.click('button[aria-label="Next page"]');
    await expect(page.locator('button[aria-label="Previous page"]')).toBeEnabled();
  });

  test('should use search functionality', async ({ page }) => {
    await page.goto('/projects');
    await page.fill('input[placeholder="Search"]', 'Building');
    await page.press('input[placeholder="Search"]', 'Enter');
    const results = await page.locator('table tbody tr').count();
    expect(results).toBeGreaterThan(0);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/projects');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/.*projects\/[^/]+/);
  });

  test('should display loading state', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=New Project');
    await page.click('button[type="submit"]');
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  });

  test('should display toast notification', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Test Project');
    await page.click('button[type="submit"]');
    await expect(page.locator('role=alert')).toBeVisible();
  });

  test('should handle form validation errors', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=New Project');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=required')).toBeVisible();
  });
});
