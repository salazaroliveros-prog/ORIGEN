import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:3100';
const EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';
const OUT = 'qa-artifacts';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'es-GT',
  serviceWorkers: 'block',
});
const page = await context.newPage();

const consoleErrors = [];
const pageErrors = [];
const failedResponses = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => pageErrors.push(String(err)));
page.on('response', async (res) => {
  if (res.status() >= 400) {
    let body = '';
    try {
      body = (await res.text()).slice(0, 800);
    } catch {}
    failedResponses.push(`${res.status()} ${res.url()} :: ${body}`);
  }
});

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
console.log('URL1:', page.url());

const email = page.getByLabel('Correo electrónico');
if (await email.isVisible().catch(() => false)) {
  console.log('LOGIN FORM FOUND');
  await email.fill(EMAIL);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page
    .getByRole('button', { name: /Iniciar Sesión/i })
    .first()
    .click();
  await page.waitForTimeout(15000);
  console.log('URL2:', page.url());
  console.log('TEXT2:', (await page.locator('body').innerText()).slice(0, 1200));
  await page.screenshot({ path: `${OUT}/probe-headed.png`, fullPage: true });
}

console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors, null, 2));
console.log('PAGE_ERRORS:', JSON.stringify(pageErrors, null, 2));
console.log('FAILED_RESPONSES:', JSON.stringify(failedResponses, null, 2));

await browser.close();
