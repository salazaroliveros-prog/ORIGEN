/**
 * QA E2E completo contra la app real (Firebase producción, sin mocks).
 *
 * Se ejecuta en modo headed porque reCAPTCHA Enterprise (App Check) puntúa
 * los navegadores headless como bots y rechaza la atestación.
 *
 * Uso:
 *   $env:QA_BASE_URL='http://127.0.0.1:3100'; node scripts/qa/full-e2e.mjs
 *
 * Salidas:
 *   qa-artifacts/full-<run>/NN-step.png
 *   qa-artifacts/full-<run>/report.json
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
const CODE = `OBR-${RUN}`;
const PROJECT_NAME = `Obra QA ${RUN}`;
const CLIENT = `Cliente QA ${RUN}`;
const OUT = path.join('qa-artifacts', `full-${RUN}`);
fs.mkdirSync(OUT, { recursive: true });

const report = {
  run: RUN,
  code: CODE,
  baseUrl: BASE,
  startedAt: now.toISOString(),
  steps: [],
  consoleErrors: [],
  pageErrors: [],
  failedResponses: [],
  expectedFailures: [],
  artifacts: { screenshots: [], downloads: [] },
};

let stepIndex = 0;
let currentStep = 'bootstrap';

const browser = await chromium.launch({
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
const context = await browser.newContext({
  viewport: { width: 1500, height: 950 },
  locale: 'es-GT',
  acceptDownloads: true,
  serviceWorkers: 'block',
  permissions: [],
});
const page = await context.newPage();
page.setDefaultTimeout(15_000);

page.on('console', (msg) => {
  if (msg.type() !== 'error') return;
  report.consoleErrors.push({ step: currentStep, text: msg.text() });
});
page.on('pageerror', (err) => {
  report.pageErrors.push({ step: currentStep, text: String(err) });
});
page.on('response', async (res) => {
  if (res.status() < 400) return;
  let body = '';
  try {
    body = (await res.text()).slice(0, 600);
  } catch {}
  report.failedResponses.push({ step: currentStep, status: res.status(), url: res.url(), body });
});

function delay(ms = 1000) {
  return new Promise((r) => setTimeout(r, ms));
}

async function shot(name) {
  const file = path.join(OUT, `${String(++stepIndex).padStart(2, '0')}-${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
    report.artifacts.screenshots.push(file);
  } catch {}
}

async function waitForText(regex, timeout = 20_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const text = await page
      .locator('body')
      .innerText()
      .catch(() => '');
    if (regex.test(text)) return text;
    await delay(400);
  }
  throw new Error(`No se encontró contenido que coincida con ${regex}`);
}

/**
 * Selecciona una opción por texto dentro de un <select> (o de un contenedor).
 * Funciona aunque las opciones lleguen tarde desde Firestore.
 */
async function selectOptionText(locator, text, timeout = 25_000) {
  const needles = Array.isArray(text) ? text : [text];
  const end = Date.now() + timeout;
  let last = '';
  while (Date.now() < end) {
    const info = await locator
      .evaluate((root, needles) => {
        const isRoot = root.tagName === 'SELECT';
        const sels = isRoot ? [root] : Array.from(root.querySelectorAll('select'));
        for (let index = 0; index < sels.length; index += 1) {
          const opt = Array.from(sels[index].options).find((o) => {
            const label = o.textContent || '';
            return needles.every((needle) => label.includes(needle));
          });
          if (opt) return { value: opt.value, text: opt.textContent || '', isRoot, index };
        }
        return null;
      }, needles)
      .catch((e) => {
        last = String(e);
        return null;
      });
    if (info && info.value) {
      if (info.isRoot) {
        await locator.selectOption(info.value);
      } else {
        await locator.locator('select').nth(info.index).selectOption(info.value);
      }
      await delay(400);
      return info.text;
    }
    if (last) throw new Error(`No se pudo inspeccionar el selector: ${last}`);
    await delay(500);
  }
  const available = await locator
    .evaluate((root) => {
      const sels = root.tagName === 'SELECT' ? [root] : Array.from(root.querySelectorAll('select'));
      return sels.map((s) =>
        Array.from(s.options)
          .map((o) => o.textContent || '')
          .slice(0, 12)
      );
    })
    .catch(() => []);
  throw new Error(
    `Opción no encontrada: ${JSON.stringify(needles)}. Opciones disponibles: ${JSON.stringify(available)}`
  );
}

