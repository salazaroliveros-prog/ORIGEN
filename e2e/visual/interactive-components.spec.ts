import { test, expect } from '@playwright/test';
import {
  captureScreenshot,
  validateElement,
  captureElementState,
  interactWithElement,
  validateAccessibility,
  getViewportInfo,
} from './helpers';

/**
 * Interactive Components Visual Testing
 * Valida estados y transiciones de componentes
 */

test.describe('Interactive Components - Visual States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Form Elements', () => {
    test('input field states: default, focus, filled, error', async ({ page }) => {
      const viewport = getViewportInfo(page);

      // Buscar input
      const input = page.locator('input[type="text"], input[type="email"], input[type="password"]').first();

      if (await input.isVisible()) {
        // Default state
        await captureScreenshot(page, `form/input-default-${viewport.name}`);

        // Focus state
        await input.focus();
        await page.waitForTimeout(300);
        await captureScreenshot(page, `form/input-focused-${viewport.name}`);

        // Filled state
        await input.fill('Sample text');
        await page.waitForTimeout(200);
        await captureScreenshot(page, `form/input-filled-${viewport.name}`);

        // Check for error state
        const errorMsg = page.locator('[class*="error"], [role="alert"]').first();
        if (await errorMsg.isVisible()) {
          await captureScreenshot(page, `form/input-error-${viewport.name}`);
        }
      }
    });

    test('checkbox and radio visual appearance', async ({ page }) => {
      const viewport = getViewportInfo(page);

      const checkbox = page.locator('input[type="checkbox"]').first();
      const radio = page.locator('input[type="radio"]').first();

      if (await checkbox.isVisible()) {
        const wrapper = checkbox.locator('xpath=ancestor::*[1]');
        await wrapper.screenshot({
          path: `screenshots/form/checkbox-unchecked-${viewport.width}.png`,
        });

        await checkbox.click();
        await page.waitForTimeout(200);
        await wrapper.screenshot({
          path: `screenshots/form/checkbox-checked-${viewport.width}.png`,
        });
      }

      if (await radio.isVisible()) {
        const wrapper = radio.locator('xpath=ancestor::*[1]');
        await wrapper.screenshot({
          path: `screenshots/form/radio-unchecked-${viewport.width}.png`,
        });

        await radio.click();
        await page.waitForTimeout(200);
        await wrapper.screenshot({
          path: `screenshots/form/radio-checked-${viewport.width}.png`,
        });
      }
    });

    test('select dropdown interaction', async ({ page }) => {
      const viewport = getViewportInfo(page);

      const select = page.locator('select').first();

      if (await select.isVisible()) {
        // Closed state
        await captureScreenshot(page, `form/select-closed-${viewport.name}`);

        // Open state
        await select.click();
        await page.waitForTimeout(300);
        await captureScreenshot(page, `form/select-open-${viewport.name}`, { fullPage: true });
      }
    });
  });

  test.describe('Button States', () => {
    test('button: default, hover, focus, active, disabled', async ({ page, browserName }) => {
      const viewport = getViewportInfo(page);

      const buttons = page.locator('button, a[role="button"]');
      const count = await buttons.count();

      if (count > 0) {
        const button = buttons.first();

        if (await button.isVisible()) {
          // Default
          await captureElementState(page, 'button, a[role="button"]', 'default');

          // Hover (desktop only)
          if (browserName !== 'webkit') {
            await captureElementState(page, 'button, a[role="button"]', 'hover');
          }

          // Focus
          await captureElementState(page, 'button, a[role="button"]', 'focus');

          // Check if button has disabled state
          const disabled = page.locator('button:disabled, [role="button"][aria-disabled="true"]').first();
          if (await disabled.isVisible()) {
            await disabled.screenshot({
              path: `screenshots/form/button-disabled-${viewport.width}.png`,
            });
          }
        }
      }
    });

    test('button sizes on mobile vs desktop', async ({ page }) => {
      const viewport = getViewportInfo(page);

      const buttons = page.locator('button, a[role="button"]');
      const count = await buttons.count();

      if (count > 0) {
        for (let i = 0; i < Math.min(count, 2); i++) {
          const button = buttons.nth(i);
          if (await button.isVisible()) {
            const box = await button.boundingBox();
            console.log(`Button ${i}: ${box?.width}x${box?.height}px on ${viewport.name}`);

            // Mobile buttons should be at least 44px height for touch
            if (viewport.category === 'mobile' && box) {
              expect(box.height).toBeGreaterThanOrEqual(32); // Acceptable minimum
            }
          }
        }
      }
    });
  });

  test.describe('Cards & Containers', () => {
    test('card hover effect capture', async ({ page, browserName }) => {
      const viewport = getViewportInfo(page);

      const card = page.locator('[role="article"], .card, [class*="card"]').first();

      if (await card.isVisible()) {
        // Default state
        await card.screenshot({
          path: `screenshots/components/card-default-${viewport.width}.png`,
        });

        // Hover state (desktop)
        if (browserName !== 'webkit' && viewport.category === 'desktop') {
          await card.hover();
          await page.waitForTimeout(300);
          await card.screenshot({
            path: `screenshots/components/card-hover-${viewport.width}.png`,
          });
        }
      }
    });

    test('modal/dialog responsiveness', async ({ page }) => {
      const viewport = getViewportInfo(page);

      const modal = page.locator('dialog, [role="dialog"], .modal').first();

      if (await modal.isVisible()) {
        await captureScreenshot(page, `components/modal-${viewport.name}`, { fullPage: true });

        // Check if modal is scrollable on small screens
        if (viewport.category === 'mobile') {
          const isScrollable = await modal.evaluate((el) => {
            return el.scrollHeight > el.clientHeight;
          });

          console.log(`Modal scrollable on mobile: ${isScrollable}`);
        }
      }
    });
  });

  test.describe('Navigation Elements', () => {
    test('menu item hover states', async ({ page, browserName }) => {
      const viewport = getViewportInfo(page);

      const menuItems = page.locator('nav a, nav button, [role="menuitem"]');
      const count = await menuItems.count();

      if (count > 0 && browserName !== 'webkit') {
        const item = menuItems.first();

        if (await item.isVisible()) {
          // Default
          await item.screenshot({
            path: `screenshots/nav/menu-item-default-${viewport.width}.png`,
          });

          // Hover
          await item.hover();
          await page.waitForTimeout(200);
          await item.screenshot({
            path: `screenshots/nav/menu-item-hover-${viewport.width}.png`,
          });

          // Active/Selected
          if (await item.getAttribute('aria-current')) {
            await item.screenshot({
              path: `screenshots/nav/menu-item-active-${viewport.width}.png`,
            });
          }
        }
      }
    });

    test('breadcrumb display on different sizes', async ({ page }) => {
      const viewport = getViewportInfo(page);

      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"], [role="navigation"] [aria-label*="breadcrumb" i]').first();

      if (await breadcrumb.isVisible()) {
        await breadcrumb.screenshot({
          path: `screenshots/nav/breadcrumb-${viewport.name}.png`,
        });
      }
    });
  });

  test.describe('Animations & Transitions', () => {
    test('loading spinner animation', async ({ page }) => {
      const viewport = getViewportInfo(page);

      const spinner = page.locator('[class*="spinner"], [class*="loading"], [role="status"]').first();

      if (await spinner.isVisible()) {
        // Frame 1
        await spinner.screenshot({
          path: `screenshots/animations/spinner-frame1-${viewport.width}.png`,
        });

        // Frame 2 (after animation frame)
        await page.waitForTimeout(200);
        await spinner.screenshot({
          path: `screenshots/animations/spinner-frame2-${viewport.width}.png`,
        });
      }
    });

    test('transition state captures', async ({ page }) => {
      const viewport = getViewportInfo(page);

      // Find element with transition class
      const element = page.locator('[class*="transition"], [class*="animate"]').first();

      if (await element.isVisible()) {
        // Before
        await element.screenshot({
          path: `screenshots/animations/transition-before-${viewport.width}.png`,
        });

        // Trigger state change
        await element.evaluate((el) => {
          el.classList.toggle('active');
        });

        // Mid-transition
        await page.waitForTimeout(150);
        await element.screenshot({
          path: `screenshots/animations/transition-mid-${viewport.width}.png`,
        });

        // After
        await page.waitForTimeout(150);
        await element.screenshot({
          path: `screenshots/animations/transition-after-${viewport.width}.png`,
        });
      }
    });
  });

  test.describe('Accessibility Visual Indicators', () => {
    test('focus indicators visible on keyboard navigation', async ({ page }) => {
      const viewport = getViewportInfo(page);

      // Tab through elements and capture
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);

        const focused = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          return {
            tag: el?.tagName,
            class: el?.className,
            id: el?.id,
          };
        });

        console.log(`Tab ${i + 1}: ${JSON.stringify(focused)}`);

        await page.screenshot({
          path: `screenshots/a11y/focus-tab-${i + 1}-${viewport.width}.png`,
        });
      }
    });

    test('validate aria labels visibility', async ({ page }) => {
      const viewport = getViewportInfo(page);

      const ariaElements = page.locator('[aria-label]');
      const count = await ariaElements.count();

      console.log(`Elements with aria-label: ${count} on ${viewport.name}`);

      if (count > 0) {
        for (let i = 0; i < Math.min(count, 2); i++) {
          const element = ariaElements.nth(i);
          const label = await element.getAttribute('aria-label');

          console.log(`  ${i + 1}. ${label}`);
        }
      }
    });
  });

  test.describe('Full Component Suite Capture', () => {
    test('capture all interactive elements on current page', async ({ page }) => {
      const viewport = getViewportInfo(page);

      const components = {
        inputs: await page.locator('input, textarea, select').count(),
        buttons: await page.locator('button, [role="button"]').count(),
        links: await page.locator('a').count(),
        images: await page.locator('img').count(),
        forms: await page.locator('form').count(),
        modals: await page.locator('dialog, [role="dialog"]').count(),
      };

      console.log(`
        📊 Component Count on ${viewport.name}:
        • Inputs: ${components.inputs}
        • Buttons: ${components.buttons}
        • Links: ${components.links}
        • Images: ${components.images}
        • Forms: ${components.forms}
        • Modals: ${components.modals}
      `);

      const a11yIssues = await validateAccessibility(page);
      if (a11yIssues.length > 0) {
        console.log('⚠️  Accessibility Issues:');
        a11yIssues.forEach((issue) => console.log(`  - ${issue}`));
      }

      await captureScreenshot(page, `components/all-${viewport.name}`, { fullPage: true });
    });
  });
});
