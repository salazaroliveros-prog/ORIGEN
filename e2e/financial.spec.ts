import { test, expect } from '@playwright/test';

/**
 * ORIGEN ERP - Financial Management E2E Tests
 * 
 * Tests de extremo a extremo para gestión financiera
 */

test.describe('Financial Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to financial dashboard', async ({ page }) => {
    await page.click('text=Financial');
    await expect(page).toHaveURL(/.*financial/);
  });

  test('should display budget summary', async ({ page }) => {
    await page.goto('/financial');
    await expect(page.locator('text=Total Budget')).toBeVisible();
    await expect(page.locator('text=Total Spent')).toBeVisible();
    await expect(page.locator('text=Remaining')).toBeVisible();
  });

  test('should add new expense', async ({ page }) => {
    await page.goto('/financial');
    await page.click('text=Add Expense');
    await page.fill('input[name="description"]', 'Material Purchase');
    await page.fill('input[name="amount"]', '5000');
    await page.selectOption('select[name="category"]', 'materials');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Expense added successfully')).toBeVisible();
  });

  test('should validate expense amount', async ({ page }) => {
    await page.goto('/financial');
    await page.click('text=Add Expense');
    await page.fill('input[name="amount"]', '-100');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Amount must be positive')).toBeVisible();
  });

  test('should edit expense', async ({ page }) => {
    await page.goto('/financial');
    await page.click('text=Material Purchase');
    await page.click('text=Edit');
    await page.fill('input[name="amount"]', '6000');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Expense updated successfully')).toBeVisible();
  });

  test('should delete expense', async ({ page }) => {
    await page.goto('/financial');
    await page.click('text=Material Purchase');
    await page.click('text=Delete');
    await expect(page.locator('dialog')).toBeVisible();
    await page.click('text=Confirm');
    await expect(page.locator('text=Expense deleted successfully')).toBeVisible();
  });

  test('should filter expenses by category', async ({ page }) => {
    await page.goto('/financial');
    await page.selectOption('select[name="category"]', 'materials');
    await expect(page.locator('table tbody tr')).toHaveCount(4);
  });

  test('should check budget utilization', async ({ page }) => {
    await page.goto('/financial');
    await expect(page.locator('text=Budget Utilization')).toBeVisible();
    const utilization = await page.locator('text=Budget Utilization').textContent();
    expect(utilization).toContain('%');
  });

  test('should export financial report', async ({ page }) => {
    await page.goto('/financial');
    await page.click('text=Export Report');
    await expect(page.locator('text=Report exported successfully')).toBeVisible();
  });
});
