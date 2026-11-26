import { chromium } from 'playwright';
const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:3100';
const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'es-GT' });
const page = await context.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)); });
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
const events = [];
context.on('page', (p) => {
  console.log('POPUP CREATED:', p.url());
  p.on('framenavigated', (f) => events.push(`NAV ${f.url()}`));
  p.on('close', () => events.push('CLOSE'));
  p.on('console', (m) => events.push(`POPUP_CONSOLE ${m.type()}: ${m.text().slice(0, 160)}`));
});
await page.getByRole('button', { name: 'Continuar con Google' }).first().click();
await page.waitForTimeout(10000);
console.log('EVENTS:', JSON.stringify(events, null, 2));
console.log('MAIN BODY TAIL:', (await page.locator('body').innerText()).slice(-700).replace(/\s+/g, ' '));
await page.screenshot({ path: 'qa-artifacts/login-oauth/probe-google-main.png', fullPage: true });
await browser.close();

