import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:3100';
const EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';
const USER_DATA = 'qa-artifacts/chrome-profile';

const context = await chromium.launchPersistentContext(USER_DATA, {
  headless: false,
  viewport: { width: 1500, height: 950 },
  locale: 'es-GT',
  serviceWorkers: 'block',
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
  ],
});
const page = context.pages()[0] || (await context.newPage());
const failures = [];
page.on('response', (res) => {
  if (res.status() >= 400) failures.push(`${res.status()} ${res.url()}`);
});

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
const email = page.getByLabel('Correo electrónico');
if (await email.isVisible().catch(() => false)) {
  await email.fill(EMAIL);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page
    .getByRole('button', { name: /Iniciar Sesión/i })
    .first()
    .click();
  await page.waitForTimeout(15000);
}
const ok = await page
  .locator('[role="tab"]:visible')
  .filter({ hasText: 'Tablero' })
  .first()
  .isVisible()
  .catch(() => false);
console.log('LOGIN_OK:', ok);
console.log('URL:', page.url());
console.log('FAILURES:', JSON.stringify(failures.slice(0, 10), null, 2));
await page.screenshot({ path: 'qa-artifacts/probe-persistent.png', fullPage: true });
await context.close();
