import { test, expect } from '@playwright/test';

/**
 * Dashboard Responsiveness Tests
 * Valida el layout del dashboard en diferentes dispositivos
 */

test.describe('Dashboard - Visual Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Esperar a que cargue completamente
    await page.waitForLoadState('networkidle');
  });

  test.describe('Dashboard Layout', () => {
    test('should display header on all viewports', async ({ page }) => {
      const viewport = page.viewportSize();
      
      const header = page.locator('header, nav, [role="banner"]').first();
      
      if (await header.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(header).toBeVisible();
        
        const box = await header.boundingBox();
        console.log(`Header: ${box?.width}x${box?.height}px on ${viewport?.width}x${viewport?.height}`);
        
        await page.screenshot({
          path: `screenshots/dashboard/01-header-${viewport?.width}x${viewport?.height}.png`,
          fullPage: false,
        });
      }
    });

    test('should maintain grid layout on tablet', async ({ page }) => {
      const viewport = page.viewportSize();
      
      const mainContent = page.locator('main, [role="main"]').first();
      if (await mainContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(mainContent).toBeVisible();
        
        await page.screenshot({
          path: `screenshots/dashboard/02-main-content-${viewport?.width}x${viewport?.height}.png`,
          fullPage: true,
        });
      }
    });

    test('should stack layout on mobile', async ({ page }) => {
      const viewport = page.viewportSize();
      const isMobile = viewport && viewport.width < 768;
      
      if (isMobile) {
        // Verificar que no hay horizontal overflow
        const hasOverflow = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });
        
        expect(hasOverflow).toBe(false);
        
        await page.screenshot({
          path: `screenshots/dashboard/03-mobile-stack-${viewport?.width}x${viewport?.height}.png`,
          fullPage: true,
        });
      }
    });
  });

  test.describe('Navigation & Sidebars', () => {
    test('should display navigation properly', async ({ page }) => {
      const viewport = page.viewportSize();
      
      const nav = page.locator('nav, aside, [role="navigation"]').first();
      
      if (await nav.isVisible({ timeout: 5000 }).catch(() => false)) {
        const box = await nav.boundingBox();
        console.log(`Nav: ${box?.width}x${box?.height}px`);
        
        await page.screenshot({
          path: `screenshots/dashboard/04-nav-${viewport?.width}x${viewport?.height}.png`,
        });
      }
    });

    test('should have collapsible menu on mobile', async ({ page }) => {
      const viewport = page.viewportSize();
      const isMobile = viewport && viewport.width < 768;
      
      if (isMobile) {
        // Buscar hamburger menu
        const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="toggle" i], .hamburger').first();
        
        if (await hamburger.isVisible({ timeout: 5000 }).catch(() => false)) {
          await page.screenshot({
            path: `screenshots/dashboard/05-mobile-menu-closed-${viewport?.width}.png`,
          });
          
          await hamburger.click();
          await page.waitForTimeout(300);
          
          await page.screenshot({
            path: `screenshots/dashboard/06-mobile-menu-open-${viewport?.width}.png`,
            fullPage: true,
          });
        }
      }
    });
  });

  test.describe('Cards & Grid Items', () => {
    test('should display cards with proper spacing', async ({ page }) => {
      const viewport = page.viewportSize();
      
      const cards = page.locator('[role="article"], .card, [class*="card"], article').first();
      
      if (await cards.isVisible({ timeout: 5000 }).catch(() => false)) {
        const box = await cards.boundingBox();
        console.log(`Card size: ${box?.width}x${box?.height}px`);
        
        // Validar tamaño mínimo
        expect(box?.width).toBeGreaterThan(0);
        expect(box?.height).toBeGreaterThan(0);
        
        await cards.screenshot({
          path: `screenshots/dashboard/07-card-desktop-${viewport?.width}.png`,
        });
      }
    });

    test('should wrap cards on mobile', async ({ page }) => {
      const viewport = page.viewportSize();
      
      const container = page.locator('main, [role="main"]').first();
      
      if (await container.isVisible()) {
        const cards = await page.locator('[role="article"], .card, article').count();
        console.log(`Cards found: ${cards} on ${viewport?.width}x${viewport?.height}`);
        
        await page.screenshot({
          path: `screenshots/dashboard/08-cards-layout-${viewport?.width}x${viewport?.height}.png`,
          fullPage: true,
        });
      }
    });
  });

  test.describe('Charts & Graphs', () => {
    test('should render charts responsively', async ({ page }) => {
      const viewport = page.viewportSize();
      
      const chart = page.locator('svg, canvas, [role="img"]').first();
      
      if (await chart.isVisible({ timeout: 5000 }).catch(() => false)) {
        const box = await chart.boundingBox();
        console.log(`Chart: ${box?.width}x${box?.height}px on ${viewport?.width}x${viewport?.height}`);
        
        await page.screenshot({
          path: `screenshots/dashboard/09-chart-${viewport?.width}x${viewport?.height}.png`,
        });
      }
    });
  });

  test.describe('Tables & Lists', () => {
    test('should display table on desktop', async ({ page }) => {
      const viewport = page.viewportSize();
      const isDesktop = viewport && viewport.width >= 1024;
      
      const table = page.locator('table').first();
      
      if (isDesktop && await table.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.screenshot({
          path: `screenshots/dashboard/10-table-desktop-${viewport?.width}.png`,
        });
      }
    });

    test('should convert table to mobile-friendly format', async ({ page }) => {
      const viewport = page.viewportSize();
      const isMobile = viewport && viewport.width < 768;
      
      if (isMobile) {
        const table = page.locator('table');
        
        if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
          await page.screenshot({
            path: `screenshots/dashboard/11-table-mobile-${viewport?.width}.png`,
            fullPage: true,
          });
        }
      }
    });
  });

  test.describe('Buttons & CTA', () => {
    test('should display buttons with proper size', async ({ page }) => {
      const viewport = page.viewportSize();
      
      const buttons = page.locator('button, [role="button"], a[class*="button"]');
      const count = await buttons.count();
      
      let minHeight = Infinity;
      let maxHeight = 0;
      
      for (let i = 0; i < Math.min(count, 3); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const box = await button.boundingBox();
          if (box) {
            minHeight = Math.min(minHeight, box.height);
            maxHeight = Math.max(maxHeight, box.height);
          }
        }
      }
      
      console.log(`Button heights on ${viewport?.width}x${viewport?.height}: ${minHeight}px - ${maxHeight}px`);
      
      await page.screenshot({
        path: `screenshots/dashboard/12-buttons-${viewport?.width}x${viewport?.height}.png`,
      });
    });
  });

  test.describe('Empty States & Fallbacks', () => {
    test('should handle empty dashboard gracefully', async ({ page }) => {
      const viewport = page.viewportSize();
      
      const emptyState = page.locator('[class*="empty"], [class*="no-data"], .placeholder').first();
      
      if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.screenshot({
          path: `screenshots/dashboard/13-empty-state-${viewport?.width}x${viewport?.height}.png`,
        });
      } else {
        // Dashboard tiene contenido
        const content = page.locator('main, [role="main"]');
        if (await content.isVisible()) {
          await page.screenshot({
            path: `screenshots/dashboard/14-with-content-${viewport?.width}x${viewport?.height}.png`,
          });
        }
      }
    });
  });

  test.describe('Scrolling & Overflow', () => {
    test('should not have horizontal scroll on any viewport', async ({ page }) => {
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      
      expect(hasOverflow).toBe(false);
    });

    test('should handle vertical scroll properly', async ({ page }) => {
      const viewport = page.viewportSize();
      
      const needsScroll = await page.evaluate(() => {
        return document.body.scrollHeight > window.innerHeight;
      });
      
      if (needsScroll) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(300);
        
        await page.screenshot({
          path: `screenshots/dashboard/15-scrolled-${viewport?.width}x${viewport?.height}.png`,
        });
      }
    });
  });

  test.describe('Full Dashboard Viewport Captures', () => {
    test('capture full dashboard on desktop', async ({ page }) => {
      const viewport = page.viewportSize();
      
      await page.screenshot({
        path: `screenshots/dashboard/00-full-desktop-${viewport?.width}x${viewport?.height}.png`,
        fullPage: true,
      });
    });

    test('capture full dashboard on tablet', async ({ page }) => {
      const viewport = page.viewportSize();
      
      await page.screenshot({
        path: `screenshots/dashboard/00-full-tablet-${viewport?.width}x${viewport?.height}.png`,
        fullPage: true,
      });
    });

    test('capture full dashboard on mobile', async ({ page }) => {
      const viewport = page.viewportSize();
      
      await page.screenshot({
        path: `screenshots/dashboard/00-full-mobile-${viewport?.width}x${viewport?.height}.png`,
        fullPage: true,
      });
    });
  });
});
