/**
 * SCRIPT DE CONFIGURACIÓN AUTOMÁTICA — ORIGEN ERP (v2 con manejo de App Check)
 * =================================================
 *
 * Configura TODO el sistema automáticamente usando Identity Toolkit REST API.
 * Maneja el error de Firebase App Check si está habilitado.
 *
 * USO:
 *   node scripts/setup-auto.mjs
 *
 * REQUISITOS:
 *   - .env.local con NEXT_PUBLIC_FIREBASE_API_KEY y NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   - Proyecto Firebase creado en Firebase Console
 *   - Proveedor Email/Password habilitado en Authentication
 *   - localhost en Dominios autorizados de Firebase Auth
 *   - Si App Check está habilitado: agregar NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ADMIN_EMAIL = 'salazaroliveros@gmail.com';
const ADMIN_PASSWORD = 'AngelDarioJose.2026';

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

async function ensurePrimaryAdminEmail(envFilePath) {
  const env = loadEnvFile(envFilePath);

  if (env.PRIMARY_ADMIN_EMAIL && env.PRIMARY_ADMIN_EMAIL === ADMIN_EMAIL) {
    console.log('   ✅ PRIMARY_ADMIN_EMAIL ya está configurado en .env.local');
    return true;
  }

  const lines = readFileSync(envFilePath, 'utf8').split(/\r?\n/);
  const newLines = lines.filter((line) => {
    const trimmed = line.trim();
    return !trimmed.startsWith('PRIMARY_ADMIN_EMAIL=');
  });
  newLines.push(`PRIMARY_ADMIN_EMAIL=${ADMIN_EMAIL}`);
  writeFileSync(envFilePath, newLines.join('\n') + '\n');

  console.log('   ✅ PRIMARY_ADMIN_EMAIL configurado en .env.local');
  return true;
}

async function identityToolkitRequest(apiKey, endpoint, body, debugToken) {
  const headers = { 'Content-Type': 'application/json' };
  // Agregar header de App Check debug token si está disponible
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

  // Intentar signIn primero
  const signInRes = await identityToolkitRequest(
    apiKey,
    'accounts:signInWithPassword',
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true },
    debugToken
  );

  if (signInRes.ok) {
    console.log(`   ⚠️  El usuario ya existe (UID: ${signInRes.data.localId})`);
    return signInRes.data.localId;
  }

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
        return lookupRes.data.users[0].localId;
      }
    }
    throw new Error(errorMsg);
  }

  console.log(`   ✅ Usuario creado (UID: ${signUpRes.data.localId})`);
  return signUpRes.data.localId;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ORIGEN ERP - CONFIGURACIÓN AUTOMÁTICA COMPLETA              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const envFilePath = resolve(process.cwd(), '.env.local');

  if (!existsSync(envFilePath)) {
    console.error('❌ No se encontró .env.local');
    console.error('💡 Crea el archivo .env.local copiando .env.example y agregando tus valores de Firebase');
    process.exit(1);
  }

  console.log('📋 Paso 1: Configurando variables de entorno...');
  await ensurePrimaryAdminEmail(envFilePath);

  const env = loadEnvFile(envFilePath);
  Object.assign(process.env, env);

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN;

  if (!apiKey || !projectId) {
    console.error('\n❌ Faltan variables de Firebase en .env.local');
    console.error('   Requiere: NEXT_PUBLIC_FIREBASE_API_KEY y NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    process.exit(1);
  }

  console.log(`   📋 Proyecto: ${projectId}`);
  if (debugToken) {
    console.log(`   🔐 App Check Debug Token: configurado`);
  }

  try {
    const adminUid = await createUserInAuth(apiKey, debugToken);

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONFIGURACIÓN AUTOMÁTICA COMPLETADA                       ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  Credenciales de acceso:                                       ║');
    console.log('║  📧 Email:    salazaroliveros@gmail.com                       ║');
    console.log('║  🔑 Password: AngelDarioJose.2026                             ║');
    console.log('║                                                               ║');
    console.log('║  Configuración:                                                ║');
    console.log('║  📁 PRIMARY_ADMIN_EMAIL configurado en .env.local              ║');
    console.log('║  🔥 Usuario creado en Firebase Authentication                  ║');
    console.log('║                                                               ║');
    console.log('║  Para iniciar la aplicación:                                   ║');
    console.log('║  npm run dev                                                    ║');
    console.log('║                                                               ║');
    console.log('║  Luego abre: http://localhost:3000/login                       ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('📝 Si App Check está habilitado y falló:');
    console.log('   1. Ve a Firebase Console → App Check');
    console.log('   2. Agrega un debug token o deshabilita temporalmente');
    console.log('   3. Agrega el debug token a NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN');
    console.log('   4. Vuelve a ejecutar: node scripts/setup-auto.mjs');

  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ ERROR                                                      ║');
    console.error('╠═══════════════════════════════════════════════════════════════╣');
    console.error(`║  ${error.message.padEnd(74)}║`);
    console.error('╚═══════════════════════════════════════════════════════════════╝\n');

    if (error.message.includes('App Check')) {
      console.error('🔐 App Check está bloqueando la creación del usuario:');
      console.error('   Opción A: Deshabilita App Check temporalmente en Firebase Console');
      console.error('   Opción B: Genera un debug token y agrégalo a .env.local:');
      console.error('     NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN=tu-debug-token');
      console.error('   Opción C: Crea el usuario manualmente en Firebase Console');
    }

    console.error('\n📋 Requisitos previos generales:');
    console.error('   1. Proyecto Firebase creado en Firebase Console');
    console.error('   2. Proveedor Email/Password habilitado en Authentication');
    console.error('   3. localhost agregado en Dominios autorizados');
    console.error('   4. Variables NEXT_PUBLIC_FIREBASE_* en .env.local');
    process.exit(1);
  }
}

main();
