import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:3100';
const EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';

const browser = await chromium.launch({
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, locale: 'es-GT' });
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
await page.getByLabel('Correo electrónico').fill(EMAIL);
await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
await page.getByRole('button', { name: /Iniciar Sesión/i }).first().click();
await page.locator('[role="tab"]:visible').filter({ hasText: 'Tablero' }).first().waitFor({ timeout: 60000 });
await page.locator('[role="tab"]:visible').filter({ hasText: 'Proyectos & Firmas' }).first().click();
await page.waitForTimeout(2000);

const selector = page
  .locator('select[aria-label="Seleccionar proyecto"]:visible, select[aria-label="Proyecto activo"]:visible')
  .first();
const options = await selector.locator('option').evaluateAll((nodes) =>
  nodes.map((n) => ({ value: n.value, text: n.textContent || '' }))
);
const leftovers = options.filter((o) => /Obra QA/.test(o.text));
const archived = [];
for (const leftover of leftovers) {
  const code = leftover.text.split(' · ')[0];
  const btn = page.getByRole('button', { name: `Archivar proyecto ${code}` }).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(1200);
    archived.push(code);
  }
}
console.log('LEFTOVERS:', JSON.stringify(leftovers.map((o) => o.text)));
console.log('ARCHIVED:', JSON.stringify(archived));
await browser.close();

