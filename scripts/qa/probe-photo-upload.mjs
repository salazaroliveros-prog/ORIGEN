import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:3100';
const EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';
const browser = await chromium.launch({
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, locale: 'es-GT' });
const uploads = [];
page.on('response', async (r) => {
  if (r.url().includes('/api/upload-project-photo')) {
    let body = '';
    try {
      body = await r.text();
    } catch {}
    uploads.push({ status: r.status(), body });
  }
});
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3500);
await page.getByLabel('Correo electrónico').fill(EMAIL);
await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
await page
  .getByRole('button', { name: /Iniciar Sesión/i })
  .first()
  .click();
await page
  .locator('[role="tab"]:visible')
  .filter({ hasText: 'Tablero' })
  .first()
  .waitFor({ timeout: 60000 });
await page
  .locator('[role="tab"]:visible')
  .filter({ hasText: 'Proyectos & Firmas' })
  .first()
  .click();
await page.waitForTimeout(1500);
const btn = page.locator('button[aria-label^="Subir fotos de avance"]').first();
const label = await btn.getAttribute('aria-label');
const code = label?.replace('Subir fotos de avance ', '').trim();
await btn.click();
await page.waitForTimeout(1200);
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64'
);
const file = 'qa-artifacts/probe-photo.png';
fs.writeFileSync(file, png);
await page.locator('input[type="file"]').last().setInputFiles(file);
await page.waitForTimeout(5000);
console.log('PROJECT:', code);
console.log('UPLOADS:', JSON.stringify(uploads));
console.log('BODY:', (await page.locator('body').innerText()).slice(-500).replace(/\s+/g, ' '));
await browser.close();
