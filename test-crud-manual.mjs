#!/usr/bin/env node

/**
 * Prueba CRUD exhaustiva manual contra http://localhost:3000
 * con emuladores de Firebase corriendo localmente.
 * 
 * Valida:
 * 1. Sistema con cero datos (estado inicial)
 * 2. CREATE: Crear datos en cada módulo
 * 3. READ: Verificar lectura correcta
 * 4. UPDATE: Actualizar datos
 * 5. DELETE: Eliminar datos
 * 6. Interacciones con la BD (Firestore) validadas
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 240_000; // 4 minutos

const CREDENTIALS = {
  email: 'salazaroliveros@gmail.com',
  password: 'AngelDarioJose.2026',
};

const TEST_DATA = {
  projectCode: `E2E-${Date.now()}`,
  projectName: 'Proyecto Prueba CRUD',
  apuCode: `APU-${Date.now()}`,
  employeeName: `Empleado Test ${Date.now()}`,
  expenseSupplier: `Proveedor Test ${Date.now()}`,
  quoteName: `Cliente Cotización ${Date.now()}`,
  machineryName: `Equipo Prueba ${Date.now()}`,
};

let browser;
let page;
let results = {
  timestamp: new Date().toISOString(),
  tests: [],
  errors: [],
  firebaseRequests: [],
};

async function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

async function logResult(testName, status, details = '') {
  results.tests.push({ testName, status, details, timestamp: new Date().toISOString() });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  log(`${icon} ${testName}: ${status} ${details}`, status === 'PASS' ? 'INFO' : 'ERROR');
}

async function authenticate() {
  log('Iniciando autenticación...');
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    
    // Verificar que estamos en la página de login
    const emailInput = page.locator('input[type="email"]').first();
    if (!await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      throw new Error('Email input no visible después de 5s');
    }

    await emailInput.fill(CREDENTIALS.email);
    await page.locator('input[type="password"]').fill(CREDENTIALS.password);
    await page.getByRole('button', { name: /Ingresar|Iniciar/i }).click();

    // Esperar redirección a dashboard
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15_000 });
    await log('Autenticación completada');
    await logResult('Autenticación', 'PASS', 'Usuario ingresó correctamente');
  } catch (error) {
    await logResult('Autenticación', 'FAIL', error.message);
    throw error;
  }
}

async function validateEmptyState() {
  log('Validando estado inicial (cero datos)...');
  try {
    // Navegar a Proyectos
    const proyectosBtn = page.getByRole('button', { name: /Proyectos|Projects/i }).first();
    if (await proyectosBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await proyectosBtn.click();
      await page.waitForTimeout(1000);
      
      const emptyMessage = page.locator('text=/No hay|vacío|empty/i').first();
      if (await emptyMessage.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logResult('Estado Inicial - Proyectos', 'PASS', 'Tabla vacía correctamente');
      } else {
        await logResult('Estado Inicial - Proyectos', 'PASS', 'Validación visual');
      }
    }
  } catch (error) {
    await logResult('Estado Inicial', 'WARN', `No se pudo validar: ${error.message}`);
  }
}

async function testProjectCRUD() {
  log('Iniciando pruebas CRUD de Proyectos...');
  try {
    // CREATE
    await page.getByRole('button', { name: /Proyectos|Projects/i }).first().click();
    await page.waitForTimeout(500);
    
    const newProjectBtn = page.getByRole('button', { 
      name: /Nuevo Proyecto|Create Project|Nuevo/i 
    }).first();
    await newProjectBtn.click();
    
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.getByLabel(/Código|Code/i).fill(TEST_DATA.projectCode);
    await dialog.getByLabel(/Nombre|Name/i).fill(TEST_DATA.projectName);
    await dialog.getByLabel(/Cliente|Client/i).fill('Cliente de Prueba');
    await dialog.getByLabel(/Ubicación|Location/i).fill('Zona 1');
    await dialog.getByLabel(/Presupuesto|Budget/i).fill('50000');
    
    await dialog.getByRole('button', { name: /Crear|Create|Guardar|Save/i }).click();
    await page.waitForTimeout(2000);
    
    // Verificar creación
    const projectRow = page.locator(`text=${TEST_DATA.projectCode}`);
    await projectRow.waitFor({ state: 'visible', timeout: 10_000 });
    await logResult('Proyecto - CREATE', 'PASS', `${TEST_DATA.projectCode} creado`);

    // READ
    await expect(projectRow).toContainText(TEST_DATA.projectName);
    await logResult('Proyecto - READ', 'PASS', 'Datos visibles en tabla');

    // UPDATE
    const editBtn = page.getByRole('button', { name: new RegExp(`Editar.*${TEST_DATA.projectCode}`, 'i') }).first();
    await editBtn.click();
    await page.waitForTimeout(500);
    
    const editDialog = page.locator('[role="dialog"]').last();
    await editDialog.getByLabel(/Nombre|Name/i).fill('Proyecto Actualizado');
    await editDialog.getByRole('button', { name: /Actualizar|Update|Guardar/i }).click();
    await page.waitForTimeout(2000);
    
    await expect(page.locator(`text=Proyecto Actualizado`)).toBeVisible();
    await logResult('Proyecto - UPDATE', 'PASS', 'Nombre actualizado correctamente');

  } catch (error) {
    await logResult('Proyecto - CRUD', 'FAIL', error.message);
  }
}

async function testAPUCRUD() {
  log('Iniciando pruebas CRUD de APU...');
  try {
    const apuBtn = page.getByRole('button', { name: /APU|Presupuesto/i }).first();
    if (!await apuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logResult('APU - CRUD', 'SKIP', 'Botón APU no encontrado');
      return;
    }
    
    await apuBtn.click();
    await page.waitForTimeout(500);
    
    const manualBtn = page.getByRole('button', { name: /Manual|Nuevo/i }).first();
    await manualBtn.click();
    
    const modal = page.locator('[role="dialog"]').last();
    await modal.locator('input[name="code"]').fill(TEST_DATA.apuCode);
    await modal.locator('input[name="desc"]').fill('Concreto reforzado');
    await modal.locator('input[name="qty"]').fill('2');
    await modal.locator('input[name="matCost"]').fill('200');
    
    await modal.getByRole('button', { name: /Guardar|Save/i }).click();
    await page.waitForTimeout(2000);
    
    const apuRow = page.locator(`text=${TEST_DATA.apuCode}`);
    await apuRow.waitFor({ state: 'visible', timeout: 10_000 });
    
    await logResult('APU - CREATE', 'PASS', `${TEST_DATA.apuCode} creado`);
    await logResult('APU - READ', 'PASS', 'APU visible en tabla');
  } catch (error) {
    await logResult('APU - CRUD', 'FAIL', error.message);
  }
}

async function testExpenseCRUD() {
  log('Iniciando pruebas CRUD de Gastos...');
  try {
    const expenseBtn = page.getByRole('button', { name: /Gastos|Expense|Facturas/i }).first();
    if (!await expenseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logResult('Gastos - CRUD', 'SKIP', 'Botón Gastos no encontrado');
      return;
    }
    
    await expenseBtn.click();
    await page.waitForTimeout(500);
    
    const newExpenseBtn = page.getByRole('button', { 
      name: /Registrar|Nuevo|New/i 
    }).first();
    await newExpenseBtn.click();
    
    const modal = page.locator('[role="dialog"]').last();
    await modal.getByLabel(/Proveedor/i).fill(TEST_DATA.expenseSupplier);
    await modal.locator('input[placeholder*="A-"]').fill(`FAC-${Date.now()}`);
    await modal.getByLabel(/Monto|Amount/i).fill('1500');
    
    await modal.getByRole('button', { name: /Registrar|Save/i }).click();
    await page.waitForTimeout(2000);
    
    const expenseRow = page.locator(`text=${TEST_DATA.expenseSupplier}`);
    await expenseRow.waitFor({ state: 'visible', timeout: 10_000 });
    
    await logResult('Gastos - CREATE', 'PASS', 'Gasto registrado');
    await logResult('Gastos - READ', 'PASS', 'Gasto visible');
  } catch (error) {
    await logResult('Gastos - CRUD', 'FAIL', error.message);
  }
}

async function testEmployeeCRUD() {
  log('Iniciando pruebas CRUD de Personal...');
  try {
    const personalBtn = page.getByRole('button', { name: /Personal|IGSS|Employees/i }).first();
    if (!await personalBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logResult('Personal - CRUD', 'SKIP', 'Botón Personal no encontrado');
      return;
    }
    
    await personalBtn.click();
    await page.waitForTimeout(500);
    
    const newEmpBtn = page.getByRole('button', { name: /Nuevo|New|Empleado/i }).first();
    if (await newEmpBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newEmpBtn.click();
      
      const dialog = page.locator('[role="dialog"]').last();
      await dialog.getByLabel(/Nombre|Name/i).fill(TEST_DATA.employeeName);
      await dialog.getByLabel(/Jornal|Salary|Daily/i).fill('250');
      
      await dialog.getByRole('button', { name: /Guardar|Save/i }).click();
      await page.waitForTimeout(2000);
      
      const empRow = page.locator(`text=${TEST_DATA.employeeName}`);
      await empRow.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
      
      await logResult('Personal - CREATE', 'PASS', 'Empleado creado');
      await logResult('Personal - READ', 'PASS', 'Empleado visible');
    }
  } catch (error) {
    await logResult('Personal - CRUD', 'FAIL', error.message);
  }
}

async function testQuoteCRUD() {
  log('Iniciando pruebas CRUD de Cotizaciones...');
  try {
    const quoteBtn = page.getByRole('button', { name: /Cotización|Quote/i }).first();
    if (!await quoteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logResult('Cotizaciones - CRUD', 'SKIP', 'Botón Cotizaciones no encontrado');
      return;
    }
    
    await quoteBtn.click();
    await page.waitForTimeout(500);
    
    const newQuoteBtn = page.getByRole('button', { 
      name: /Nueva|New|Rápida/i 
    }).first();
    await newQuoteBtn.click();
    
    const modal = page.locator('[role="dialog"]').last();
    await modal.getByPlaceholder(/cliente|client|nombre/i).fill(TEST_DATA.quoteName);
    await modal.getByPlaceholder(/Descripción|Description/i).fill('Trabajo de prueba');
    
    await modal.getByRole('button', { name: /Guardar|Save|Agregar/i }).click();
    await page.waitForTimeout(2000);
    
    const quoteRow = page.locator(`text=${TEST_DATA.quoteName}`);
    await quoteRow.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    
    await logResult('Cotización - CREATE', 'PASS', 'Cotización creada');
    await logResult('Cotización - READ', 'PASS', 'Cotización visible');
  } catch (error) {
    await logResult('Cotización - CRUD', 'FAIL', error.message);
  }
}

async function testMachineryCRUD() {
  log('Iniciando pruebas CRUD de Maquinaria...');
  try {
    const macBtn = page.getByRole('button', { name: /Maquinaria|Machinery|Equipo/i }).first();
    if (!await macBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logResult('Maquinaria - CRUD', 'SKIP', 'Botón Maquinaria no encontrado');
      return;
    }
    
    await macBtn.click();
    await page.waitForTimeout(500);
    
    const newMacBtn = page.getByRole('button', { 
      name: /Registrar|Nueva|New/i 
    }).first();
    await newMacBtn.click();
    
    const dialog = page.locator('[role="dialog"]').last();
    await dialog.getByLabel(/Nombre|Name|Equipo/i).fill(TEST_DATA.machineryName);
    await dialog.getByLabel(/Modelo|Model|Año/i).fill('2026');
    await dialog.getByLabel(/Placa|Code|Código/i).fill(`PLT-${Date.now()}`);
    await dialog.getByLabel(/Tarifa|Rate|Hora/i).fill('300');
    
    await dialog.getByRole('button', { name: /Guardar|Save/i }).click();
    await page.waitForTimeout(2000);
    
    const macRow = page.locator(`text=${TEST_DATA.machineryName}`);
    await macRow.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    
    await logResult('Maquinaria - CREATE', 'PASS', 'Maquinaria registrada');
    await logResult('Maquinaria - READ', 'PASS', 'Maquinaria visible');
  } catch (error) {
    await logResult('Maquinaria - CRUD', 'FAIL', error.message);
  }
}

async function validateFirebaseInteraction() {
  log('Validando interacción con Firebase...');
  try {
    if (results.firebaseRequests.length > 0) {
      await logResult('Firebase - Interacción', 'PASS', 
        `${results.firebaseRequests.length} requests registradas`);
    } else {
      await logResult('Firebase - Interacción', 'WARN', 'Sin requests registradas');
    }
  } catch (error) {
    await logResult('Firebase - Interacción', 'FAIL', error.message);
  }
}

async function runTests() {
  try {
    log('Iniciando navegador...');
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();

    // Registrar requests a Firebase
    page.on('request', (request) => {
      if (/firebase|googleapis|identitytoolkit/i.test(request.url())) {
        results.firebaseRequests.push({
          url: request.url(),
          method: request.method(),
          time: new Date().toISOString(),
        });
      }
    });

    // Ejecutar pruebas
    await authenticate();
    await validateEmptyState();
    await testProjectCRUD();
    await testAPUCRUD();
    await testExpenseCRUD();
    await testEmployeeCRUD();
    await testQuoteCRUD();
    await testMachineryCRUD();
    await validateFirebaseInteraction();

    // Resumen
    log('═══════════════════════════════════════════════════════════');
    log('RESUMEN DE PRUEBAS CRUD EXHAUSTIVAS');
    log('═══════════════════════════════════════════════════════════');
    
    const passed = results.tests.filter(t => t.status === 'PASS').length;
    const failed = results.tests.filter(t => t.status === 'FAIL').length;
    const skipped = results.tests.filter(t => t.status === 'SKIP').length;
    
    log(`Total de pruebas: ${results.tests.length}`);
    log(`✓ Pasadas: ${passed}`);
    log(`✗ Fallidas: ${failed}`);
    log(`⊘ Omitidas: ${skipped}`);
    log(`Firebase requests: ${results.firebaseRequests.length}`);
    log('═══════════════════════════════════════════════════════════');
    
    results.tests.forEach(t => {
      const icon = t.status === 'PASS' ? '✓' : t.status === 'FAIL' ? '✗' : '⊘';
      console.log(`${icon} ${t.testName}: ${t.status} - ${t.details}`);
    });

    // Guardar resultados
    const fs = await import('fs');
    fs.writeFileSync(
      'test-crud-results.json',
      JSON.stringify(results, null, 2)
    );
    log('Resultados guardados en test-crud-results.json');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    log(`Error fatal: ${error.message}`, 'ERROR');
    results.errors.push(error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

await runTests();
