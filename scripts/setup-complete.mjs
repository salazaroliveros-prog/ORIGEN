/**
 * SCRIPT DE CONFIGURACIÓN AUTOMÁTICA COMPLETA — ORIGEN ERP
 * ============================================================
 *
 * Este script configura TODO el sistema automáticamente:
 *  1. Lee variables de entorno de .env.local
 *  2. Inicializa Firebase Admin SDK con credenciales del proyecto
 *  3. Crea el usuario administrador en Firebase Authentication
 *  4. Sembrar Firestore con empresa, membresía, proyectos, gastos, etc.
 *  5. Verifica que todo funcione correctamente
 *
 * USO:
 *   node scripts/setup-complete.mjs
 *
 * REQUISITOS:
 *   - Archivo .env.local con las variables de Firebase configuradas
 *   - Firebase project debe existir en Firebase Console
 *   - Servicio de Firebase Admin SDK debe estar habilitado
 */

import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================================
// CONFIGURACIÓN
// ============================================================
// Credenciales del administrador: se leen del entorno (nunca del código).
// Configura ADMIN_EMAIL y ADMIN_PASSWORD en .env.local o en el entorno.
let ADMIN_EMAIL = '';
let ADMIN_PASSWORD = '';
const COMPANY_ID = 'empresa-origen';
const COMPANY_NAME = 'ConstructERP Guatemala';

const PROJECTS = [
  {
    id: 'proj-residencia-001',
    code: 'RES-001',
    name: 'Residencia Unifamiliar Los Altos',
    client: 'Familia Méndez García',
    location: 'Zona 10, Ciudad de Guatemala',
    municipality: 'Guatemala',
    department: 'Guatemala',
    budgetTotal: 260000,
    spentTotal: 48500,
    progressPercent: 22,
    status: 'En Ejecución',
    clientNit: '1234567-8',
    clientPhone: '+502 2233-4455',
    clientEmail: 'familia.mendez@gmail.com',
    clientAddress: 'Colonia Los Altos, Zona 10, Guatemala',
    lat: 14.6349,
    lng: -90.5283,
    expectedProfitMarginPercent: 15,
    apuBudgetTotal: 200000,
    apuBudgetVarianceGTQ: -5000,
  },
  {
    id: 'proj-edificio-002',
    code: 'EDI-002',
    name: 'Edificio Comercial Plaza Xela',
    client: 'Corporación Inversiones Xela S.A.',
    location: 'Zona 1, Quetzaltenango',
    municipality: 'Quetzaltenango',
    department: 'Quetzaltenango',
    budgetTotal: 1800000,
    spentTotal: 320000,
    progressPercent: 18,
    status: 'En Ejecución',
    clientNit: '9876543-2',
    clientPhone: '+502 7755-6688',
    clientEmail: 'admin@inversionesxela.com',
    clientAddress: 'Zona 1, Quetzaltenango',
    lat: 14.8322,
    lng: -91.5157,
    expectedProfitMarginPercent: 20,
    apuBudgetTotal: 1500000,
    apuBudgetVarianceGTQ: 20000,
  },
  {
    id: 'proj-puente-003',
    code: 'PUE-003',
    name: 'Puente Vehicular Río Polochic',
    client: 'Municipalidad de Cobán',
    location: 'Río Polochic, Cobán',
    municipality: 'Cobán',
    department: 'Alta Verapaz',
    budgetTotal: 1350000,
    spentTotal: 85000,
    progressPercent: 8,
    status: 'Planificación',
    clientNit: '5555555-5',
    clientPhone: '+502 7900-1122',
    clientEmail: 'ingenieria@municoban.gob.gt',
    clientAddress: 'Municipalidad de Cobán, Alta Verapaz',
    lat: 15.4933,
    lng: -90.3657,
    expectedProfitMarginPercent: 10,
    apuBudgetTotal: 1300000,
    apuBudgetVarianceGTQ: 0,
  },
];

const EXPENSES = [
  {
    projectId: 'proj-residencia-001',
    category: 'Materiales (Cementos, Hierro)',
    description: 'Cemento Progreso 50kg x 100 bolsas',
    supplier: 'Cemento Progreso S.A.',
    nitSupplier: '1234567-8',
    facturaNumber: 'FEL-001-2026',
    amount: 45000,
    currency: 'GTQ',
    paymentMethod: 'Transferencia BI',
    assignedApuId: 'apu-cemento-001',
    assignedApuDescription: 'Cemento estructural',
  },
  {
    projectId: 'proj-residencia-001',
    category: 'Mano de Obra',
    description: 'Albañilería semana 1-2',
    supplier: 'Juan Pérez',
    nitSupplier: 'CF',
    facturaNumber: 'FEL-002-2026',
    amount: 25000,
    currency: 'GTQ',
    paymentMethod: 'Efectivo',
  },
  {
    projectId: 'proj-edificio-002',
    category: 'Materiales (Cementos, Hierro)',
    description: 'Hierro corrugado 1/2" x 500kg',
    supplier: 'Hierros Guatemala',
    nitSupplier: '8765432-1',
    facturaNumber: 'FEL-003-2026',
    amount: 120000,
    currency: 'GTQ',
    paymentMethod: 'Cheque',
  },
];

