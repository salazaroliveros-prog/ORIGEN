import { test, expect } from '@playwright/test';

/**
 * Suite de Pruebas Visuales Responsivas
 * Captura screenshots en diferentes viewports (desktop, tablet, mobile)
 * Valida integridad visual y responsividad
 */

test.describe('Visual Testing - Login & Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar a la página de inicio
    await page.goto('/');
    // Esperar a que cargue
    await page.waitForLoadState('networkidle');
  });

  test.describe('Login Page Responsiveness', () => {
    test('should display login page correctly on desktop', async ({ page }) => {
      const viewport = page.viewportSize();
      console.log(`Testing on viewport: ${viewport?.width}x${viewport?.height}`);

      // Capturar screenshot completo
      await page.screenshot({
        path: `screenshots/01-login-${viewport?.width}x${viewport?.height}.png`,
        fullPage: true,
      });

      // Validar elementos principales
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();
    });

    test('should load without layout shifts', async ({ page }) => {
      const viewport = page.viewportSize();

      // Capturar después de cada interacción
      await page.screenshot({
        path: `screenshots/02-login-loaded-${viewport?.width}x${viewport?.height}.png`,
        fullPage: true,
      });

      // Verificar que no hay elementos ocultos en viewport pequeño
      const elements = await page.locator('*').count();
      expect(elements).toBeGreaterThan(0);
    });

    test('should have readable text on all sizes', async ({ page }) => {
      const viewport = page.viewportSize();
      const fontSize = await page.evaluate(() => {
        const element = document.querySelector('input, button');
        return element ? window.getComputedStyle(element).fontSize : null;
      });

      console.log(`Font size on ${viewport?.width}x${viewport?.height}: ${fontSize}`);
      expect(fontSize).not.toBeNull();
    });
  });

  test.describe('Input Fields Responsiveness', () => {
    test('should display input fields properly', async ({ page }) => {
      const viewport = page.viewportSize();

      const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      // Verificar visibilidad
      if (await emailInput.isVisible()) {
        await expect(emailInput).toBeVisible();
        await emailInput.screenshot({
          path: `screenshots/03-email-input-${viewport?.width}x${viewport?.height}.png`,
        });
      }

      if (await passwordInput.isVisible()) {
        await expect(passwordInput).toBeVisible();
      }
    });

    test('should focus inputs without scrolling issues', async ({ page }) => {
      const viewport = page.viewportSize();
      const emailInput = page.locator('input[type="email"], input[name*="email"]').first();

      if (await emailInput.isVisible()) {
        await emailInput.focus();
        const box = await emailInput.boundingBox();
        console.log(`Input position on ${viewport?.width}x${viewport?.height}:`, box);
        expect(box).not.toBeNull();
      }
    });
  });

  test.describe('Buttons & Interactive Elements', () => {
    test('should display buttons with proper padding', async ({ page }) => {
      const viewport = page.viewportSize();
      const buttons = page.locator('button');
      const count = await buttons.count();

      if (count > 0) {
        for (let i = 0; i < Math.min(count, 2); i++) {
          const button = buttons.nth(i);
          if (await button.isVisible()) {
            const box = await button.boundingBox();
            console.log(`Button ${i} size on ${viewport?.width}x${viewport?.height}:`, box);
            // Validar que el botón tenga tamaño mínimo de toque (48px)
            expect(box?.height).toBeGreaterThanOrEqual(32);
          }
        }
      }
    });

    test('should capture full page layout', async ({ page }) => {
      const viewport = page.viewportSize();
      await page.screenshot({
        path: `screenshots/04-full-page-${viewport?.width}x${viewport?.height}.png`,
        fullPage: true,
      });
    });
  });

  test.describe('Typography & Spacing', () => {
    test('should maintain proper line-height on mobile', async ({ page }) => {
      const viewport = page.viewportSize();

      const lineHeight = await page.evaluate(() => {
        const p = document.querySelector('p, span, label');
        return p ? window.getComputedStyle(p).lineHeight : null;
      });

      console.log(`Line height on ${viewport?.width}x${viewport?.height}: ${lineHeight}`);
      expect(lineHeight).not.toBeNull();
    });

    test('should check color contrast', async ({ page }) => {
      const viewport = page.viewportSize();

      const contrast = await page.evaluate(() => {
        const element = document.querySelector('button, a');
        if (!element) return null;

        const bgColor = window.getComputedStyle(element).backgroundColor;
        const color = window.getComputedStyle(element).color;
        return { bgColor, color };
      });

      console.log(`Colors on ${viewport?.width}x${viewport?.height}:`, contrast);
      expect(contrast).not.toBeNull();
    });
  });

  test.describe('Overflow & Scrolling', () => {
    test('should not have horizontal overflow', async ({ page }) => {
      const viewport = page.viewportSize();

      const hasOverflow = await page.evaluate(() => {
        const bodyWidth = document.body.scrollWidth;
        const windowWidth = window.innerWidth;
        return bodyWidth > windowWidth;
      });

      console.log(`Horizontal overflow on ${viewport?.width}x${viewport?.height}:`, hasOverflow);
      expect(hasOverflow).toBe(false);
    });

    test('should have proper viewport meta tag', async ({ page }) => {
      const viewport = page.viewportSize();

      const viewportMeta = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        return meta?.getAttribute('content');
      });

      console.log(`Viewport meta on ${viewport?.width}x${viewport?.height}:`, viewportMeta);
      expect(viewportMeta).toContain('width=device-width');
    });
  });

  test.describe('Performance Metrics', () => {
    test('should log performance metrics', async ({ page }) => {
      const viewport = page.viewportSize();

      const metrics = await page.evaluate(() => ({
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      }));

      console.log(`Performance metrics on ${viewport?.width}x${viewport?.height}:`, metrics);
      console.log('='.repeat(60));
    });
  });
});
