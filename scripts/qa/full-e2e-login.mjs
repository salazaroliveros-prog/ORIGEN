/**
 * Validación completa de la pantalla de login y del flujo OAuth de Google/Gmail
 * contra Firebase real. Comienza en /login (no en el dashboard).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:3100';
const EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';
const OUT = 'qa-artifacts/login-oauth';
fs.mkdirSync(OUT, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  steps: [],
  popups: [],
  skipped: [],
  consoleErrors: [],
  failedResponses: [],
};
let currentStep = 'bootstrap';
const browser = await chromium.launch({
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
const context = await browser.newContext({
  viewport: { width: 1500, height: 950 },
  locale: 'es-GT',
  serviceWorkers: 'block',
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('console', (m) => {
  if (m.type() === 'error') report.consoleErrors.push({ step: currentStep, text: m.text() });
});
page.on('response', (r) => {
  if (r.status() >= 400)
    report.failedResponses.push({ step: currentStep, status: r.status(), url: r.url() });
});

const delay = (ms = 800) => new Promise((r) => setTimeout(r, ms));
async function step(name, fn) {
  currentStep = name;
  const e = { name, status: 'running' };
  report.steps.push(e);
  console.log(`\n=== ${name} ===`);
  try {
    const d = await fn();
    e.status = 'ok';
    if (d !== undefined) e.detail = d;
    console.log(`OK  ${name}`);
  } catch (err) {
    e.status = 'failed';
    e.error = String(err?.message || err);
    console.error(`FAIL ${name}: ${e.error}`);
    await page
      .screenshot({ path: path.join(OUT, `FAIL-${name}.png`), fullPage: true })
      .catch(() => {});
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
}
async function waitText(re, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const t = await page
      .locator('body')
      .innerText()
      .catch(() => '');
    if (re.test(t)) return t;
    await delay(350);
  }
  throw new Error(`Texto no encontrado: ${re}`);
}
async function capturePopup(triggerLabel, timeout = 25000) {
  const [popup] = await Promise.all([
    context.waitForEvent('page', { timeout }).catch(() => null),
    (async () => {
      const btn = page.getByRole('button', { name: triggerLabel }).first();
      if (!(await btn.count())) throw new Error(`No existe el botón ${triggerLabel}`);
      await btn.click();
    })(),
  ]);
  if (!popup) return { opened: false };
  // La página del popup se crea vacía y navega después: esperar la URL real.
  for (let i = 0; i < 30; i += 1) {
    const url = popup.url();
    if (url && url !== 'about:blank') break;
    await delay(500);
  }
  await popup.waitForLoadState('domcontentloaded').catch(() => {});
  await delay(2000);
  const info = {
    opened: true,
    closed: popup.isClosed(),
    url: popup.url(),
    title: await popup.title().catch(() => ''),
    body: (
      await popup
        .locator('body')
        .innerText()
        .catch(() => '')
    )
      .slice(0, 500)
      .replace(/\s+/g, ' '),
  };
  await popup
    .screenshot({
      path: path.join(OUT, `popup-${triggerLabel.replace(/[^a-z0-9]+/gi, '-')}.png`),
      fullPage: true,
    })
    .catch(() => {});
  await popup.close().catch(() => {});
  return info;
}

try {
  await step('cargar-login', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3500);
    await waitText(/Inicia sesión|Iniciar sesión/i);
    for (const label of [
      'Correo electrónico',
      'Contraseña',
      'Recordarme',
      'Iniciar sesión',
      'Continuar con Google',
      '¿Olvidaste tu contraseña?',
      'Regístrate ahora',
    ]) {
      const el = page.getByText(label, { exact: false }).first();
      if (!(await el.count())) throw new Error(`Falta el elemento: ${label}`);
    }
    await page.screenshot({ path: path.join(OUT, '01-login.png'), fullPage: true });
  });

  await step('mostrar-ocultar-password', async () => {
    const input = page.locator('input[type="password"]').first();
    if (!(await input.count())) throw new Error('No hay campo de contraseña');
    const show = page.getByRole('button', { name: 'Mostrar contraseña' }).first();
    if (!(await show.count())) throw new Error('No hay botón Mostrar contraseña');
    await show.click();
    await page.locator('input[type="text"]').first().waitFor({ state: 'visible', timeout: 5000 });
    const hide = page.getByRole('button', { name: 'Ocultar contraseña' }).first();
    if (!(await hide.count())) throw new Error('No aparece Ocultar contraseña');
    await hide.click();
    await page
      .locator('input[type="password"]')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 });
  });

  await step('olvide-password-validacion', async () => {
    const forgot = page.getByRole('button', { name: /¿Olvidaste tu contraseña\?/ }).first();
    if (await forgot.isEnabled())
      throw new Error('El botón debería estar deshabilitado sin correo');
    await page.getByLabel('Correo electrónico').fill('correo-invalido');
    await forgot.click();
    await waitText(/correo|válid/i);
    // No se envía el correo real: solo se valida la rama de error de validación.
  });

  await step('link-registro', async () => {
    await page
      .getByRole('link', { name: /Regístrate ahora/ })
      .first()
      .click();
    await page.waitForURL(/\/signup/, { timeout: 20000 });
    await waitText(/Crear Cuenta/i);
    await page.screenshot({ path: path.join(OUT, '02-signup.png'), fullPage: true });
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await delay(2500);
  });

  await step('signup-validacion', async () => {
    await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(2500);
    for (const label of [
      'Nombre Completo',
      'Correo Electrónico',
      'Empresa',
      'Teléfono',
      'Contraseña',
      'Confirmar Contraseña',
    ]) {
      const el = page.getByLabel(label, { exact: false }).first();
      if (!(await el.count())) throw new Error(`Falta el campo ${label}`);
    }
    const terms = page.getByRole('checkbox').first();
    if (!(await terms.count())) throw new Error('Falta aceptar términos');
    const signups = [];
    page.on('response', (r) => {
      if (r.url().includes('accounts:signUp')) signups.push(r.status());
    });
    await page.getByRole('button', { name: 'Crear Cuenta' }).first().click();
    await delay(2000);
    await waitText(/requerido|obligatorio|válid|acept/i);
    if (signups.length) throw new Error('Se envió un alta de usuario real durante la validación');
    await page.screenshot({ path: path.join(OUT, '03-signup-validacion.png'), fullPage: true });
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await delay(2000);
  });

  await step('login-recordarme', async () => {
    await page.getByLabel('Correo electrónico').fill(EMAIL);
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
    const remember = page.getByLabel('Recordarme').first();
    await remember.check();
    await page
      .getByRole('button', { name: /Iniciar Sesión/i })
      .first()
      .click();
    await page
      .locator('[role="tab"]:visible')
      .filter({ hasText: 'Tablero' })
      .first()
      .waitFor({ timeout: 60000 });
    const stored = await page.evaluate(() => localStorage.getItem('constructerp_remember_email'));
    if (stored !== EMAIL) throw new Error(`Recordarme no guardó el correo (${stored})`);
    return { remembered: stored };
  });

  await step('onboarding-validacion', async () => {
    // La página redirige al dashboard si ya hay sesión: usar contexto limpio.
    const ctx3 = await browser.newContext({
      viewport: { width: 1400, height: 900 },
      locale: 'es-GT',
    });
    const p3 = await ctx3.newPage();
    await p3.goto(`${BASE}/onboarding/empresa`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);
    if (/\/login/.test(p3.url())) {
      report.skipped.push({
        step: currentStep,
        reason: 'Onboarding redirige a /login sin sesión; no es alcanzable en este estado',
      });
      await ctx3.close();
      return { redirected: true };
    }
    for (const placeholder of [
      'Ej. Construcciones García S.A.',
      'Ej. Construcciones García, S.A.',
      'Ej. 1234567-8',
      '+502 1234-5678',
      'Ej. 12 Avenida 12-34, Zona 10, Ciudad de Guatemala',
      'empresa@correo.com',
    ]) {
      const el = p3.getByPlaceholder(placeholder).first();
      if (!(await el.count())) throw new Error(`Falta el campo ${placeholder}`);
    }
    const btn = p3.getByRole('button', { name: 'Crear Empresa y Continuar' }).first();
    if (!(await btn.count())) throw new Error('Falta el botón de crear empresa');
    await p3.screenshot({ path: path.join(OUT, '04-onboarding.png'), fullPage: true });
    // No se envía: crearía una empresa real en producción.
    report.skipped.push({
      step: currentStep,
      reason: 'Formulario verificado; no se envía para no crear una empresa real',
    });
    await ctx3.close();
  });

  await step('logout', async () => {
    await page.getByRole('button', { name: 'Cerrar sesión' }).first().click();
    await page.waitForURL(/\/login$/, { timeout: 30000 });
    await delay(2000);
  });

  await step('login-sin-recordarme', async () => {
    await page.getByLabel('Correo electrónico').fill(EMAIL);
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Recordarme').first().uncheck();
    await page
      .getByRole('button', { name: /Iniciar Sesión/i })
      .first()
      .click();
    await page
      .locator('[role="tab"]:visible')
      .filter({ hasText: 'Tablero' })
      .first()
      .waitFor({ timeout: 60000 });
    const stored = await page.evaluate(() => localStorage.getItem('constructerp_remember_email'));
    if (stored) throw new Error('Recordarme=no no borró el correo recordado');
  });

  await step('google-login-popup', async () => {
    await page.getByRole('button', { name: 'Cerrar sesión' }).first().click();
    await page.waitForURL(/\/login$/, { timeout: 30000 });
    await delay(1500);
    const info = await capturePopup('Continuar con Google');
    report.popups.push({ flow: 'google-login', ...info });
    if (!info.opened) throw new Error('No se abrió el popup de Google');
    if (!/accounts\.google\.com|google\.com/.test(info.url)) {
      throw new Error(`El popup no fue a Google: ${info.url}`);
    }
    return info;
  });

  await step('gmail-oauth-popup', async () => {
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
      .filter({ hasText: 'Correo & Avisos' })
      .first()
      .click();
    await waitText(/Conectar \/ autorizar Gmail|Renovar permiso Gmail/i, 10000);
    const btnName = (await page.getByRole('button', { name: 'Conectar / autorizar Gmail' }).count())
      ? 'Conectar / autorizar Gmail'
      : 'Renovar permiso Gmail';
    const info = await capturePopup(btnName);
    report.popups.push({ flow: 'gmail-oauth', ...info });
    if (!info.opened) throw new Error('No se abrió el popup de autorización de Gmail');
    return info;
  });

  report.status = 'completed';
} catch (e) {
  report.status = 'failed';
  report.failure = String(e?.stack || e);
} finally {
  report.summary = {
    steps: report.steps.length,
    ok: report.steps.filter((s) => s.status === 'ok').length,
    failed: report.steps.filter((s) => s.status === 'failed').length,
    consoleErrors: report.consoleErrors.length,
    failedResponses: report.failedResponses.length,
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\nSUMMARY:', JSON.stringify(report.summary));
  await browser.close();
}