// ============================================================
// FUNCIONES
// ============================================================

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const env = {};
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const separator = line.indexOf('=');
      if (separator <= 0) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

function initFirebaseAdmin() {
  // Intentar inicializar con credenciales del proyecto
  if (getApps().length > 0) {
    return getApp();
  }

  // Opción 1: Intentar con service account desde variable de entorno
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    } catch {
      // Ignorar y probar siguiente opción
    }
  }

  // Opción 2: Inicializar solo con projectId (funciona para algunas operaciones)
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (projectId) {
    return initializeApp({ projectId });
  }

  throw new Error('No se pudo inicializar Firebase Admin. Falta configuración.');
}

async function createAdminUser(auth) {
  console.log('\n👤 Creando usuario administrador en Firebase Auth...');
  console.log(`   Email: ${ADMIN_EMAIL}`);

  try {
    // Verificar si el usuario ya existe
    try {
      const existingUser = await getAuth().getUserByEmail(ADMIN_EMAIL);
      console.log(`   ⚠️  El usuario ya existe (UID: ${existingUser.uid})`);
      return existingUser;
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
    }

    // Crear el usuario
    const userRecord = await getAuth().createUser({
      email: ADMIN_EMAIL,
      emailVerified: true,
      password: ADMIN_PASSWORD,
      displayName: 'Administrador del Sistema',
      disabled: false,
    });

    console.log(`   ✅ Usuario creado exitosamente (UID: ${userRecord.uid})`);
    return userRecord;
  } catch (error) {
    console.error(`   ❌ Error creando usuario: ${error.message}`);
    if (error.code === 'auth/project-not-found') {
      console.error('   💡 El proyecto Firebase no existe. Crea el proyecto en Firebase Console.');
    }
    if (error.code === 'auth/invalid-api-key') {
      console.error('   💡 La API Key de Firebase no es válida.');
    }
    throw error;
  }
}

