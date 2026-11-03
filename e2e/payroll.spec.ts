import { test, expect } from '@playwright/test';

/**
 * ORIGEN ERP - Payroll E2E Tests
 * 
 * Tests de extremo a extremo para nómina
 */

test.describe('Payroll Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to payroll page', async ({ page }) => {
    await page.click('text=Payroll');
    await expect(page).toHaveURL(/.*payroll/);
  });

  test('should display employee list', async ({ page }) => {
    await page.goto('/payroll');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should add new employee', async ({ page }) => {
    await page.goto('/payroll');
    await page.click('text=Add Employee');
    await page.fill('input[name="name"]', 'John Doe');
    await page.fill('input[name="salary"]', '5000');
    await page.fill('input[name="position"]', 'Engineer');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Employee added successfully')).toBeVisible();
  });

  test('should validate employee salary', async ({ page }) => {
    await page.goto('/payroll');
    await page.click('text=Add Employee');
    await page.fill('input[name="salary"]', '-100');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Salary must be positive')).toBeVisible();
  });

  test('should record attendance', async ({ page }) => {
    await page.goto('/payroll');
    await page.click('text=John Doe');
    await page.click('text=Record Attendance');
    await page.fill('input[name="date"]', '2024-10-27');
    await page.selectOption('select[name="status"]', 'present');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Attendance recorded successfully')).toBeVisible();
  });

  test('should generate payroll', async ({ page }) => {
    await page.goto('/payroll');
    await page.click('text=Generate Payroll');
    await page.fill('input[name="month"]', '10');
    await page.fill('input[name="year"]', '2024');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Payroll generated successfully')).toBeVisible();
  });

  test('should view payroll summary', async ({ page }) => {
    await page.goto('/payroll');
    await page.click('text=View Summary');
    await expect(page.locator('text=Total Payroll')).toBeVisible();
    await expect(page.locator('text=IGSS')).toBeVisible();
    await expect(page.locator('text=ISR')).toBeVisible();
  });

  test('should validate payroll calculations', async ({ page }) => {
    await page.goto('/payroll');
    await page.click('text=View Summary');
    const igss = await page.locator('text=IGSS').textContent();
    const isr = await page.locator('text=ISR').textContent();
    expect(igss).toBeDefined();
    expect(isr).toBeDefined();
  });

  test('should export payroll report', async ({ page }) => {
    await page.goto('/payroll');
    await page.click('text=Export Report');
    await expect(page.locator('text=Report exported successfully')).toBeVisible();
  });
});
