import { test, expect } from '@playwright/test';

/**
 * ORIGEN ERP - Authentication E2E Tests
 * 
 * Tests de extremo a extremo para autenticación
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/ORIGEN ERP/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation error for empty email', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Email is required')).toBeVisible();
  });

  test('should show validation error for empty password', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.click('text=Sign up');
    await expect(page).toHaveURL(/.*signup/);
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.click('text=Forgot password');
    await expect(page).toHaveURL(/.*forgot-password/);
  });

  test('should validate password strength on signup', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[name="password"]', 'weak');
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should show password mismatch error', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword!');
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should accept terms checkbox on signup', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=You must accept the terms')).toBeVisible();
  });
});