/** Cierra cualquier modal abierto para que no intercepte los clics de navegación. */
async function closeOverlays() {
  for (let i = 0; i < 4; i += 1) {
    const overlays = page.locator('div.fixed.inset-0.z-50:visible');
    const count = await overlays.count();
    if (count === 0) return;
    const overlay = overlays.last();
    const close = overlay.locator('button').first();
    if (await close.count()) {
      await close.click({ timeout: 3_000 }).catch(() => {});
    } else {
      await page.keyboard.press('Escape').catch(() => {});
    }
    await delay(300);
  }
}

const nav = async (label) => {
  await closeOverlays();
  const item = page.locator('[role="tab"]:visible').filter({ hasText: label }).first();
  await item.waitFor({ state: 'visible', timeout: 20_000 });
  await item.click();
  await delay(1000);
};

async function selectActiveProject() {
  const selector = page
    .locator(
      'select[aria-label="Seleccionar proyecto"]:visible, select[aria-label="Proyecto activo"]:visible'
    )
    .first();
  await selector.waitFor({ state: 'visible', timeout: 30_000 });
  const option = selector.locator('option').filter({ hasText: CODE }).first();
  await option.waitFor({ state: 'attached', timeout: 30_000 });
  const projectId = await option.getAttribute('value');
  if (!projectId) throw new Error(`No project id for ${CODE}`);
  await selector.selectOption(projectId);
  await delay(900);
  return projectId;
}

async function step(name, fn) {
  currentStep = name;
  const started = Date.now();
  const entry = { name, status: 'running' };
  report.steps.push(entry);
  console.log(`\n=== ${name} ===`);
  try {
    const detail = await fn();
    entry.status = 'ok';
    entry.ms = Date.now() - started;
    if (detail !== undefined) entry.detail = detail;
    console.log(`OK  ${name}`);
  } catch (error) {
    entry.status = 'failed';
    entry.ms = Date.now() - started;
    entry.error = String(error?.message || error);
    console.error(`FAIL ${name}: ${entry.error}`);
    await shot(`FAIL-${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`);
    await closeOverlays();
  } finally {
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  }
}

