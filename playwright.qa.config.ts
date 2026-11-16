import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Suite de QA ampliada. Hereda el servidor aislado, los guardas de Firebase,
 * los reportes por corrida y el globalSetup de la configuración principal.
 */
export default defineConfig({
  ...baseConfig,
  testMatch: /qa-.*\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
});
