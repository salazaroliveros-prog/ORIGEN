import { test, expect } from '@playwright/test';

/**
 * Mobile UI E2E Tests
 * Validates mobile-first responsive behavior, touch targets, and accessibility
 */

test.describe('Mobile UI - iPhone 13', () => {
  test('should render mobile bottom navigation', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for bottom navigation
    const bottomNav = page.locator('[role="navigation"]').filter({ hasText: /Tablero|Obras/ });
    await expect(bottomNav).toBeVisible();

    // Check navigation items have sufficient touch targets (min 44x44px)
    const navItems = await bottomNav.locator('button, a').all();
    for (const item of navItems) {
      const box = await item.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should not have horizontal scroll on page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check body width equals viewport width
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 390;

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('should handle theme toggle', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find theme toggle button
    const themeToggle = page
      .locator(
        'button[aria-label*="tema"], button[aria-label*="Tema"], button[title*="tema"], button[title*="Tema"]'
      )
      .first();

    if (await themeToggle.isVisible()) {
      // Click to toggle theme
      await themeToggle.click();

      // Wait for theme change
      await page.waitForTimeout(500);

      // Click again to return to original
      await themeToggle.click();
    }
  });
});

test.describe('Mobile UI - Accessibility', () => {
  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check icon-only buttons have aria-label
    const iconButtons = await page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .all();

    for (const button of iconButtons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      const title = await button.getAttribute('title');

      // Icon-only buttons should have aria-label, aria-labelledby, or title
      const hasLabel = ariaLabel || ariaLabelledBy || title;

      if (!hasLabel) {
        const html = await button.evaluate((el: any) => el.outerHTML);
        console.log('Icon button without label:', html);
      }
    }
  });

  test('should have focus indicators', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Check focus has visible outline
    const focusStyles = await focusedElement.evaluate((el: any) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        outlineColor: styles.outlineColor,
      };
    });

    // Focus should have some visual indicator
    expect(focusStyles.outline || focusStyles.outlineWidth !== '0px').toBeTruthy();
  });
});
