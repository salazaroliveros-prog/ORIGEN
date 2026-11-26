/**
 * Cobertura fina E2E: controles anidados y opciones no cubiertas por los
 * runners full-e2e.mjs / full-e2e-extra.mjs. Datos reales, navegador headed.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:3100';
const EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const RUN = `${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const CODE = `OBR-QA3-${RUN}`;
const NAME = `Obra QA Fina ${RUN}`;
const OUT = path.join('qa-artifacts', `fine-${RUN}`);
fs.mkdirSync(path.join(OUT, 'files'), { recursive: true });

const report = { run: RUN, code: CODE, startedAt: now.toISOString(), steps: [], skipped: [], consoleErrors: [], pageErrors: [], failedResponses: [] };
let shotIndex = 0;
let currentStep = 'bootstrap';

const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, locale: 'es-GT', acceptDownloads: true, serviceWorkers: 'block' });
const page = await context.newPage();
page.setDefaultTimeout(12_000);
await page.addInitScript(() => { window.print = () => {}; });
page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push({ step: currentStep, text: m.text() }); });
page.on('pageerror', (e) => report.pageErrors.push({ step: currentStep, text: String(e) }));
page.on('response', (r) => { if (r.status() >= 400) report.failedResponses.push({ step: currentStep, status: r.status(), url: r.url() }); });
page.on('dialog', (d) => d.accept().catch(() => {}));

const delay = (ms = 900) => new Promise((r) => setTimeout(r, ms));
async function shot(name) {
  const file = path.join(OUT, `${String(++shotIndex).padStart(2, '0')}-${name}.png`);
  try { await page.screenshot({ path: file, fullPage: true }); } catch {}
}
async function step(name, fn) {
  currentStep = name;
  const e = { name, status: 'running' };
  report.steps.push(e);
  console.log(`\n=== ${name} ===`);
  try {
    const detail = await fn();
    e.status = 'ok'; if (detail !== undefined) e.detail = detail;
    console.log(`OK  ${name}`);
  } catch (err) {
    e.status = 'failed'; e.error = String(err?.message || err);
    console.error(`FAIL ${name}: ${e.error}`);
    await shot(`FAIL-${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 32)}`);
  }
  await closeOverlays();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
}
async function closeOverlays() {
  for (let i = 0; i < 4; i++) {
    const o = page.locator('div.fixed.inset-0.z-50:visible');
    if (!(await o.count())) return;
    const b = o.last().locator('button').first();
    if (await b.count()) await b.click({ timeout: 2500 }).catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    await delay(250);
  }
}
const nav = async (label) => {
  await closeOverlays();
  await page.locator('[role="tab"]:visible').filter({ hasText: label }).first().click();
  await delay(800);
};
async function waitText(re, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const t = await page.locator('body').innerText().catch(() => '');
    if (re.test(t)) return t;
    await delay(350);
  }
  throw new Error(`Texto no encontrado: ${re}`);
}
async function selectText(locator, text) {
  const needles = Array.isArray(text) ? text : [text];
  const end = Date.now() + 20000;
  while (Date.now() < end) {
    const info = await locator.evaluate((root, ns) => {
      const sels = root.tagName === 'SELECT' ? [root] : Array.from(root.querySelectorAll('select'));
      for (let i = 0; i < sels.length; i++) {
        const opt = Array.from(sels[i].options).find((o) => ns.every((n) => (o.textContent || '').includes(n)));
        if (opt) return { value: opt.value, text: opt.textContent, isRoot: root.tagName === 'SELECT', i };
      }
      return null;
    }, needles).catch(() => null);
    if (info?.value) {
      if (info.isRoot) await locator.selectOption(info.value);
      else await locator.locator('select').nth(info.i).selectOption(info.value);
      await delay(250);
      return info.text;
    }
    await delay(400);
  }
  throw new Error(`Opción no encontrada: ${JSON.stringify(needles)}`);
}
async function download(btn, name) {
  const p = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await btn.click();
  const d = await p;
  if (!d) throw new Error('No se generó descarga');
  const file = path.join(OUT, 'files', name);
  await d.saveAs(file);
  return file;
}

try {
  await step('login', async () => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3500);
    await page.getByLabel('Correo electrónico').fill(EMAIL);
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: /Iniciar Sesión/i }).first().click();
    await page.locator('[role="tab"]:visible').filter({ hasText: 'Tablero' }).first().waitFor({ timeout: 60000 });
  });

  await step('proyecto-qa-fino', async () => {
    await nav('Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();
    const d = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await d.getByLabel('Código del Proyecto').fill(CODE);
    await d.getByLabel('Nombre del Proyecto').fill(NAME);
    await d.getByLabel('Nombre del cliente').fill('Cliente QA Fino');
    await d.getByLabel('NIT del cliente').fill('1234567-8');
    await d.getByLabel('Teléfono del cliente').fill('5555-1234');
    await d.getByLabel('Email del cliente').fill('cliente@qa.com');
    await d.getByLabel('Dirección del cliente').fill('Zona 1, Guatemala');
    await d.getByLabel('Ubicación').fill('Ciudad de Guatemala');
    await d.getByLabel('Municipio').fill('Guatemala');
    await d.getByLabel('Departamento').fill('Guatemala');
    await d.getByLabel('Presupuesto Total (Q)').fill('200000');
    await d.getByLabel('Avance (%)').fill('0');
    await d.getByLabel('Latitud').fill('14.6349');
    await d.getByLabel('Longitud').fill('-90.5069');
    await d.getByLabel('Margen de Utilidad Esperado (%)').fill('18');
    await d.getByLabel('Fecha de Inicio').fill('2026-11-25');
    await d.getByLabel('Fecha de Finalización').fill('2027-11-25');
    await d.getByRole('button', { name: 'Crear Proyecto' }).click();
    await d.waitFor({ state: 'hidden', timeout: 30000 });
    const sel = page.locator('select[aria-label="Seleccionar proyecto"]:visible, select[aria-label="Proyecto activo"]:visible').first();
    await selectText(sel, CODE);
    await waitText(new RegExp(NAME));
  });

  await step('sync-filtros', async () => {
    await page.getByRole('button', { name: /Firestore en línea|Sin conexión|Sincronizando/ }).first().click();
    await page.getByPlaceholder(/Buscar por colección/).first().fill('projects');
    await page.getByRole('button', { name: /Exitosos/ }).first().click();
    await page.getByRole('button', { name: /En Proceso/ }).first().click();
    await page.getByRole('button', { name: 'Forzar Resincronización' }).first().click();
    await delay(1200);
    await shot('sync-filtros');
  });

  await step('branding-colores', async () => {
    await page.getByRole('button', { name: /Configuración de Marca|Configuración/ }).first().click();
    await waitText(/Marca|Configuración/i);
    const colors = page.locator('input[type="color"]');
    if (await colors.count()) {
      await colors.nth(0).fill('#123456');
      await colors.nth(1).fill('#abcdef');
    }
    const name = page.getByPlaceholder('Nombre de la empresa');
    if (await name.count()) await name.fill('WM Proyectos QA');
    const apply = page.getByRole('button', { name: 'Aplicar a Toda la App' }).first();
    if (await apply.count()) { await apply.click(); await delay(1000); }
    await shot('branding-colores');
  });

  await step('dashboard-filtros', async () => {
    await nav('Tablero');
    const filter = page.locator('#project-status-filter');
    if (await filter.count()) await filter.selectOption('En Ejecución');
    await page.getByRole('button', { name: /Personalizar Widgets/ }).first().click();
    const high = page.getByRole('button', { name: /Alta Prioridad/ }).first();
    if (await high.count()) await high.click();
    const all = page.getByRole('button', { name: /Todos Visibles/ }).first();
    if (await all.count()) await all.click();
    await page.getByRole('button', { name: 'Guardar Preferencias' }).first().click();
    const hide = page.getByRole('button', { name: /Ocultar widget/ }).first();
    if (await hide.count()) { await hide.click(); await delay(800); }
    await shot('dashboard-filtros');
  });

  await step('proyectos-paginacion-y-edicion', async () => {
    await nav('Proyectos & Firmas');
    const show = page.getByText('Mostrar').locator('..').locator('select').first();
    if (await show.count()) await show.selectOption('archived');
    if (await show.count()) await show.selectOption('active');
    const paging = page.getByRole('navigation', { name: 'Paginación de proyectos' });
    if (await paging.count()) {
      const next = paging.getByRole('button').nth(1);
      if (await next.count()) await next.click();
      await delay(600);
    }
    await page.getByRole('button', { name: `Editar proyecto ${CODE}` }).first().click();
    const d = page.getByRole('dialog', { name: 'Editar Proyecto' });
    await d.getByLabel('Teléfono del cliente').fill('5555-9999');
    await d.getByLabel('Email del cliente').fill('cliente2@qa.com');
    await d.getByLabel('Dirección del cliente').fill('Zona 2, Guatemala');
    await d.getByLabel('Margen de Utilidad Esperado (%)').fill('20');
    await d.getByRole('button', { name: 'Cancelar' }).click();
    await shot('proyectos-edicion');
  });

  await step('apu-recalc-e-inspect', async () => {
    await nav('Presupuestos APU');
    const dept = page.locator('select').filter({ has: page.locator('option[value="Guatemala"]') }).first();
    if (await dept.count()) await dept.selectOption('Guatemala');
    const recalc = page.getByRole('button', { name: /Actualizar Costos a/ }).first();
    if (await recalc.count()) { await recalc.click(); await delay(1500); }
    await page.getByRole('button', { name: 'Renglón Manual' }).first().click();
    await page.locator('input[name="code"]').fill('99.99');
    await page.locator('input[name="unit"]').fill('m2');
    await page.locator('input[name="desc"]').fill('Renglón QA fino');
    await page.locator('input[name="qty"]').fill('10');
    await page.locator('input[name="matCost"]').fill('10');
    await page.getByRole('button', { name: 'Guardar Renglón APU' }).click();
    await waitText(/99\.99/);
    const row = page.locator('tr').filter({ hasText: '99.99' }).first();
    if (await row.count()) { await row.getByRole('button').first().click(); await delay(900); }
    await shot('apu-inspect');
    await closeOverlays();
  });

  await step('cotizaciones-extra', async () => {
    await nav('Cotizaciones');
    await page.getByPlaceholder('Buscar por cliente, NIT o código…').first().fill('Cliente QA');
    const status = page.locator('select').filter({ has: page.locator('option[value="Rechazada"]') }).first();
    if (await status.count()) {
      await selectText(status, 'Aceptada');
      await selectText(status, 'Todos los Estados');
    }
    await page.getByRole('button', { name: 'Nueva Cotización Rápida' }).first().click();
    await waitText(/Generador Rápido de Cotizaciones/);
    const modal = page.locator('div.fixed').filter({ has: page.locator('input[name="clientName"]') }).last();
    await modal.locator('input[name="clientName"]').fill('Cliente QA Fino');
    await modal.locator('input[placeholder="Ej. 8492019-2 o CF"]').fill('1234567-8');
    await modal.getByRole('button', { name: /Aplicar|Usar esta plantilla/ }).first().click().catch(() => {});
    await modal.getByRole('button', { name: 'Guardar Borrador' }).click();
    await waitText(/Cliente QA Fino/);
    const pdf = page.getByRole('button', { name: 'Descargar PDF' }).first();
    if (await pdf.count()) await download(pdf, 'cotizacion-qa.pdf');
    await shot('cotizaciones-extra');
  });

  await step('gantt-extra', async () => {
    await nav('Seguimiento & Hitos');
    const sound = page.getByRole('button', { name: 'Verificar Timbre Sonoro' }).first();
    if (await sound.count()) await sound.click();
    await page.getByPlaceholder('Buscar por tarea, fase o responsable…').first().fill('Fundición');
    for (const t of ['Filtrar en ejecución', 'Filtrar completadas', 'Filtrar ruta crítica']) {
      const b = page.getByTitle(t).first();
      if (await b.count()) { await b.click(); await delay(300); }
    }
    const complete = page.getByTitle('Marcar como completada al 100%').first();
    if (await complete.count()) { await complete.click(); await delay(800); }
    await shot('gantt-extra');
  });

  await step('gastos-extra', async () => {
    await nav('Gastos & Facturas');
    const pend = page.getByRole('button', { name: /Pendientes de Aprobación PM/ }).first();
    if (await pend.count()) await pend.click();
    const aprob = page.getByRole('button', { name: /Aprobados \(/ }).first();
    if (await aprob.count()) await aprob.click();
    const mod = page.getByRole('button', { name: 'Modificar' }).first();
    if (await mod.count()) { await mod.click(); await waitText(/Aprobación de Gasto/); await shot('gasto-modificar'); }
  });

  await step('inventario-oc-completa', async () => {
    await nav('Inventario & Compras');
    await page.getByRole('tab', { name: 'Órdenes de compra' }).click();
    await waitText(/Órdenes de compra/);
    const create = page.getByRole('button', { name: 'Crear borrador de OC' }).first();
    if (!(await create.count())) { report.skipped.push({ step: currentStep, reason: 'Botón Crear borrador de OC no visible' }); return; }
    await create.click();
    const form = page.locator('form').filter({ hasText: /Proyecto|Proveedor|Artículo/ }).last();
    await shot('oc-form');
    await closeOverlays();
  });

  await step('inventario-transferencia', async () => {
    await nav('Inventario & Compras');
    await page.getByRole('tab', { name: 'Movimientos' }).click();
    await delay(1000);
    const form = page.locator('form').filter({ hasText: 'Trasladar entre bodegas' }).first();
    if (!(await form.count())) { report.skipped.push({ step: currentStep, reason: 'Formulario de traslado no visible' }); return; }
    await selectText(form, ['Cemento QA']);
    const dest = form.getByLabel('Bodega de destino');
    const destValue = await dest.evaluate((sel) => {
      const options = Array.from(sel.options).filter((o) => o.value);
      const chosen = options.find((o) => o.value !== (sel.querySelector('option:checked')?.value ?? ''));
      return chosen?.value ?? options[0]?.value ?? null;
    }).catch(() => null);
    if (destValue) await dest.selectOption(destValue);
    await form.getByLabel('Cantidad a trasladar').fill('1');
    await form.getByLabel(/Número \/ referencia del traslado/).fill(`TRA-${RUN}`);
    const transferBtn = form.getByRole('button', { name: 'Confirmar traslado' });
    if (!(await transferBtn.isEnabled())) {
      report.skipped.push({ step: currentStep, reason: 'No hay segunda bodega con existencias para completar el traslado' });
      return { skipped: true };
    }
    await transferBtn.click();
    await delay(2000);
    await shot('traslado');
  });

  await step('reportes-extra', async () => {
    await nav('Reportes Finales');
    const sel = page.locator('select').first();
    if (await sel.count()) await selectText(sel, CODE);
    const print = page.getByRole('button', { name: /Imprimir \/ Guardar PDF/ }).first();
    const acta = page.getByRole('button', { name: /Preparar acta para imprimir/ }).first();
    const hasPrint = await print.count();
    const hasActa = await acta.count();
    if (!hasPrint || !hasActa) throw new Error('Faltan botones de impresión en Reportes');
    report.skipped.push({ step: currentStep, reason: 'Botones de impresión verificados; no se ejecuta window.print() (diálogo nativo)' });
    await shot('reportes-extra');
  });

  await step('fel-list-extra', async () => {
    await nav('Facturas FEL');
    await page.waitForURL(/\/fel-invoices/);
    await page.getByPlaceholder('Buscar por DTE, serie, NIT, nombre…').fill('QA');
    await delay(1000);
    const view = page.getByRole('button', { name: 'Ver' }).first();
    if (await view.count()) { await view.click(); await delay(1000); }
    await shot('fel-list-extra');
  });

  await step('perfil-campos', async () => {
    await page.goto(`${BASE}/perfil`, { waitUntil: 'domcontentloaded' });
    await waitText(/NOMBRE COMPLETO/i);
    const name = page.getByPlaceholder('Tu nombre completo').first();
    if (await name.count()) await name.fill('Admin QA');
    const phone = page.getByPlaceholder(/Teléfono/).first();
    if (await phone.count()) await phone.fill('5555-0000');
    const save = page.getByRole('button', { name: 'Guardar Cambios' }).first();
    if (await save.count()) { await save.click(); await delay(1200); }
    await shot('perfil-campos');
  });

  await step('login-extra-controles', async () => {
    const ctx2 = await browser.newContext({ viewport: { width: 900, height: 800 }, locale: 'es-GT' });
    const p2 = await ctx2.newPage();
    await p2.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(2500);
    const show = p2.getByRole('button', { name: 'Mostrar contraseña' }).first();
    if (await show.count()) await show.click();
    const remember = p2.getByLabel('Recordarme').first();
    if (await remember.count()) await remember.check();
    await p2.screenshot({ path: path.join(OUT, 'login-extra.png'), fullPage: true });
    await ctx2.close();
  });

  report.status = 'completed';
} catch (e) {
  report.status = 'failed'; report.failure = String(e?.stack || e);
} finally {
  report.finishedAt = new Date().toISOString();
  report.summary = {
    steps: report.steps.length,
    ok: report.steps.filter((s) => s.status === 'ok').length,
    failed: report.steps.filter((s) => s.status === 'failed').length,
    skipped: report.skipped.length,
    consoleErrors: report.consoleErrors.length,
    pageErrors: report.pageErrors.length,
    failedResponses: report.failedResponses.length,
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\nREPORT:', path.join(OUT, 'report.json'));
  console.log('SUMMARY:', JSON.stringify(report.summary));
  await browser.close();
}

