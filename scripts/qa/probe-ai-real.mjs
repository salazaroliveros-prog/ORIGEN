import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:3100';
const EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';
const OUT = 'qa-artifacts/probe-ai-real';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, locale: 'es-GT' });
const responses = [];
page.on('response', async (r) => {
  if (!r.url().includes('/api/gemini')) return;
  let source = null;
  try {
    const body = JSON.parse(await r.text());
    source = body?.source ?? null;
  } catch {}
  responses.push({ status: r.status(), source });
});

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
await page.getByLabel('Correo electrónico').fill(EMAIL);
await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
await page.getByRole('button', { name: /Iniciar Sesión/i }).first().click();
await page.locator('[role="tab"]:visible').filter({ hasText: 'Tablero' }).first().waitFor({ timeout: 60000 });
await page.locator('[role="tab"]:visible').filter({ hasText: 'Asistente IA' }).first().click();
await page.waitForTimeout(1500);

const input = page.getByPlaceholder(/Escribe una consulta técnica/);
await input.fill('¿Cómo calculo el rendimiento de una cuadrilla de albañiles?');
await page.getByRole('button', { name: 'Enviar consulta' }).click();
await page.waitForTimeout(60000);

const body = await page.locator('body').innerText();
await page.screenshot({ path: `${OUT}/respuesta.png`, fullPage: true });
const failed = /Tu sesión expiró|Token de App Check requerido|No se pudo consultar|Error al consultar/i.test(body.slice(-3000));
const usedGemini = responses.some((r) => r.status === 200 && r.source === 'gemini-ai');
console.log('API_RESPONSES:', JSON.stringify(responses));
console.log('FAILED:', failed, 'GEMINI_USED:', usedGemini);
console.log('BODY_TAIL:', body.slice(-1200).replace(/\s+/g, ' '));
await browser.close();
if (failed || !usedGemini) process.exitCode = 1;

