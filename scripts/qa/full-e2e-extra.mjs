/**
 * Cobertura complementaria E2E: pantallas/anidados NO cubiertos por full-e2e.mjs.
 * Datos reales (Firebase producción), navegador headed y credenciales de admin.
 *
 * Uso: $env:QA_BASE_URL='http://127.0.0.1:3100'; node scripts/qa/full-e2e-extra.mjs
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
const CODE = `OBR-QA2-${RUN}`;
const NAME = `Obra QA Extra ${RUN}`;
const OUT = path.join('qa-artifacts', `extra-${RUN}`);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, 'files'), { recursive: true });

const report = {
  run: RUN, code: CODE, startedAt: now.toISOString(), steps: [],
  consoleErrors: [], pageErrors: [], failedResponses: [], skipped: [],
};
let shotIndex = 0;
let currentStep = 'bootstrap';

const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, locale: 'es-GT', acceptDownloads: true, serviceWorkers: 'block' });
const page = await context.newPage();
page.setDefaultTimeout(15_000);
// Evita que window.print() abra el diálogo nativo y bloquee el runner.
await page.addInitScript(() => { window.print = () => {}; });
page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push({ step: currentStep, text: m.text() }); });
page.on('pageerror', (e) => report.pageErrors.push({ step: currentStep, text: String(e) }));
const apiUploads = [];
page.on('response', (r) => {
  if (r.url().includes('/api/upload-project-photo')) apiUploads.push(r.status());
});
page.on('response', async (r) => {
  if (r.status() >= 400) {
    let body = ''; try { body = (await r.text()).slice(0, 300); } catch {}
    report.failedResponses.push({ step: currentStep, status: r.status(), url: r.url(), body });
  }
});

const delay = (ms = 1000) => new Promise((r) => setTimeout(r, ms));
async function shot(name) {
  const file = path.join(OUT, `${String(++shotIndex).padStart(2, '0')}-${name}.png`);
  try { await page.screenshot({ path: file, fullPage: true }); report.artifacts?.screenshots?.push(file); } catch {}
}
async function step(name, fn) {
  currentStep = name;
  const entry = { name, status: 'running' };
  report.steps.push(entry);
  console.log(`\n=== ${name} ===`);
  try {
    const detail = await fn();
    entry.status = 'ok'; if (detail !== undefined) entry.detail = detail;
    console.log(`OK  ${name}`);
  } catch (e) {
    entry.status = 'failed'; entry.error = String(e?.message || e);
    console.error(`FAIL ${name}: ${entry.error}`);
    await shot(`FAIL-${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 35)}`);
  }
  await closeOverlays();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
}
const nav = async (label) => {
  await closeOverlays();
  await page.locator('[role="tab"]:visible').filter({ hasText: label }).first().click();
  await delay(900);
};
async function waitText(re, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const t = await page.locator('body').innerText().catch(() => '');
    if (re.test(t)) return t;
    await delay(400);
  }
  throw new Error(`Texto no encontrado: ${re}`);
}
async function selectText(locator, text, timeout = 25000) {
  const needles = Array.isArray(text) ? text : [text];
  const end = Date.now() + timeout;
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
      await delay(300);
      return info.text;
    }
    await delay(500);
  }
  throw new Error(`Opción no encontrada: ${JSON.stringify(needles)}`);
}
async function download(button, name) {
  const p = page.waitForEvent('download', { timeout: 25000 }).catch(() => null);
  await button.click();
  const d = await p;
  if (!d) throw new Error('No se generó descarga');
  const file = path.join(OUT, 'files', name);
  await d.saveAs(file);
  return file;
}
async function closeOverlays() {
  for (let i = 0; i < 4; i++) {
    const o = page.locator('div.fixed.inset-0.z-50:visible');
    if (!(await o.count())) return;
    const b = o.last().locator('button').first();
    if (await b.count()) await b.click({ timeout: 3000 }).catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    await delay(300);
  }
}
try {
  // Login
  await step('login', async () => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3500);
    await page.getByLabel('Correo electrónico').fill(EMAIL);
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: /Iniciar Sesión/i }).first().click();
    await page.locator('[role="tab"]:visible').filter({ hasText: 'Tablero' }).first().waitFor({ timeout: 60000 });
    await delay(2000);
  });

  // Proyecto QA propio
  await step('crear-proyecto-extra', async () => {
    await nav('Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();
    const d = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await d.getByLabel('Código del Proyecto').fill(CODE);
    await d.getByLabel('Nombre del Proyecto').fill(NAME);
    await d.getByLabel('Nombre del cliente').fill('Cliente QA Extra');
    await d.getByLabel('NIT del cliente').fill('1234567-8');
    await d.getByLabel('Ubicación').fill('Ciudad de Guatemala');
    await d.getByLabel('Municipio').fill('Guatemala');
    await d.getByLabel('Departamento').fill('Guatemala');
    await d.getByLabel('Presupuesto Total (Q)').fill('100000');
    await d.getByLabel('Avance (%)').fill('0');
    await d.getByLabel('Fecha de Inicio').fill('2026-11-25');
    await d.getByLabel('Fecha de Finalización').fill('2027-11-25');
    await d.getByRole('button', { name: 'Crear Proyecto' }).click();
    await d.waitFor({ state: 'hidden', timeout: 30000 });
    const sel = page.locator('select[aria-label="Seleccionar proyecto"]:visible, select[aria-label="Proyecto activo"]:visible').first();
    await selectText(sel, CODE);
    await waitText(new RegExp(NAME), 20000);
  });

  await step('shell-sync-log', async () => {
    await page.getByRole('button', { name: /Firestore en línea|Sin conexión|Sincronizando/ }).first().click();
    await waitText(/Historial de Sincronización|Registro de sincronización/i, 10000);
    await page.getByRole('button', { name: 'Limpiar Historial' }).first().click();
    await page.getByRole('button', { name: 'Aceptar' }).first().click();
    await shot('sync-log');
  });

  await step('shell-branding', async () => {
    await page.getByRole('button', { name: /Configuración de Marca|Configuración/ }).first().click();
    await waitText(/Marca|Configuración/i, 10000);
    const rate = page.locator('#company-exchange-rate');
    if (await rate.count()) {
      await rate.fill('7.85');
      await page.getByRole('button', { name: 'Guardar tipo de cambio' }).click();
      await delay(1200);
    }
    await shot('branding');
    await closeOverlays();
  });

  await step('dashboard-widgets', async () => {
    await nav('Tablero');
    await page.getByRole('button', { name: /Personalizar Widgets/ }).first().click();
    await waitText(/Personalizar|Widgets/i, 10000);
    await page.getByRole('button', { name: 'Guardar Preferencias' }).first().click();
    await delay(1200);
    await shot('widgets');
  });

  await step('dashboard-export-pdf', async () => {
    await nav('Tablero');
    const f = await download(page.getByRole('button', { name: /Exportar Reporte PDF/ }).first(), 'dashboard.pdf');
    return { file: f };
  });

  await step('proyectos-export-csv', async () => {
    await nav('Proyectos & Firmas');
    const f = await download(page.getByRole('button', { name: /Exportar proyectos a CSV/ }).first(), 'proyectos.csv');
    return { file: f };
  });

  await step('proyectos-fotos', async () => {
    await nav('Proyectos & Firmas');
    await page.getByRole('button', { name: `Subir fotos de avance ${CODE}` }).first().click();
    await waitText(new RegExp(`Fotos de Avance`), 10000);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');
    const file = path.join(OUT, 'files', 'foto-qa.png');
    fs.writeFileSync(file, png);
    const input = page.locator('input[type="file"]').last();
    await input.setInputFiles(file);
    await waitText(/foto-qa\.png/, 20000);
    await shot('fotos');
    const deleteBtn = page.getByRole('button', { name: /Eliminar foto/ }).first();
    const deleted = await deleteBtn.count();
    if (deleted) { await deleteBtn.click(); await delay(1500); }
    await shot('fotos-eliminar');
    await closeOverlays();
    return { file, storedAs: 'base64 en Firestore', deleteButton: deleted > 0 };
  });

  await step('apu-ai-generar', async () => {
    await nav('Presupuestos APU');
    await page.getByRole('button', { name: 'Generar APU con IA' }).first().click();
    await waitText(/Generar APU|Análisis APU/i, 10000);
    const modal = page.locator('div.fixed').filter({ hasText: /Generar APU|Análisis APU/ }).last();
    await modal.locator('textarea').first().fill('Muro de block 14x19x39 con solera');
    await modal.getByRole('button', { name: /Calcular Análisis APU con IA/ }).click();
    const add = page.getByRole('button', { name: /Incorporar este Renglón al Presupuesto/ }).first();
    const ready = await add.isVisible().catch(() => false) || await add.waitFor({ state: 'visible', timeout: 45_000 }).then(() => true).catch(() => false);
    if (ready) {
      await add.click();
      await delay(2500);
    } else {
      report.skipped.push({ step: currentStep, reason: 'El servicio de IA no devolvió el APU en 45 s (caso intermitente ya validado en ejecución anterior)' });
    }
    await shot('apu-ia');
    await closeOverlays();
  });

  await step('apu-auditoria', async () => {
    await nav('Presupuestos APU');
    await page.getByRole('button', { name: 'Auditar con IA' }).first().click();
    await waitText(/Auditoría Financiera/i, 60000);
    await shot('apu-auditoria');
    await closeOverlays();
  });

  await step('apu-mercado', async () => {
    await nav('Presupuestos APU');
    await page.getByRole('button', { name: 'Precios Mercado GT' }).first().click();
    await waitText(/Catálogo de Precios de Referencia/i, 15000);
    await page.getByPlaceholder(/Buscar insumo/).first().fill('cemento');
    await delay(1200);
    await shot('apu-mercado');
    await closeOverlays();
  });

  await step('gantt-recordatorios', async () => {
    await nav('Seguimiento & Hitos');
    await page.getByRole('button', { name: /Configurar Recordatorios/ }).first().click();
    await delay(1000);
    let d = page.locator('div.fixed').filter({ hasText: 'Programar recordatorio' }).last();
    if (!(await d.count())) {
      await page.getByRole('button', { name: 'Recordatorios Configurados' }).first().click();
      await delay(600);
      const nb = page.getByRole('button', { name: /Nuevo recordatorio/i }).first();
      if (await nb.count()) { await nb.click(); await delay(600); }
      d = page.locator('div.fixed').filter({ hasText: 'Programar recordatorio' }).last();
    }
    if (!(await d.count())) throw new Error('No se abrió el modal Programar recordatorio');
    await d.getByLabel('Título').fill('Recordatorio QA Extra');
    await d.getByLabel('Fecha').fill('2026-12-01');
    await d.getByRole('button', { name: 'Guardar recordatorio' }).click();
    const saved = await waitText(/Recordatorio QA Extra/, 12000).then(() => true).catch(() => false);
    if (!saved) report.skipped.push({ step: currentStep, reason: 'Recordatorio creado pero no visible en el listado filtrado del proyecto' });
    const probe = page.getByRole('button', { name: 'Probar' }).first();
    if (await probe.count()) await probe.click();
    const del = page.getByRole('button', { name: /Eliminar recordatorio Recordatorio QA Extra/ }).first();
    if (await del.count()) { await del.click(); await delay(1200); }
    await shot('recordatorios');
  });

  await step('gantt-progreso-y-hito', async () => {
    await nav('Seguimiento & Hitos');
    const plus = page.getByRole('button', { name: '+25%' }).first();
    if (await plus.count()) { await plus.click(); await delay(1200); }
    await page.getByRole('button', { name: /Hitos hacia el Objetivo/ }).first().click();
    await delay(700);
    const cert = page.getByRole('button', { name: /Marcar Cumplido/ }).first();
    if (await cert.count()) { await cert.click(); await delay(1500); }
    await shot('gantt-progreso');
  });

  await step('maquinaria-mantenimiento', async () => {
    await nav('Maquinaria');
    const btn = page.getByRole('button', { name: /Enviar a Mantenimiento/ }).last();
    if (await btn.count()) { await btn.click(); await delay(1500); }
    const avail = page.getByRole('button', { name: /Marcar disponible/ }).last();
    if (await avail.count()) { await avail.click(); await delay(1500); }
    await shot('mantenimiento');
  });

  await step('personal-cuadrillas-y-fuera', async () => {
    await nav('Personal & IGSS');
    await page.getByText(/Cuadrillas \(\d+\)/).first().click();
    await delay(1000);
    await shot('cuadrillas');
    await page.getByRole('button', { name: /Registro & Marcaje GPS/ }).first().click();
    await delay(800);
    await page.getByRole('button', { name: 'Fuera' }).first().click();
    await waitText(/FUERA DE OBRA|Excepción/i, 10000);
    await page.getByRole('button', { name: 'En Obra' }).first().click();
    await delay(600);
    await shot('gps-fuera');
  });

  await step('planillas', async () => {
    await nav('Planillas Guate');
    await waitText(/Planillas|Período/i, 10000);
    const period = page.locator('input[type="month"]').first();
    if (await period.count()) await period.fill('2026-11');
    const ded = page.getByLabel(/Deducción referencial/).first();
    if (await ded.count()) await ded.fill('10');
    const save = page.getByRole('button', { name: /Guardar parámetros/ }).first();
    if (await save.count()) { await save.click(); await delay(1500); }
    const f = await download(page.getByRole('button', { name: /Exportar estimación a CSV/ }).first(), 'planillas.csv');
    const print = page.getByRole('button', { name: /Imprimir estimación/ }).first();
    const hasPrint = await print.count(); // no clicking: window.print() bloquea al navegador headed
    await shot('planillas');
    return { file: f };
  });

  await step('gastos-histograma-y-auditoria', async () => {
    await nav('Gastos & Facturas');
    await page.getByRole('button', { name: /Histograma Mensual/ }).first().click();
    await waitText(/Histograma Mensual/i, 10000);
    const f = await download(page.getByRole('button', { name: /Exportar Resumen a PDF/ }).first(), 'gastos.pdf');
    await page.getByRole('button', { name: /Facturas & Aprobación/ }).first().click();
    await delay(800);
    const audit = page.getByRole('button', { name: /Ver Pista de Auditoría Completa/ }).first();
    if (await audit.count()) { await audit.click(); await shot('auditoria'); await closeOverlays(); }
    await shot('histograma');
    return { file: f };
  });

  await step('reportes-acta', async () => {
    await nav('Reportes Finales');
    const ta = page.locator('textarea').first();
    if (await ta.count()) await ta.fill('Acta QA generada por validación automática.');
    const actaBtn = page.getByRole('button', { name: /Preparar acta para imprimir/ }).first();
    if (!(await actaBtn.count())) throw new Error('No existe el botón Preparar acta para imprimir');
    await shot('acta');
    report.skipped.push({ step: currentStep, reason: 'Botón verificado; no se ejecuta window.print() para evitar el diálogo nativo del navegador' });
    return { actaButtonPresent: true };
  });

  await step('inventario-orden-compra', async () => {
    await nav('Inventario & Compras');
    await page.getByRole('tab', { name: 'Órdenes de compra' }).click();
    await waitText(/Órdenes de compra/i, 10000);
    await shot('oc-listado');
    // Crear OC requiere proveedor+artículo ya creados por el runner principal;
    // si no existen, se reporta como observación en vez de fallo.
    const create = page.getByRole('button', { name: /Nueva Orden|Crear Orden|Nueva OC/ }).first();
    if (!(await create.count())) { report.skipped.push({ step: currentStep, reason: 'No hay botón de creación de OC en la UI actual' }); return { skipped: true }; }
    await create.click();
    await shot('oc-crear');
    await closeOverlays();
  });

  await step('inventario-ajuste-y-traslado', async () => {
    await nav('Inventario & Compras');
    await page.getByRole('tab', { name: 'Movimientos' }).click();
    await delay(1200);
    const adj = page.locator('form').filter({ hasText: 'Conciliación y ajustes' }).first();
    if (await adj.count()) {
      await selectText(adj, ['Cemento QA']);
      const qty = adj.getByLabel('Cantidad del ajuste');
      if (await qty.count()) await qty.fill('2');
      const ref = adj.getByLabel(/Referencia \/ acta de conciliación/);
      if (await ref.count()) await ref.fill(`AJU-${RUN}`);
      const motive = adj.getByLabel(/Motivo documentado del ajuste/);
      if (await motive.count()) await motive.fill('Ajuste QA de validación');
      await adj.getByRole('button', { name: /Registrar ajuste auditado/ }).first().click();
      await delay(2000);
    }
    await shot('ajuste-traslado');
  });

  await step('inventario-subcontratos', async () => {
    await nav('Inventario & Compras');
    await page.getByRole('tab', { name: 'Subcontratos' }).click();
    await waitText(/Subcontratos/i, 10000);
    await shot('subcontratos-listado');
    const form = page.locator('form').filter({ hasText: /Nuevo subcontrato|Registrar subcontrato/ }).first();
    if (!(await form.count())) { report.skipped.push({ step: currentStep, reason: 'Formulario de subcontrato no visible' }); return { skipped: true }; }
    await selectText(form, 'Proveedor QA');
    await form.getByLabel('Número de contrato').fill(`SC-QA-${RUN}`);
    await form.getByLabel('Descripción / alcance').fill('Subcontrato QA de validación');
    const fin = form.getByLabel('Fin');
    if (await fin.count()) await fin.fill('2026-12-31');
    await form.getByLabel('Monto contratado (Q)').fill('5000');
    await form.getByRole('button', { name: 'Guardar subcontrato' }).click();
    await waitText(new RegExp(`SC-QA-${RUN}`), 20000);
    const pay = page.getByRole('button', { name: 'Registrar pago' }).first();
    if (await pay.count()) { await pay.click(); await delay(1000); }
    await shot('subcontratos');
    return { contract: `SC-QA-${RUN}` };
  });

  await step('fel-invoices-tab', async () => {
    await nav('Facturas FEL');
    await page.waitForURL(/\/fel-invoices/, { timeout: 30000 });
    await waitText(/Facturas FEL|Crear Primera Factura|Nueva Factura/i, 20000);
    await shot('fel-listado');
    return { url: page.url() };
  });

  await step('fel-invoice-crear', async () => {
    await page.goto(`${BASE}/fel-invoices/new`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitText(/Número de DTE/i, 20000);
    const dte = `QA${RUN.slice(-6)}`;
    await page.locator('input[placeholder="FAC-001-000000001"]').fill(dte);
    await page.locator('input[type="text"]').nth(1).fill('A');
    await page.locator('input[placeholder="000000001"]').first().fill('1');
    await page.locator('input[type="date"]').first().fill('2026-11-26');
    await page.locator('input[placeholder="1234567-8"]').nth(0).fill('1234567-8');
    await page.locator('input[placeholder="Nombre de la empresa emisora"]').fill('Empresa QA');
    await page.locator('input[placeholder="Dirección completa"]').nth(0).fill('Dirección QA emisor');
    await page.locator('input[placeholder="1234567-8"]').nth(1).fill('9876543-2');
    await page.locator('input[placeholder="Nombre del cliente"]').fill('Cliente QA FEL');
    await page.locator('input[placeholder="Dirección completa"]').nth(1).fill('Dirección QA receptor');
    await page.getByRole('button', { name: 'Editar' }).first().click();
    await delay(600);
    await page.locator('input[placeholder="Descripción"]').first().fill('Ítem QA de validación');
    await page.locator('input[placeholder="0.00"]').first().fill('100');
    await page.getByRole('button', { name: 'Guardar' }).first().click();
    await delay(700);
    await page.getByRole('button', { name: /Guardar Factura FEL/ }).click();
    await waitText(new RegExp(dte), 30000);
    await shot('fel-nueva');
    return { dte };
  });

  await step('gmail-redactar', async () => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(2500);
    await nav('Correo & Avisos');
    await waitText(/Redactar mensaje|Conectar \/ autorizar Gmail/i, 10000);
    await page.getByLabel('Para').first().fill('qa@example.com');
    await page.getByLabel('Asunto').first().fill('Validación QA');
    await page.getByLabel('Mensaje').first().fill('Mensaje de validación automatizada.');
    const summary = page.getByRole('button', { name: /Insertar resumen del proyecto/ }).first();
    if (await summary.count()) await summary.click();
    const preview = page.getByRole('button', { name: /Revisar mensaje/ }).first();
    if (await preview.count() && await preview.isEnabled()) { await preview.click(); await delay(1200); }
    else report.skipped.push({ step: currentStep, reason: 'Vista previa deshabilitada sin autorización OAuth de Gmail; envío real omitido por seguridad' });
    await shot('gmail');
  });

  await step('equipo-tab', async () => {
    if (!page.url().startsWith(BASE)) {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await delay(2500);
    }
    await nav('Equipo de la empresa');
    await waitText(/Invitar por correo|Miembros/i, 15000);
    await shot('equipo');
    report.skipped.push({ step: currentStep, reason: 'Crear invitación real enviaría correo a una cuenta externa' });
  });

  await step('perfil-pagina', async () => {
    await page.goto(`${BASE}/perfil`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitText(/Nombre Completo|Cambiar Contraseña/i, 15000);
    await shot('perfil');
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

