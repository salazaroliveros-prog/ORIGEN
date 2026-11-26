import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:3100';
const ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-EBE081ELJT';
const OUT = 'qa-artifacts/analytics';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();
const gtm = [];
page.on('response', (r) => {
  if (r.url().includes('googletagmanager.com') || r.url().includes('google-analytics.com')) {
    gtm.push({ status: r.status(), url: r.url().split('?')[0] });
  }
});
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
const state1 = await page.evaluate(() => ({
  hasGtag: typeof window.gtag === 'function',
  dataLayer: (window.dataLayer || []).filter((e) => e && e[0] === 'config').map((e) => ({ id: e[1], page: e[2]?.page_path })),
  script: !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]'),
}));
await page.getByRole('link', { name: /Regístrate ahora/ }).first().click();
await page.waitForTimeout(4000);
const state2 = await page.evaluate(() => ({
  path: location.pathname,
  configs: (window.dataLayer || []).filter((e) => e && e[0] === 'config').length,
  last: (window.dataLayer || []).filter((e) => e && e[0] === 'config').slice(-1)[0],
}));
await page.screenshot({ path: `${OUT}/analytics.png`, fullPage: true });
console.log('ID:', ID);
console.log('INITIAL:', JSON.stringify(state1));
console.log('AFTER_NAV:', JSON.stringify(state2));
console.log('NETWORK:', JSON.stringify(gtm.slice(0, 6)));
console.log('CONSOLE_ERRORS:', JSON.stringify(errors.slice(0, 5)));
await browser.close();

