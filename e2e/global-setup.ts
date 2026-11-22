import { chromium, expect } from '@playwright/test';

// Use global fetch from node if available, otherwise use a simple check
const isBrowser = typeof window !== 'undefined';

/**
 * E2E Test Warm-up for Firebase Emulators.
 *
 * Flow:
 * 1. Login with admin credentials
 * 2. Detect onboarding vs dashboard state
 * 3. Since the seed already created the company, navigate directly to dashboard
 * 4. Verify dashboard is visible
 */

export default async function warmUpSession(config: any): Promise<void> {
  const baseURL = config.use?.baseURL || process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
  const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@origen.com';
  const password = process.env.E2E_ADMIN_PASSWORD ?? 'admin123';

  // Wait for emulators to be ready - check if app is accessible
  const maxEmulatorWait = Date.now() + 60_000;
  let emulatorsReady = false;

  while (Date.now() < maxEmulatorWait && !emulatorsReady) {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch.fetch(`${baseURL}/_ health`, { timeout: 3_000 });
      if (response.ok) {
        emulatorsReady = true;
      }
    } catch {
      // Emulators not ready yet, wait and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }

  if (!emulatorsReady) {
    console.warn('[warmUp] Emulators not ready after 60s, proceeding anyway');
  }
  const browser = await chromium.launch({ headless: process.env.CI === 'true' });

  try {
    const page = await browser.newPage();
    const browserErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });

    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 120_000 });

    // UI Elements
    const dashboard = page.getByRole('button', { name: 'Tablero' }).first();
    const emailField = page.getByLabel('Correo electrón').first();
    const passwordField = page.getByLabel('Contraseña', { exact: true }).first();
    const loginButton = page.getByRole('button', { name: /Iniciar Sesi/ }).first();
    const onboardingHeading = page
      .getByRole('heading', {
        name: 'Configuración inicial de empresa',
      })
      .first();

    // Step 1: Check if already at dashboard
    if (await dashboard.isVisible().catch(() => false)) {
      console.log('[warmUp] Already at dashboard - session hot');
      await browser.close();
      return;
    }

    // Step 2: Login
    console.log('[warmUp] Logging in...');

    // Wait for login form to be visible
    try {
      await emailField.waitFor({ state: 'visible', timeout: 30_000 });
      await emailField.fill(email);
      await passwordField.fill(password);
      await loginButton.click();
    } catch (err) {
      console.error('[warmUp] Login form not found, checking page content...');
      const bodyText = await page
        .locator('body')
        .innerText()
        .catch(() => '');
      throw new Error(
        `Login form not found. URL: ${page.url()}. Content: ${bodyText.slice(0, 1000)}`
      );
    }

    // Step 3: Wait for redirect after login (dashboard or onboarding)
    console.log('[warmUp] Waiting for post-login redirect...');
    const deadline = Date.now() + 120_000;
    let done = false;
    let loginAttempts = 0;

    while (Date.now() < deadline && !done && loginAttempts < 3) {
      const currentUrl = page.url();
      const atDashboard = await dashboard.isVisible().catch(() => false);
      const atOnboarding = await onboardingHeading.isVisible().catch(() => false);

      // If redirected to dashboard, finish
      if (atDashboard) {
        console.log('[warmUp] Dashboard visible after login');
        done = true;
        break;
      }

      // If onboarding page is showing, and company already exists from seed,
      // navigate directly to dashboard (skip onboarding form)
      if (atOnboarding) {
        console.log('[warmUp] Onboarding page showing - navigating to dashboard...');
        try {
          await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        } catch (err) {
          console.warn('[warmUp] Navigation to / failed, retrying...');
        }
        if (await dashboard.isVisible().catch(() => false)) {
          console.log('[warmUp] Dashboard visible after navigation');
          done = true;
          break;
        }
      }

      await page.waitForTimeout(1_000);
      loginAttempts++;
    }

    // Step 4: If still not done, error
    if (!done) {
      const currentUrl = page.url();
      const bodyText = await page
        .locator('body')
        .innerText()
        .catch(() => '(no se pudo leer)');
      throw new Error(`E2E auth failed. URL: ${currentUrl}. Content: ${bodyText.slice(0, 2500)}`);
    }

    // Step 5: Wait for main content to be ready
    await page.locator('#main-content').waitFor({ state: 'attached', timeout: 180_000 });
    await expect
      .poll(
        async () => (await page.locator('#main-content').getAttribute('aria-busy')) === 'false',
        {
          timeout: 180_000,
        }
      )
      .toBe(true);

    console.log('[warmUp] E2E session hot and ready for tests');
  } finally {
    await browser.close();
  }
}
