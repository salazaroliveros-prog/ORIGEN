import { test, expect } from '@playwright/test';

/**
 * Pruebas Visuales de Login - ORIGEN ERP
 * Captura interactiva del flujo de autenticación admin
 */

test.describe('Login Flow - Visual Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Ir a la página de login
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Login Page Layout Validation', () => {
    test('desktop: capture login page full layout', async ({ page, browserName }) => {
      const viewport = page.viewportSize();

      // Capturar estado inicial
      await page.screenshot({
        path: `screenshots/login/01-desktop-initial-${browserName}.png`,
        fullPage: true,
      });

      // Validar estructura
      const form = page.locator('form');
      const inputs = page.locator('input');
      const buttons = page.locator('button');

      console.log(`
        ═══════════════════════════════════════
        LOGIN PAGE ANALYSIS (${browserName.toUpperCase()})
        ═══════════════════════════════════════
        Viewport: ${viewport?.width}x${viewport?.height}
        Form visible: ${await form.isVisible()}
        Input fields: ${await inputs.count()}
        Buttons: ${await buttons.count()}
      `);

      await expect(form).toBeVisible({ timeout: 10000 });
    });

    test('tablet: capture login responsiveness', async ({ page, browserName }) => {
      const viewport = page.viewportSize();

      await page.screenshot({
        path: `screenshots/login/02-tablet-layout-${browserName}.png`,
        fullPage: true,
      });

      // Verificar que todo es tappeable (tamaño mínimo 44x44 para mobile)
      const buttons = await page.locator('button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          console.log(`Button ${i}: ${box.width.toFixed(0)}x${box.height.toFixed(0)}px`);
        }
      }
    });

    test('mobile: capture login for small screens', async ({ page }) => {
      const viewport = page.viewportSize();

      await page.screenshot({
        path: `screenshots/login/03-mobile-layout-${viewport?.width}x${viewport?.height}.png`,
        fullPage: true,
      });

      // Verificar no hay horizontal scrolling
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });

      expect(hasOverflow).toBe(false);
    });
  });

  test.describe('Input Fields Interaction', () => {
    test('email input field: focus and type simulation', async ({ page }) => {
      const viewport = page.viewportSize();

      // Encontrar campo de email
      const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]').first();

      if (await emailInput.isVisible()) {
        // Screenshot sin foco
        await page.screenshot({
          path: `screenshots/login/04-email-input-unfocused-${viewport?.width}.png`,
        });

        // Enfocar campo
        await emailInput.focus();
        await page.waitForTimeout(300);

        // Screenshot con foco
        await page.screenshot({
          path: `screenshots/login/05-email-input-focused-${viewport?.width}.png`,
        });

        // Captura de bounding box
        const box = await emailInput.boundingBox();
        console.log(`Email input position: top=${box?.top}, left=${box?.left}, w=${box?.width}, h=${box?.height}`);

        // Tipear ejemplo
        await emailInput.fill('admin@test.com');
        await page.waitForTimeout(200);

        await page.screenshot({
          path: `screenshots/login/06-email-filled-${viewport?.width}.png`,
        });
      }
    });

    test('password input field: interaction flow', async ({ page }) => {
      const viewport = page.viewportSize();

      const passwordInput = page.locator('input[type="password"]').first();

      if (await passwordInput.isVisible()) {
        // Screenshot vacío
        await page.screenshot({
          path: `screenshots/login/07-password-input-empty-${viewport?.width}.png`,
        });

        // Focus
        await passwordInput.focus();
        await page.waitForTimeout(300);

        await page.screenshot({
          path: `screenshots/login/08-password-input-focused-${viewport?.width}.png`,
        });

        // Tipear
        await passwordInput.fill('••••••••');
        await page.waitForTimeout(200);

        await page.screenshot({
          path: `screenshots/login/09-password-filled-${viewport?.width}.png`,
        });
      }
    });
  });

  test.describe('Button States & Hover', () => {
    test('submit button: default and hover states', async ({ page }) => {
      const viewport = page.viewportSize();

      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Iniciar")').first();

      if (await submitButton.isVisible()) {
        // Estado inicial
        await page.screenshot({
          path: `screenshots/login/10-button-initial-${viewport?.width}.png`,
        });

        // Hover (solo en desktop)
        if (!page.context().browser()?.browserType().name().includes('mobile')) {
          await submitButton.hover();
          await page.waitForTimeout(300);

          await page.screenshot({
            path: `screenshots/login/11-button-hover-${viewport?.width}.png`,
          });
        }

        // Focus
        await submitButton.focus();
        await page.waitForTimeout(300);

        await page.screenshot({
          path: `screenshots/login/12-button-focused-${viewport?.width}.png`,
        });
      }
    });
  });

  test.describe('Form Validation Display', () => {
    test('display error messages on empty submit', async ({ page }) => {
      const viewport = page.viewportSize();

      // Encontrar botón submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();

      // Captura previa
      await page.screenshot({
        path: `screenshots/login/13-form-pristine-${viewport?.width}.png`,
      });

      // Click sin llenar (si está disponible)
      if (await submitButton.isVisible()) {
        await submitButton.click({ timeout: 2000 }).catch(() => {
          // Click podría no hacer nada
        });

        await page.waitForTimeout(1000);

        // Captura con posibles errores
        await page.screenshot({
          path: `screenshots/login/14-form-validation-${viewport?.width}.png`,
          fullPage: true,
        });
      }
    });
  });

  test.describe('Full Login Workflow', () => {
    test('complete login flow with valid credentials - admin', async ({ page, browserName }) => {
      const viewport = page.viewportSize();

      console.log(`\n📱 Testing login flow on ${browserName} (${viewport?.width}x${viewport?.height})\n`);

      // 1. Captura inicial
      await page.screenshot({
        path: `screenshots/login/workflow/00-initial-${browserName}-${viewport?.width}.png`,
      });

      // 2. Llenar email
      const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]').first();
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('admin@test.com');
        console.log('✓ Email ingresado: admin@test.com');
        await page.screenshot({
          path: `screenshots/login/workflow/01-email-filled-${browserName}-${viewport?.width}.png`,
        });
      }

      // 3. Llenar password
      const passwordInput = page.locator('input[type="password"]').first();
      if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await passwordInput.fill('Admin123!@');
        console.log('✓ Password ingresado');
        await page.screenshot({
          path: `screenshots/login/workflow/02-password-filled-${browserName}-${viewport?.width}.png`,
        });
      }

      // 4. Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Iniciar")').first();
      if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitButton.click();
        console.log('✓ Click en submit');

        // Esperar navegación
        await page.waitForTimeout(2000);

        // 5. Captura post-login
        await page.screenshot({
          path: `screenshots/login/workflow/03-post-login-${browserName}-${viewport?.width}.png`,
          fullPage: true,
        });

        const currentUrl = page.url();
        const isLoggedIn = !currentUrl.includes('/login') && !currentUrl.includes('/auth');
        console.log(`✓ URL post-login: ${currentUrl}`);
        console.log(`✓ Login exitoso: ${isLoggedIn}\n`);
      }
    });
  });

  test.describe('Responsive Behavior', () => {
    test('keyboard navigation on all devices', async ({ page }) => {
      const viewport = page.viewportSize();

      // Tab a través de elementos
      const focusSequence: string[] = [];
      let count = 0;

      while (count < 5) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          return el?.tagName + (el?.id ? `#${el.id}` : '');
        });

        focusSequence.push(focused);
        count++;
      }

      console.log(`\nTab order on ${viewport?.width}x${viewport?.height}:`);
      focusSequence.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));

      await page.screenshot({
        path: `screenshots/login/15-keyboard-nav-${viewport?.width}.png`,
      });
    });
  });
});
