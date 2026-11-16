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

import { initializeApp, getApps, cert, getApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================================
// CONFIGURACIÓN
// ============================================================
let ADMIN_EMAIL = '';
let ADMIN_PASSWORD = '';
let COMPANY_ID = '';
let COMPANY_NAME = '';

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

  // Opción 2: credenciales ADC (por ejemplo, entorno seguro de Google Cloud)
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (projectId) {
    return initializeApp({ credential: applicationDefault(), projectId });
  }

  throw new Error('No se pudo inicializar Firebase Admin. Falta configuración.');
}

async function createAdminUser(auth) {
  console.log('\n👤 Creando usuario administrador en Firebase Auth...');
  console.log(`   Email: ${ADMIN_EMAIL}`);

  try {
    // Verificar si el usuario ya existe
    try {
      const existingUser = await auth.getUserByEmail(ADMIN_EMAIL);
      console.log(`   ⚠️  El usuario ya existe (UID: ${existingUser.uid})`);
      return existingUser;
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
    }

    // Crear el usuario
    const userRecord = await auth.createUser({
      email: ADMIN_EMAIL,
      emailVerified: false,
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
  console.log('\n🌱 Preparando espacio de trabajo vacío para producción...');

  const companyRef = db.collection('companies').doc(COMPANY_ID);
  const existingCompany = await companyRef.get();
  if (existingCompany.exists && existingCompany.data()?.ownerId !== adminUid) {
    throw new Error('El identificador de empresa ya pertenece a otro usuario. No se modificó información existente.');
  }

  const memberRef = companyRef.collection('members').doc(adminUid);
  const settingsRef = db.collection('companySettings').doc(COMPANY_ID);
  const batch = db.batch();
  const now = new Date().toISOString();
  const exchangeRate = Number(process.env.SETUP_EXCHANGE_RATE_GTQ_PER_USD || 0);
  if (!Number.isFinite(exchangeRate) || exchangeRate < 0) {
    throw new Error('SETUP_EXCHANGE_RATE_GTQ_PER_USD debe ser cero o un número positivo.');
  }

  if (!existingCompany.exists) {
    batch.create(companyRef, {
      id: COMPANY_ID,
      companyId: COMPANY_ID,
      ownerId: adminUid,
      legalName: '',
      commercialName: COMPANY_NAME,
      companyName: COMPANY_NAME,
      createdAt: now,
      updatedAt: now,
    });
  }

  batch.set(memberRef, {
    id: adminUid,
    companyId: COMPANY_ID,
    uid: adminUid,
    email: ADMIN_EMAIL,
    role: 'owner',
    joinedAt: now,
    invitationId: 'initial-owner',
  }, { merge: true });

  const existingSettings = await settingsRef.get();
  if (!existingSettings.exists) {
    batch.create(settingsRef, {
      id: COMPANY_ID,
      companyId: COMPANY_ID,
      ownerId: COMPANY_ID,
      legalName: '',
      commercialName: COMPANY_NAME,
      companyName: COMPANY_NAME,
      nit: '',
      architectName: '',
      architectColNumber: '',
      address: '',
      phone: '',
      email: ADMIN_EMAIL,
      exchangeRate,
      primaryColor: '#f59e0b',
      secondaryColor: '#38bdf8',
      logoUrl: '',
      logoSmallUrl: '',
      logoSquareUrl: '',
      bannerUrl: '',
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
  console.log('   ✅ Empresa y membresía de propietario verificadas');
  console.log('   ✅ Configuración inicial creada sin proyectos, clientes ni gastos ficticios');
}

async function verifySetup(auth, db, adminUid) {
  const user = await auth.getUser(adminUid);
  if (user.email !== ADMIN_EMAIL) throw new Error('La cuenta administradora no coincide con el correo configurado.');

  const companyRef = db.collection('companies').doc(COMPANY_ID);
  const [companyDoc, memberDoc, settingsDoc, projectsSnapshot, expensesSnapshot] = await Promise.all([
    companyRef.get(),
    companyRef.collection('members').doc(adminUid).get(),
    db.collection('companySettings').doc(COMPANY_ID).get(),
    db.collection('projects').where('companyId', '==', COMPANY_ID).get(),
    db.collection('expenses').where('companyId', '==', COMPANY_ID).get(),
  ]);

  if (!companyDoc.exists) throw new Error('No se encontró el documento de empresa.');
  if (companyDoc.data()?.ownerId !== adminUid) throw new Error('El propietario de la empresa no coincide con la cuenta administradora.');
  if (!memberDoc.exists || memberDoc.data()?.role !== 'owner') throw new Error('No se pudo verificar la membresía owner.');
  if (!settingsDoc.exists) throw new Error('No se encontró la configuración inicial de empresa.');

  console.log('\n🔍 Verificación completada');
  console.log('   ✅ Usuario administrador y empresa');
  console.log('   ✅ Membresía con rol owner');
  console.log('   ✅ Configuración de empresa');
  console.log(`   ℹ️  Proyectos existentes: ${projectsSnapshot.size}`);
  console.log(`   ℹ️  Gastos existentes: ${expensesSnapshot.size}`);
}

// ============================================================
// EJECUCIÓN PRINCIPAL
// ============================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ORIGEN ERP - CONFIGURACIÓN AUTOMÁTICA COMPLETA              ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  Usuario admin: configurado mediante variables de entorno   ║');
  console.log('║  Empresa: configurada mediante variables de entorno          ║');
  console.log('║  Proyecto Firebase: configurado mediante variables entorno  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Cargar variables de entorno
  const env = loadEnvFile(resolve(process.cwd(), '.env.local'));
  Object.assign(process.env, env);
  ADMIN_EMAIL = process.env.SETUP_ADMIN_EMAIL || '';
  ADMIN_PASSWORD = process.env.SETUP_ADMIN_PASSWORD || '';
  COMPANY_ID = process.env.SETUP_COMPANY_ID || '';
  COMPANY_NAME = process.env.SETUP_COMPANY_NAME || '';
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !COMPANY_ID || !COMPANY_NAME) {
    console.error('Faltan SETUP_ADMIN_EMAIL, SETUP_ADMIN_PASSWORD, SETUP_COMPANY_ID o SETUP_COMPANY_NAME.');
    process.exit(1);
  }
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(ADMIN_EMAIL)) {
    console.error('SETUP_ADMIN_EMAIL no tiene un formato válido.');
    process.exit(1);
  }
  if (ADMIN_PASSWORD.length < 12) {
    console.error('SETUP_ADMIN_PASSWORD debe tener al menos 12 caracteres.');
    process.exit(1);
  }
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(COMPANY_ID)) {
    console.error('SETUP_COMPANY_ID solo puede contener letras, números, guion y guion bajo (máximo 128 caracteres).');
    process.exit(1);
  }
  if (process.env.CONFIRM_FIREBASE_SETUP !== 'YES') {
    console.error('Operación bloqueada: define CONFIRM_FIREBASE_SETUP=YES para confirmar escrituras en Firebase.');
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
    await verifySetup(auth, db, adminUser.uid);

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONFIGURACIÓN COMPLETADA EXITOSAMENTE                     ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  Cuenta creada/verificada. La contraseña no se imprime.      ║');
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
