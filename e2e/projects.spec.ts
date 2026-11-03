import { test, expect } from '@playwright/test';

/**
 * ORIGEN ERP - Project Management E2E Tests
 * 
 * Tests de extremo a extremo para gestión de proyectos
 */

test.describe('Project Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to projects page', async ({ page }) => {
    await page.click('text=Projects');
    await expect(page).toHaveURL(/.*projects/);
  });

  test('should display project list', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should open new project modal', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=New Project');
    await expect(page.locator('dialog')).toBeVisible();
  });

  test('should validate project name field', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=New Project');
    await page.fill('input[name="name"]', '');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Project name is required')).toBeVisible();
  });

  test('should validate budget field', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Test Project');
    await page.fill('input[name="budget"]', '-100');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Budget must be positive')).toBeVisible();
  });

  test('should filter projects by status', async ({ page }) => {
    await page.goto('/projects');
    await page.selectOption('select[name="status"]', 'active');
    await expect(page.locator('table tbody tr')).toHaveCount(5);
  });

  test('should search projects', async ({ page }) => {
    await page.goto('/projects');
    await page.fill('input[placeholder="Search projects"]', 'Building');
    await page.press('input[placeholder="Search projects"]', 'Enter');
    await expect(page.locator('table tbody tr')).toHaveCount(3);
  });

  test('should navigate to project details', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=Building Project A');
    await expect(page).toHaveURL(/.*projects\/[^/]+/);
  });

  test('should edit project details', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=Building Project A');
    await page.click('text=Edit');
    await page.fill('input[name="name"]', 'Updated Project Name');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Project updated successfully')).toBeVisible();
  });

  test('should delete project with confirmation', async ({ page }) => {
    await page.goto('/projects');
    await page.click('text=Building Project A');
    await page.click('text=Delete');
    await expect(page.locator('dialog')).toBeVisible();
    await page.click('text=Confirm');
    await expect(page.locator('text=Project deleted successfully')).toBeVisible();
  });
});
