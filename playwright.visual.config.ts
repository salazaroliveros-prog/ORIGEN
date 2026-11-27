import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e/visual',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Fuera de outputDir para que el reporter HTML no borre los artefactos. */
  outputDir: 'test-results/visual-artifacts',
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'test-results/visual-html' }],
    ['json', { outputFile: 'test-results/visual.json' }],
    ['junit', { outputFile: 'test-results/visual-junit.xml' }],
    ['list'],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers + mobile viewports */
  projects: [
    // Desktop - Chrome
    {
      name: 'Desktop-Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    // Desktop - Firefox
    {
      name: 'Desktop-Firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    // Desktop - Safari
    {
      name: 'Desktop-Safari',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Tablet - iPad
    {
      name: 'Tablet-iPad',
      use: {
        ...devices['iPad Pro 12.9'],
        viewport: { width: 1024, height: 1366 },
      },
    },
    // Tablet - iPad Mini
    {
      name: 'Tablet-iPad-Mini',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },
    // Tablet - Android
    {
      name: 'Tablet-Android',
      use: {
        ...devices['Pixel Tablet'],
        viewport: { width: 1280, height: 800 },
      },
    },

    // Mobile - iPhone 14
    {
      name: 'Mobile-iPhone14',
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 390, height: 844 },
      },
    },
    // Mobile - iPhone 14 Pro Max
    {
      name: 'Mobile-iPhone14-Pro-Max',
      use: {
        ...devices['iPhone 14 Pro Max'],
        viewport: { width: 430, height: 932 },
      },
    },
    // Mobile - iPhone SE
    {
      name: 'Mobile-iPhone-SE',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },
    // Mobile - Pixel 7
    {
      name: 'Mobile-Pixel7',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 412, height: 915 },
      },
    },
    // Mobile - Galaxy S8
    {
      name: 'Mobile-Galaxy-S8',
      use: {
        ...devices['Galaxy S8'],
        viewport: { width: 360, height: 740 },
      },
    },
    // Mobile - Galaxy S21
    {
      name: 'Mobile-Galaxy-S21',
      use: {
        ...devices['Galaxy S21'],
        viewport: { width: 360, height: 800 },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    // El workflow (y el dev local) ya deja el servidor arrancado en :3000;
    // iniciar otro hace fallar Playwright con "port already used".
    reuseExistingServer: true,
    timeout: 120000,
  },
});