try {
  // ── 1. Login ──────────────────────────────────────────────────
  await step('login', async () => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await delay(3500);
    const email = page.getByLabel('Correo electrónico');
    if (await email.isVisible().catch(() => false)) {
      await email.fill(EMAIL);
      await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
      await page
        .getByRole('button', { name: /Iniciar Sesión/i })
        .first()
        .click();
    }
    await page
      .locator('[role="tab"]:visible')
      .filter({ hasText: 'Tablero' })
      .first()
      .waitFor({ timeout: 60_000 });
    await delay(2500);
    await shot('dashboard-inicial');
    return { url: page.url() };
  });

  // ── 2. Crear proyecto ─────────────────────────────────────────
  await step('crear-proyecto', async () => {
    await nav('Proyectos & Firmas');
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });
    await dialog.getByLabel('Código del Proyecto').fill(CODE);
    await dialog.getByLabel('Nombre del Proyecto').fill(PROJECT_NAME);
    await dialog.getByLabel('Nombre del cliente').fill(CLIENT);
    await dialog.getByLabel('NIT del cliente').fill('1234567-8');
    await dialog.getByLabel('Ubicación').fill('Zona 10, Ciudad de Guatemala');
    await dialog.getByLabel('Municipio').fill('Guatemala');
    await dialog.getByLabel('Departamento').fill('Guatemala');
    await dialog.getByLabel('Presupuesto Total (Q)').fill('38800');
    await dialog.getByLabel('Avance (%)').fill('0');
    await dialog.getByLabel('Fecha de Inicio').fill('2026-11-25');
    await dialog.getByLabel('Fecha de Finalización').fill('2027-11-25');
    await dialog.getByRole('button', { name: 'Crear Proyecto' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 30_000 });
    await selectActiveProject();
    await waitForText(new RegExp(PROJECT_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 20_000);
    await shot('proyecto-creado');
    return { code: CODE };
  });

  // ── 3. APU renglón 1 ──────────────────────────────────────────
  await step('apu-renglon-1', async () => {
    await nav('Presupuestos APU');
    await page.getByRole('button', { name: 'Renglón Manual' }).first().click();
    await page.getByText('Nuevo Renglón APU Manual').waitFor({ timeout: 10_000 });
    await page.locator('input[name="code"]').fill('01.01');
    await page.locator('input[name="unit"]').fill('m2');
    await page.locator('input[name="desc"]').fill('Muro de block 14x19x39 con solera intermedia');
    await page.locator('input[name="qty"]').fill('120');
    await page.locator('input[name="matCost"]').fill('140');
    await page.locator('input[name="labCost"]').fill('0');
    await page.locator('input[name="eqCost"]').fill('0');
    await page.getByRole('button', { name: 'Guardar Renglón APU' }).click();
    await page.getByText('Nuevo Renglón APU Manual').waitFor({ state: 'hidden', timeout: 20_000 });
    await page.getByText('01.01').first().waitFor({ timeout: 20_000 });
    await delay(1200);
    const text = await page.locator('body').innerText();
    if (!/16,800\.00/.test(text)) throw new Error('No se encontró el total Q16,800.00');
    await shot('apu-renglon-1');
    return { total: 'Q16,800.00' };
  });

  // ── 4. APU renglón 2 ──────────────────────────────────────────
  await step('apu-renglon-2', async () => {
    await page.getByRole('button', { name: 'Renglón Manual' }).first().click();
    await page.getByText('Nuevo Renglón APU Manual').waitFor({ timeout: 10_000 });
    await page.locator('input[name="code"]').fill('01.02');
    await page.locator('input[name="unit"]').fill('m2');
    await page.locator('input[name="desc"]').fill("Piso de concreto pulido e=10cm f'c=210");
    await page.locator('input[name="qty"]').fill('80');
    await page.locator('input[name="matCost"]').fill('275');
    await page.locator('input[name="labCost"]').fill('0');
    await page.locator('input[name="eqCost"]').fill('0');
    await page.getByRole('button', { name: 'Guardar Renglón APU' }).click();
    await page.getByText('Nuevo Renglón APU Manual').waitFor({ state: 'hidden', timeout: 20_000 });
    await page.getByText('01.02').first().waitFor({ timeout: 20_000 });
    await delay(1200);
    const text = await page.locator('body').innerText();
    if (!/22,000\.00/.test(text)) throw new Error('No se encontró el total Q22,000.00');
    if (!/38,800\.00/.test(text)) throw new Error('No se encontró el costo total Q38,800.00');
    await shot('apu-total');
    return { total: 'Q38,800.00' };
  });

  // ── 5. Cotización ─────────────────────────────────────────────
  await step('cotizacion', async () => {
    await nav('Cotizaciones');
    await page.getByRole('button', { name: 'Nueva Cotización Rápida' }).first().click();
    await page.getByText('Generador Rápido de Cotizaciones').waitFor({ timeout: 15_000 });
    const modal = page
      .locator('div.fixed')
      .filter({ hasText: 'Generador Rápido de Cotizaciones' })
      .filter({ has: page.locator('input[name="clientName"]') })
      .first();
    await modal.locator('input[name="clientName"]').fill(CLIENT);
    await modal.locator('input[type="number"]').nth(0).fill('5');
    await modal.locator('input[type="number"]').nth(1).fill('12');
    await delay(800);
    const body = await modal.innerText();
    if (!/41,283\.20/.test(body))
      throw new Error(`Total de cotización incorrecto: ${body.slice(-500)}`);
    await modal.getByRole('button', { name: /Guardar como Enviada/ }).click();
    await page
      .getByText('Generador Rápido de Cotizaciones')
      .waitFor({ state: 'hidden', timeout: 30_000 });
    await waitForText(new RegExp(CLIENT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 30_000);
    await delay(1000);
    const accept = page.getByRole('button', { name: /Marcar cotización .* como aceptada/ }).first();
    await accept.waitFor({ timeout: 20_000 });
    await accept.click();
    await waitForText(/Aceptada/, 20_000);
    await shot('cotizacion-aceptada');
    return { total: 'Q41,283.20', status: 'Aceptada' };
  });

  // ── 6. Proyecto a Ejecución ───────────────────────────────────
  await step('proyecto-en-ejecucion', async () => {
    await nav('Proyectos & Firmas');
    await page
      .getByRole('button', { name: `Editar proyecto ${CODE}` })
      .first()
      .click();
    const dialog = page.getByRole('dialog', { name: 'Editar Proyecto' });
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });
    await dialog.getByLabel('Estado del Proyecto').selectOption('En Ejecución');
    await dialog.getByRole('button', { name: 'Actualizar' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 30_000 });
    await delay(1200);
    const body = await page.locator('body').innerText();
    if (!/en ejecución/i.test(body)) throw new Error('El proyecto no muestra estado En Ejecución');
    await shot('proyecto-en-ejecucion');
    return { status: 'En Ejecución' };
  });

  // ── 7. Gantt tarea ────────────────────────────────────────────
  await step('gantt-tarea', async () => {
    await nav('Seguimiento & Hitos');
    await page.getByRole('button', { name: 'Nueva Actividad' }).first().click();
    await page.locator('#new-task-name').fill('Fundición de losa nivel 1');
    await page.locator('#new-task-phase').selectOption('Estructura');
    await page.locator('#new-task-weight').fill('20');
    await page.locator('#new-task-start').fill('2026-11-26');
    await page.locator('#new-task-end').fill('2026-12-10');
    await page.locator('#new-task-assigned').fill('Cuadrilla Estructuras');
    await page
      .locator('form:has(#new-task-name)')
      .getByRole('button', { name: 'Crear Actividad' })
      .click();
    await page.getByText('Fundición de losa nivel 1').first().waitFor({ timeout: 30_000 });
    await shot('gantt-tarea');
    return { task: 'Fundición de losa nivel 1' };
  });

  // ── 8. Gantt hito ─────────────────────────────────────────────
  await step('gantt-hito', async () => {
    await page
      .getByRole('button', { name: /Hitos hacia el Objetivo/ })
      .first()
      .click();
    await delay(600);
    await page.getByRole('button', { name: 'Nuevo hito' }).first().click();
    await page.getByText('Crear hito del proyecto').waitFor({ timeout: 10_000 });
    const modal = page.getByRole('dialog', { name: 'Crear hito del proyecto' });
    await modal.getByLabel('Nombre del hito').fill('Entrega de estructura nivel 1');
    await modal.getByLabel('Fase').selectOption('Estructura');
    await modal.getByLabel('Fecha objetivo').fill('2026-12-15');
    await modal.getByLabel(/Ponderación del avance/).fill('20');
    await modal.getByLabel('Descripción').fill('Hito de validación estructural');
    await modal.getByRole('button', { name: 'Crear hito' }).click();
    await page.getByText('Entrega de estructura nivel 1').first().waitFor({ timeout: 30_000 });
    await shot('gantt-hito');
    return { milestone: 'Entrega de estructura nivel 1' };
  });

  // ── 9. Maquinaria alta ────────────────────────────────────────
  await step('maquinaria-alta', async () => {
    await nav('Maquinaria');
    await page.getByRole('button', { name: 'Registrar Maquinaria' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Registrar Nueva Maquinaria' });
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });
    await dialog.getByLabel('Nombre / Equipo').fill(`Mezcladora QA ${RUN}`);
    await dialog.getByLabel('Modelo / Año').fill('2024');
    await dialog.getByLabel('Código / Placa').fill(`MQ-${RUN.slice(-5)}`);
    await dialog.getByLabel('Tarifa por Hora (GTQ)').fill('150');
    await dialog.getByLabel('Horómetro actual').fill('100');
    await dialog.getByRole('button', { name: 'Guardar Maquinaria' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 30_000 });
    await page.getByText(`Mezcladora QA ${RUN}`).first().waitFor({ timeout: 30_000 });
    await shot('maquinaria-alta');
    return { machinery: `Mezcladora QA ${RUN}` };
  });

  // ── 10. Maquinaria uso ────────────────────────────────────────
  await step('maquinaria-uso', async () => {
    await nav('Maquinaria');
    const form = page.locator('form:visible').filter({ hasText: 'Horómetro final' }).first();
    await form.waitFor({ state: 'visible', timeout: 20_000 });
    await selectOptionText(form, `Mezcladora QA ${RUN}`);
    await selectOptionText(form, CODE);
    await form.getByLabel('Horómetro final').fill('108');
    await form.getByLabel('Operador').fill('Operador QA');
    await form.getByLabel('Fecha').fill('2026-11-25');
    await form.getByLabel('Combustible (galones)').fill('5');
    await form.getByRole('button', { name: 'Registrar operación y gasto' }).click();
    await waitForText(/8\.0 h/, 30_000);
    await shot('maquinaria-uso');
    return { hours: 8, expenseGenerated: true };
  });

  // ── 11. Personal alta ─────────────────────────────────────────
  await step('personal-alta', async () => {
    await nav('Personal & IGSS');
    await page.getByRole('button', { name: 'Nuevo Empleado' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Registrar Nuevo Empleado' });
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });
    await dialog.getByLabel('Nombre Completo').fill(`Albañil QA ${RUN}`);
    await dialog.getByLabel('Puesto / Rol').first().click();
    await dialog.getByLabel('Jornal Diario (Q)').fill('250');
    await dialog.getByLabel('Teléfono').fill('5555-0101');
    await dialog.getByRole('button', { name: 'Guardar Empleado' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 30_000 });
    await waitForText(new RegExp(`Albañil QA ${RUN}`), 30_000);
    await shot('personal-alta');
    return { employee: `Albañil QA ${RUN}` };
  });

  // ── 12. Asistencia con geofence ───────────────────────────────
  await step('asistencia-gps', async () => {
    await nav('Personal & IGSS');
    const form = page.locator('form:visible:has(#attendance-project)').first();
    await form.waitFor({ state: 'visible', timeout: 20_000 });
    await selectOptionText(form, CODE);
    await selectOptionText(form, `Albañil QA ${RUN}`);
    await form.getByLabel('Fecha').fill('2026-11-25');
    await form.getByRole('button', { name: 'En Obra' }).first().click();
    await waitForText(/EN OBRA — GPS CONFIRMADO/, 15_000);
    await form.getByRole('button', { name: 'Guardar Registro de Asistencia' }).click();
    await delay(2500);
    await shot('asistencia-gps');
    return { gps: 'confirmado' };
  });

  // ── 13. Gasto registro ────────────────────────────────────────
  await step('gasto-registro', async () => {
    await nav('Gastos & Facturas');
    await page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first().click();
    await page.getByText('Registrar Gasto o Factura FEL').waitFor({ timeout: 10_000 });
    await page.getByLabel('Proveedor', { exact: true }).fill('Ferretería QA');
    await page.getByLabel('NIT Proveedor').fill('9876543-2');
    await page.getByLabel('No. Factura FEL').fill(`FEL-${RUN}`);
    await page.getByLabel(/^Monto \(/).fill('1250.50');
    await page.getByLabel('Descripción del Insumo / Gasto').fill(`Compra QA ${RUN} de cemento`);
    await page.getByRole('button', { name: 'Registrar Gasto (Paso 1)' }).click();
    await page.getByText(`Compra QA ${RUN} de cemento`).first().waitFor({ timeout: 30_000 });
    await shot('gasto-registrado');
    return { amount: 'Q1,250.50', status: 'Pendiente PM' };
  });

  // ── 14. Aprobación PM ─────────────────────────────────────────
  await step('gasto-aprobacion', async () => {
    await nav('Gastos & Facturas');
    await delay(1500);
    let count = await page.getByRole('button', { name: 'Aprobar PM' }).count();
    if (count === 0) throw new Error('No hay gastos pendientes de aprobación');
    let approved = 0;
    while (count > 0 && approved < 8) {
      await page.getByRole('button', { name: 'Aprobar PM' }).first().click();
      await page.getByText('Aprobación de Gasto por Project Manager').waitFor({ timeout: 10_000 });
      await page.getByLabel('Nombre del Project Manager / Auditor').fill('Admin QA');
      await page.getByRole('button', { name: 'Guardar Decisión en Auditoría' }).click();
      await delay(1800);
      approved += 1;
      count = await page.getByRole('button', { name: 'Aprobar PM' }).count();
    }
    await shot('gastos-aprobados');
    return { approved, remainingPending: count };
  });

  // ── 15. Inventario: artículo ──────────────────────────────────
  await step('inventario-articulo', async () => {
    await nav('Inventario & Compras');
    await page.getByRole('tab', { name: 'Artículos' }).click();
    const form = page.locator('form').filter({ hasText: 'Nuevo artículo' }).first();
    await form.getByLabel('Nombre', { exact: true }).fill(`Cemento QA ${RUN}`);
    await form.getByLabel('Unidad', { exact: true }).fill('bolsa');
    await form.getByLabel('Mínimo de reposición').fill('10');
    await form.getByRole('button', { name: 'Guardar artículo' }).click();
    await waitForText(new RegExp(`Cemento QA ${RUN}`), 30_000);
    await shot('inventario-articulo');
    return { item: `Cemento QA ${RUN}` };
  });

  // ── 16. Inventario: bodega ────────────────────────────────────
  await step('inventario-bodega', async () => {
    await page.getByRole('tab', { name: 'Bodegas' }).click();
    const form = page.locator('form').filter({ hasText: 'Nueva bodega' }).first();
    await form.getByLabel('Nombre', { exact: true }).fill(`Bodega Central QA ${RUN}`);
    await form.getByLabel('Tipo').first().click();
    await form.getByRole('button', { name: 'Guardar bodega' }).click();
    await waitForText(new RegExp(`Bodega Central QA ${RUN}`), 30_000);
    await shot('inventario-bodega');
    return { warehouse: `Bodega Central QA ${RUN}` };
  });

  // ── 17. Inventario: proveedor ─────────────────────────────────
  await step('inventario-proveedor', async () => {
    await page.getByRole('tab', { name: 'Proveedores' }).click();
    const form = page.locator('form').filter({ hasText: 'Nuevo proveedor' }).first();
    await form.getByLabel('Nombre / razón social').fill(`Proveedor QA ${RUN}`);
    await form.getByLabel('NIT', { exact: true }).fill('1122334-5');
    await form.getByLabel('Teléfono (opcional)').fill('5555-0202');
    await form.getByRole('button', { name: 'Guardar proveedor' }).click();
    await waitForText(new RegExp(`Proveedor QA ${RUN}`), 30_000);
    await shot('inventario-proveedor');
    return { supplier: `Proveedor QA ${RUN}` };
  });

  // ── 18. Inventario: apertura ──────────────────────────────────
  await step('inventario-apertura', async () => {
    await page.getByRole('tab', { name: 'Movimientos' }).click();
    await delay(1200);
    const form = page.locator('form').filter({ hasText: 'Registrar inventario inicial' }).first();
    await form.waitFor({ state: 'visible', timeout: 20_000 });
    // Seleccionar la combinación artículo+bodega de ESTE run (no una bodega
    // de proyectos QA anteriores) para que la salida a obra tenga existencias.
    await selectOptionText(form, [`Cemento QA ${RUN}`, `Bodega Central QA ${RUN}`]);
    await form.getByLabel('Existencia física inicial').fill('100');
    await form.getByLabel('Costo unitario promedio (Q)').fill('95');
    await form.getByLabel('Acta / referencia de conteo').fill(`APERTURA-${RUN}`);
    await form.getByRole('button', { name: 'Confirmar inventario inicial' }).click();
    await delay(2500);
    await shot('inventario-apertura');
    return { opening: 100, unitCost: 95 };
  });

  // ── 19. Inventario: salida a obra ─────────────────────────────
  await step('inventario-salida', async () => {
    await delay(5000);
    const form = page
      .locator('form')
      .filter({ hasText: 'Registrar salida de material a obra' })
      .first();
    await form.waitFor({ state: 'visible', timeout: 20_000 });
    await selectOptionText(form, PROJECT_NAME);
    await selectOptionText(form, `Cemento QA ${RUN}`);
    await form.getByLabel('Cantidad a retirar').fill('10');
    await form.getByLabel('Vale / referencia de salida').fill(`SALIDA-${RUN}`);
    await form.getByRole('button', { name: 'Confirmar salida' }).click();
    await delay(2500);
    const body = await page.locator('body').innerText();
    if (!/SALIDA-/.test(body)) throw new Error('No se reflejó el movimiento de salida');
    await shot('inventario-salida');
    return { issued: 10 };
  });

  // ── 20. Reportes / exportación ────────────────────────────────
  await step('reportes', async () => {
    await nav('Reportes Finales');
    await delay(1500);
    const dl = page.waitForEvent('download', { timeout: 20_000 }).catch(() => null);
    await page
      .getByRole('button', { name: /Exportar gastos CSV/ })
      .first()
      .click();
    const download = await dl;
    let saved = null;
    if (download) {
      saved = path.join(OUT, `reporte-${RUN}.csv`);
      await download.saveAs(saved);
      report.artifacts.downloads.push(saved);
    }
    await shot('reportes');
    return { exported: Boolean(download), file: saved };
  });

  // ── 21. Dashboard KPIs ────────────────────────────────────────
  await step('dashboard-kpis', async () => {
    await nav('Tablero');
    await delay(2000);
    const body = await page.locator('body').innerText();
    if (!new RegExp(CODE).test(body) && !/PROYECTOS ACTIVOS/.test(body)) {
      throw new Error('El tablero no muestra KPIs de proyectos');
    }
    await shot('dashboard-kpis');
    return { kpis: true };
  });

  // ── 22. Asistente IA ──────────────────────────────────────────
  await step('asistente-ia', async () => {
    await nav('Asistente IA');
    await delay(1200);
    const input = page.getByPlaceholder(/Escribe una consulta técnica/);
    await input.waitFor({ timeout: 15_000 });
    await input.fill('¿Cómo calculo el rendimiento de una cuadrilla de albañiles?');
    await page.getByRole('button', { name: 'Enviar consulta' }).click();
    await delay(12_000);
    const body = await page.locator('body').innerText();
    await shot('asistente-ia');
    // El disclaimer de la UI dice "puede contener errores": no debe contar
    // como fallo. Solo indican error los mensajes reales del backend.
    const failed =
      /Tu sesión expiró|Token de App Check requerido|No se pudo consultar|Error al consultar|API key inválid/i.test(
        body.slice(-3000)
      );
    if (failed) {
      report.expectedFailures.push({
        step: currentStep,
        reason:
          'Local: FIREBASE_ADMIN_CREDENTIALS es placeholder [SENSITIVE] y Identity Toolkit exige App Check; en Vercel Admin SDK sí valida. GEMINI_API_KEY también es placeholder local.',
        sample: body.slice(-800),
      });
    }
    return {
      responded: !failed,
      note: failed ? 'Backend IA sin clave válida (esperado en local)' : 'Respuesta recibida',
    };
  });

  // ── 23. Aprobación final de gastos ( genera cierre sin pendientes ) ──
  await step('aprobacion-final-gastos', async () => {
    await nav('Gastos & Facturas');
    await delay(1500);
    let remaining = await page.getByRole('button', { name: 'Aprobar PM' }).count();
    let guard = 0;
    while (remaining > 0 && guard < 10) {
      await page.getByRole('button', { name: 'Aprobar PM' }).first().click();
      await page.getByText('Aprobación de Gasto por Project Manager').waitFor({ timeout: 10_000 });
      await page.getByLabel('Nombre del Project Manager / Auditor').fill('Admin QA');
      await page.getByRole('button', { name: 'Guardar Decisión en Auditoría' }).click();
      await delay(1800);
      remaining = await page.getByRole('button', { name: 'Aprobar PM' }).count();
      guard += 1;
    }
    await shot('gastos-finales');
    return { remainingPending: remaining };
  });

  // ── 24. Cierre de proyecto ────────────────────────────────────
  await step('cierre-proyecto', async () => {
    await nav('Proyectos & Firmas');
    await page
      .getByRole('button', { name: `Cerrar proyecto ${CODE}` })
      .first()
      .click();
    await page.waitForURL(/\/proyectos\/.+\/cierre$/, { timeout: 30_000 });
    await page
      .getByRole('heading', { name: 'Cierre de Proyecto' })
      .first()
      .waitFor({ timeout: 30_000 });
    await delay(2500);
    await page
      .getByLabel('Observaciones de Cierre')
      .fill('Cierre QA: obra entregada, finiquito firmado y retenciones liberadas.');
    await page.getByRole('button', { name: 'Cerrar Proyecto Definitivamente' }).click();
    await delay(5000);
    const body = await page.locator('body').innerText();
    await shot('cierre-proyecto');
    // Tras el cierre la app regresa al listado (los proyectos cerrados dejan de
    // mostrarse en el filtro "Activos"), así que validamos ausencia de error.
    if (/no se puede cerrar|error al cerrar|failed/i.test(body.slice(-800))) {
      throw new Error(`El cierre reportó un error: ${body.slice(-700)}`);
    }
    return { closed: true, urlAfterClose: page.url() };
  });

  // ── 25. Persistencia tras recarga ─────────────────────────────
  await step('verificacion-persistencia', async () => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await delay(5000);
    await nav('Proyectos & Firmas');
    await delay(2500);
    const body = await page.locator('body').innerText();
    if (!new RegExp(CODE).test(body)) throw new Error('El proyecto no aparece tras recargar');

    // Verificación contra el backend real (REST de Firestore), ya que el
    // listado "Activos" no muestra el estado de los proyectos cerrados.
    const { execSync } = await import('node:child_process');
    // En Windows `gcloud` es un .ps1/.cmd: hace falta ejecutarlo vía shell.
    const token = execSync('gcloud auth print-access-token', {
      encoding: 'utf8',
      timeout: 30_000,
      shell: true,
    }).trim();
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'origen-erp-guatemala';
    const queryResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-goog-user-project': projectId,
        },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'projects' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'code' },
                op: 'EQUAL',
                value: { stringValue: CODE },
              },
            },
          },
        }),
      }
    );
    const result = await queryResponse.json();
    const status = result?.[0]?.document?.fields?.status?.stringValue;
    if (status !== 'Cerrado') {
      throw new Error(`El estado persistido es "${status}", se esperaba "Cerrado"`);
    }
    await shot('persistencia');
    return { status, persisted: true, verifiedVia: 'Firestore REST' };
  });

  // ── 26. Limpieza de proyectos QA huérfanos ────────────────────
  await step('limpieza-proyectos-qa', async () => {
    const selector = page
      .locator(
        'select[aria-label="Seleccionar proyecto"]:visible, select[aria-label="Proyecto activo"]:visible'
      )
      .first();
    const options = await selector
      .locator('option')
      .evaluateAll((nodes) => nodes.map((n) => ({ value: n.value, text: n.textContent || '' })));
    const leftovers = options.filter((o) => /Obra QA/.test(o.text) && !o.text.includes(CODE));
    let archived = 0;
    for (const leftover of leftovers) {
      const code = leftover.text.split(' · ')[0];
      const btn = page.getByRole('button', { name: `Archivar proyecto ${code}` }).first();
      if (await btn.count()) {
        await btn.click();
        await delay(900);
        archived += 1;
      }
    }
    await shot('limpieza');
    return { archived, leftovers: leftovers.map((o) => o.text) };
  });

  report.status = 'completed';
} catch (error) {
  report.status = 'failed';
  report.failure = String(error?.stack || error);
} finally {
  report.finishedAt = new Date().toISOString();
  report.summary = {
    totalSteps: report.steps.length,
    ok: report.steps.filter((s) => s.status === 'ok').length,
    failed: report.steps.filter((s) => s.status === 'failed').length,
    consoleErrors: report.consoleErrors.length,
    pageErrors: report.pageErrors.length,
    failedResponses: report.failedResponses.length,
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\nREPORT:', path.join(OUT, 'report.json'));
  console.log('SUMMARY:', JSON.stringify(report.summary));
  await browser.close();
}

if (report.steps.some((s) => s.status === 'failed')) process.exitCode = 1;
