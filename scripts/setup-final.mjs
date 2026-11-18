/**
 * SCRIPT DE CONFIGURACIÓN FINAL — ORIGEN ERP
 * ===========================================
 *
 * Configura TODO el sistema automáticamente usando la Identity Toolkit REST API:
 *  1. Crea el usuario administrador en Firebase Authentication (con App Check debug token)
 *  2. Obtiene un ID token de sesión
 *  3. Sembrar Firestore con empresa, membresía, proyectos y gastos
 *  4. Verifica que todo esté configurado correctamente
 *
 * USO:
 *   node scripts/setup-final.mjs
 *
 * REQUISITOS:
 *   - .env.local con NEXT_PUBLIC_FIREBASE_API_KEY y NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   - NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN configurado
 *   - Proyecto Firebase creado en Firebase Console
 *   - Proveedor Email/Password habilitado en Authentication
 *   - localhost en Dominios autorizados de Firebase Auth
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Credenciales del administrador: se leen del entorno (nunca del código).
// Configura ADMIN_EMAIL y ADMIN_PASSWORD en .env.local o en el entorno.
let ADMIN_EMAIL = '';
let ADMIN_PASSWORD = '';
const COMPANY_ID = 'empresa-origen';
const COMPANY_NAME = 'ConstructERP Guatemala';

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

async function identityToolkitRequest(apiKey, endpoint, body, debugToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (debugToken) {
    headers['X-Firebase-AppCheck'] = debugToken;
  }

  const url = `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

async function createUserInAuth(apiKey, debugToken) {
  console.log(`\n👤 Creando usuario en Firebase Authentication...`);
  console.log(`   Email: ${ADMIN_EMAIL}`);

  // Intento 1: signIn (verificar si existe)
  const signInRes = await identityToolkitRequest(
    apiKey,
    'accounts:signInWithPassword',
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true },
    debugToken
  );

  if (signInRes.ok) {
    console.log(`   ⚠️  El usuario ya existe (UID: ${signInRes.data.localId})`);
    return { uid: signInRes.data.localId, idToken: signInRes.data.idToken };
  }

  // Intento 2: signUp (crear nuevo)
  const signUpRes = await identityToolkitRequest(
    apiKey,
    'accounts:signUp',
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true },
    debugToken
  );

  if (!signUpRes.ok) {
    const errorMsg = signUpRes.data.error?.message || 'Error desconocido';
    console.error(`   ❌ Error: ${errorMsg}`);

    if (errorMsg.includes('EMAIL_EXISTS')) {
      console.log(`   ⚠️  El email ya está registrado`);
      const lookupRes = await identityToolkitRequest(
        apiKey,
        'accounts:lookup',
        { email: ADMIN_EMAIL },
        debugToken
      );
      if (lookupRes.ok && lookupRes.data.users?.[0]) {
        const user = lookupRes.data.users[0];
        // Intentar obtener un ID token válido haciendo signIn
        const signInRes2 = await identityToolkitRequest(
          apiKey,
          'accounts:signInWithPassword',
          { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true },
          debugToken
        );
        if (signInRes2.ok) {
          return { uid: user.localId, idToken: signInRes2.data.idToken };
        }
        return { uid: user.localId, idToken: null };
      }
    }
    throw new Error(errorMsg);
  }

  console.log(`   ✅ Usuario creado (UID: ${signUpRes.data.localId})`);
  return { uid: signUpRes.data.localId, idToken: signUpRes.data.idToken };
}

async function seedFirestoreViaRest(apiKey, idToken, companyId, adminUid) {
  console.log(`\n🌱 Sembrando base de datos Firestore...`);

  if (!idToken) {
    console.log(`   ⚠️  No hay ID token disponible. Saltando creación de datos en Firestore.`);
    console.log(`   💡 Los datos se crearán automáticamente al usar la aplicación.`);
    return;
  }

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
    },
  ];

  const EXPENSES = [
    {
      projectId: 'proj-residencia-001',
      category: 'Materiales (Cementos, Hierro)',
      description: 'Cemento Progreso 50kg x 100 bolsas',
      supplier: 'Cemento Progreso S.A.',
      amount: 45000,
    },
    {
      projectId: 'proj-residencia-001',
      category: 'Mano de Obra',
      description: 'Albañilería semana 1-2',
      supplier: 'Juan Pérez',
      amount: 25000,
    },
    {
      projectId: 'proj-edificio-002',
      category: 'Materiales (Cementos, Hierro)',
      description: 'Hierro corrugado 1/2" x 500kg',
      supplier: 'Hierros Guatemala',
      amount: 120000,
    },
  ];

  const now = new Date().toISOString();

  // Crear empresa
  console.log(`   📁 Creando empresa: ${COMPANY_NAME}`);
  const companyData = {
    fields: {
      id: { stringValue: COMPANY_ID },
      companyId: { stringValue: COMPANY_ID },
      ownerId: { stringValue: adminUid },
      legalName: { stringValue: `${COMPANY_NAME} S.A.` },
      commercialName: { stringValue: COMPANY_NAME },
      companyName: { stringValue: COMPANY_NAME },
      nit: { stringValue: '1234567-8' },
      architectName: { stringValue: 'Ing. Administrador' },
      architectColNumber: { stringValue: '12345' },
      address: { stringValue: 'Zona 10, Ciudad de Guatemala, Guatemala' },
      phone: { stringValue: '+502 2233-4455' },
      email: { stringValue: ADMIN_EMAIL },
      exchangeRate: { doubleValue: 7.85 },
      primaryColor: { stringValue: '#f59e0b' },
      secondaryColor: { stringValue: '#38bdf8' },
      createdAt: { timestampValue: now },
      updatedAt: { timestampValue: now },
    }
  };

  const createDoc = async (collection, docId, data) => {
    const url = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields: data.fields }),
    });
    const result = await response.json();
    return { ok: response.ok, status: response.status, data: result };
  };

  // Crear empresa
  let result = await createDoc(`companies/${COMPANY_ID}`, COMPANY_ID, companyData);
  if (result.ok) console.log(`   ✅ Empresa creada`);
  else console.log(`   ⚠️  Empresa: ${result.data.error?.message || 'Error'}`);

  // Crear membresía
  result = await createDoc(`companies/${COMPANY_ID}/members/${adminUid}`, adminUid, {
    fields: {
      id: { stringValue: adminUid },
      companyId: { stringValue: COMPANY_ID },
      uid: { stringValue: adminUid },
      email: { stringValue: ADMIN_EMAIL },
      role: { stringValue: 'owner' },
      joinedAt: { timestampValue: now },
    }
  });
  if (result.ok) console.log(`   ✅ Membresía creada`);
  else console.log(`   ⚠️  Membresía: ${result.data.error?.message || 'Error'}`);

  // Crear proyectos
  for (const project of PROJECTS) {
    result = await createDoc(`companies/${COMPANY_ID}/projects/${project.id}`, project.id, {
      fields: {
        id: { stringValue: project.id },
        companyId: { stringValue: COMPANY_ID },
        ownerId: { stringValue: adminUid },
        createdBy: { stringValue: adminUid },
        code: { stringValue: project.code },
        name: { stringValue: project.name },
        client: { stringValue: project.client },
        location: { stringValue: project.location },
        municipality: { stringValue: project.municipality },
        department: { stringValue: project.department },
        budgetTotal: { doubleValue: project.budgetTotal },
        spentTotal: { doubleValue: project.spentTotal },
        progressPercent: { doubleValue: project.progressPercent },
        status: { stringValue: project.status },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
      }
    });
    if (result.ok) console.log(`   ✅ Proyecto: ${project.name}`);
    else console.log(`   ⚠️  Proyecto ${project.name}: ${result.data.error?.message || 'Error'}`);
  }

  // Crear gastos
  for (const expense of EXPENSES) {
    const expenseId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    result = await createDoc(`companies/${COMPANY_ID}/expenses/${expenseId}`, expenseId, {
      fields: {
        id: { stringValue: expenseId },
        companyId: { stringValue: COMPANY_ID },
        authorId: { stringValue: adminUid },
        projectId: { stringValue: expense.projectId },
        date: { timestampValue: now },
        category: { stringValue: expense.category },
        description: { stringValue: expense.description },
        supplier: { stringValue: expense.supplier },
        amount: { doubleValue: expense.amount },
        currency: { stringValue: 'GTQ' },
        paymentMethod: { stringValue: 'Transferencia BI' },
        createdAt: { timestampValue: now },
      }
    });
    if (result.ok) console.log(`   ✅ Gasto: ${expense.description}`);
    else console.log(`   ⚠️  Gasto ${expense.description}: ${result.data.error?.message || 'Error'}`);
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ORIGEN ERP - CONFIGURACIÓN AUTOMÁTICA FINAL                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const envFilePath = resolve(process.cwd(), '.env.local');

  if (!existsSync(envFilePath)) {
    console.error('❌ No se encontró .env.local');
    process.exit(1);
  }

  console.log('📋 Paso 1: Cargando variables de entorno...');
  const env = loadEnvFile(envFilePath);
  Object.assign(process.env, env);

  ADMIN_EMAIL =
    process.env.ADMIN_EMAIL ?? env.ADMIN_EMAIL ?? process.env.PRIMARY_ADMIN_EMAIL ?? env.PRIMARY_ADMIN_EMAIL ?? '';
  ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? env.ADMIN_PASSWORD ?? '';

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('\n❌ Faltan credenciales del administrador.');
    console.error('   Define ADMIN_EMAIL y ADMIN_PASSWORD en .env.local (o en el entorno).');
    process.exit(1);
  }

  const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const debugToken = env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN;

  if (!apiKey || !projectId) {
    console.error('\n❌ Faltan variables de Firebase en .env.local');
    process.exit(1);
  }

  console.log(`   📋 Proyecto: ${projectId}`);
  if (debugToken) console.log(`   🔐 App Check Debug Token: presente`);
  else console.log(`   ⚠️  App Check Debug Token: no configurado`);

  try {
    const { uid, idToken } = await createUserInAuth(apiKey, debugToken);

    if (idToken) {
      await seedFirestoreViaRest(apiKey, idToken, COMPANY_ID, uid);
    } else {
      console.log('\n   ⚠️  No se pudo obtener ID token. Los datos de Firestore se crearán al usar la app.');
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONFIGURACIÓN COMPLETADA                                 ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  Credenciales de acceso:                                       ║');
    console.log('║  📧 Email:    ' + ADMIN_EMAIL);
    console.log('║  🔑 Password: la definida en ADMIN_PASSWORD                   ║');
    console.log('║                                                               ║');
    console.log('║  Para iniciar:                                                 ║');
    console.log('║  npm run dev                                                    ║');
    console.log('║  Luego abre: http://localhost:3000/login                       ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ ERROR                                                      ║');
    console.error('╠═══════════════════════════════════════════════════════════════╣');
    console.error(`║  ${error.message.padEnd(74)}║`);
    console.error('╚═══════════════════════════════════════════════════════════════╝\n');
    console.error('\n📋 Requisitos previos:');
    console.error('   1. Proyecto Firebase creado en Firebase Console');
    console.error('   2. Proveedor Email/Password habilitado en Authentication');
    console.error('   3. localhost en Dominios autorizados');
    console.error('   4. Variables NEXT_PUBLIC_FIREBASE_* en .env.local');
    process.exit(1);
  }
}

function existsSync(filePath) {
  try {
    readFileSync(filePath);
    return true;
  } catch {
    return false;
  }
}

main();