async function seedFirestore(db, adminUid) {
  console.log('\n🌱 Sembrando base de datos Firestore...');

  const batch = db.batch();

  // 1. Crear empresa
  const companyRef = db.collection('companies').doc(COMPANY_ID);
  batch.set(companyRef, {
    id: COMPANY_ID,
    companyId: COMPANY_ID,
    ownerId: adminUid,
    legalName: `${COMPANY_NAME} S.A.`,
    commercialName: COMPANY_NAME,
    companyName: COMPANY_NAME,
    nit: '1234567-8',
    architectName: 'Ing. Administrador',
    architectColNumber: '12345',
    address: 'Zona 10, Ciudad de Guatemala, Guatemala',
    phone: '+502 2233-4455',
    email: ADMIN_EMAIL,
    exchangeRate: 7.85,
    primaryColor: '#f59e0b',
    secondaryColor: '#38bdf8',
    logoUrl: '',
    logoSmallUrl: '',
    logoSquareUrl: '',
    bannerUrl: '',
    payrollEstimateRates: {
      employeeDeductionPercent: 4.83,
      employerCostPercent: 12.67,
      incentiveBonusGTQ: 500,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // 2. Crear membresía del administrador
  const memberRef = db.collection('companies').doc(COMPANY_ID).collection('members').doc(adminUid);
  batch.set(memberRef, {
    id: adminUid,
    companyId: COMPANY_ID,
    uid: adminUid,
    email: ADMIN_EMAIL,
    role: 'owner',
    joinedAt: new Date().toISOString(),
    invitationId: 'seed-admin',
  }, { merge: true });

  // 3. Crear proyectos
  for (const project of PROJECTS) {
    const projectRef = db.collection('companies').doc(COMPANY_ID).collection('projects').doc(project.id);
    batch.set(projectRef, {
      ...project,
      id: project.id,
      companyId: COMPANY_ID,
      ownerId: adminUid,
      createdBy: adminUid,
      updatedBy: adminUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log(`   ✅ Proyecto: ${project.name}`);
  }

  // 4. Crear gastos
  for (const expense of EXPENSES) {
    const expenseRef = db.collection('companies').doc(COMPANY_ID).collection('expenses').doc();
    batch.set(expenseRef, {
      ...expense,
      id: expenseRef.id,
      companyId: COMPANY_ID,
      authorId: adminUid,
      createdBy: adminUid,
      updatedBy: adminUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvalStatus: 'Pendiente',
      auditTrail: [],
    }, { merge: true });
    console.log(`   ✅ Gasto: ${expense.description}`);
  }

  // 5. Crear configuración de empresa
  const settingsRef = db.collection('companies').doc(COMPANY_ID).collection('companySettings').doc(COMPANY_ID);
  batch.set(settingsRef, {
    id: COMPANY_ID,
    companyId: COMPANY_ID,
    legalName: `${COMPANY_NAME} S.A.`,
    commercialName: COMPANY_NAME,
    companyName: COMPANY_NAME,
    nit: '1234567-8',
    architectName: 'Ing. Administrador',
    architectColNumber: '12345',
    address: 'Zona 10, Ciudad de Guatemala, Guatemala',
    phone: '+502 2233-4455',
    email: ADMIN_EMAIL,
    exchangeRate: 7.85,
    primaryColor: '#f59e0b',
    secondaryColor: '#38bdf8',
    logoUrl: '',
    logoSmallUrl: '',
    logoSquareUrl: '',
    bannerUrl: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  await batch.commit();
  console.log('\n✅ Base de datos sembrada exitosamente');
}

async function verifySetup(auth, db) {
  console.log('\n🔍 Verificando configuración...');

  // Verificar usuario
  try {
    const user = await getAuth().getUserByEmail(ADMIN_EMAIL);
    console.log(`   ✅ Usuario Auth: ${user.email} (UID: ${user.uid})`);
  } catch (error) {
    console.error(`   ❌ Error verificando usuario: ${error.message}`);
  }

  // Verificar empresa
  try {
    const companyDoc = await db.collection('companies').doc(COMPANY_ID).get();
    if (companyDoc.exists) {
      console.log(`   ✅ Empresa: ${COMPANY_NAME}`);
    } else {
      console.error(`   ❌ Empresa no encontrada`);
    }
  } catch (error) {
    console.error(`   ❌ Error verificando empresa: ${error.message}`);
  }

  // Verificar proyectos
  try {
    const projectsSnapshot = await db.collection('companies').doc(COMPANY_ID).collection('projects').get();
    console.log(`   ✅ Proyectos: ${projectsSnapshot.size} encontrados`);
  } catch (error) {
    console.error(`   ❌ Error verificando proyectos: ${error.message}`);
  }

  // Verificar gastos
  try {
    const expensesSnapshot = await db.collection('companies').doc(COMPANY_ID).collection('expenses').get();
    console.log(`   ✅ Gastos: ${expensesSnapshot.size} encontrados`);
  } catch (error) {
    console.error(`   ❌ Error verificando gastos: ${error.message}`);
  }
}

// ============================================================
// EJECUCIÓN PRINCIPAL
// ============================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ORIGEN ERP - CONFIGURACIÓN AUTOMÁTICA COMPLETA              ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  Usuario admin configurado por ADMIN_EMAIL.                  ║');
  console.log('║  Empresa: ConstructERP Guatemala                             ║');
  console.log('║  Proyecto Firebase: origen-erp-guatemala                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Cargar variables de entorno
  const env = loadEnvFile(resolve(process.cwd(), '.env.local'));
  Object.assign(process.env, env);

  ADMIN_EMAIL =
    process.env.ADMIN_EMAIL ?? env.ADMIN_EMAIL ?? process.env.PRIMARY_ADMIN_EMAIL ?? env.PRIMARY_ADMIN_EMAIL ?? '';
  ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? env.ADMIN_PASSWORD ?? '';

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌ Faltan credenciales del administrador.');
    console.error('   Define ADMIN_EMAIL y ADMIN_PASSWORD en .env.local (o en el entorno).');
    process.exit(1);
  }

  // Verificar variables críticas
  const requiredEnv = ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_API_KEY'];
  const missingEnv = requiredEnv.filter(k => !process.env[k]);
  if (missingEnv.length > 0) {
    console.error(`❌ Variables de entorno faltantes: ${missingEnv.join(', ')}`);
    console.error('💡 Crea el archivo .env.local con las variables de Firebase');
    process.exit(1);
  }

  try {
    // Inicializar Firebase Admin
    const app = initFirebaseAdmin();
    console.log(`✅ Firebase Admin inicializado (proyecto: ${app.options.projectId})`);

    const auth = getAuth(app);
    const db = getFirestore(app);

    // Crear usuario administrador
    const adminUser = await createAdminUser(auth);

    // Sembrar base de datos
    await seedFirestore(db, adminUser.uid);

    // Verificar configuración
    await verifySetup(auth, db);

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONFIGURACIÓN COMPLETADA EXITOSAMENTE                     ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  Credenciales de acceso:                                       ║');
    console.log('║  📧 Email:    ' + ADMIN_EMAIL);
    console.log('║  🔑 Password: la definida en ADMIN_PASSWORD                   ║');
    console.log('║                                                               ║');
    console.log('║  URL de la aplicación: http://localhost:3000                  ║');
    console.log('║  Página de login:    http://localhost:3000/login              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ ERROR EN LA CONFIGURACIÓN                                   ║');
    console.error('╠═══════════════════════════════════════════════════════════════╣');
    console.error(`║  ${error.message.padEnd(74)}║`);
    console.error('╚═══════════════════════════════════════════════════════════════╝\n');
    console.error('💡 Posibles soluciones:');
    console.error('   1. Verifica que .env.local tenga las variables de Firebase');
    console.error('   2. Verifica que el proyecto exista en Firebase Console');
    console.error('   3. Ejecuta: firebase login (para autenticar Admin SDK)');
    process.exit(1);
  }
}

main();
