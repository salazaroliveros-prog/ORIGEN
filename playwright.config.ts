import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * ORIGEN ERP — E2E contra una instancia aislada de la aplicación y Firebase.
 *
 * El runner scripts/run-e2e.mjs genera un puerto y un identificador por corrida.
 * La app usa un distDir independiente y Playwright nunca reutiliza servidores.
 */

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), '.env.e2e'));

const configuredPort = Number(process.env.E2E_PORT ?? 3000);
const serverPort =
  Number.isInteger(configuredPort) && configuredPort >= 1024 && configuredPort <= 65535
    ? configuredPort
    : 3000;
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${serverPort}`;
const runId = /^[a-f0-9]{16}$/.test(process.env.ORIGEN_E2E_RUN_ID ?? '')
  ? process.env.ORIGEN_E2E_RUN_ID!
  : 'local';
const reportDirectory = `test-results/${runId}`;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  maxFailures: 1,
  workers: 1,
  outputDir: `${reportDirectory}/artifacts`,
  reporter: [
    ['list'],
    ['html', { outputFolder: `playwright-report/${runId}`, open: 'never' }],
    ['json', { outputFile: `${reportDirectory}/playwright-report.json` }],
  ],
  webServer: {
    command: `npm run dev:emulated -- --port ${serverPort} --hostname 127.0.0.1`,
    url: new URL('/api/firebase-config.js', baseURL).toString(),
    timeout: 180_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
