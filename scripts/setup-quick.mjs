/**
 * SCRIPT DE CONFIGURACIÓN RÁPIDA — ORIGEN ERP
 * ===============================================
 *
 * Configura TODO el sistema usando solo la API key pública de Firebase
 * (Identity Toolkit REST API). No requiere service account key.
 *
 * USO:
 *   node scripts/setup-quick.mjs
 *
 * REQUISITOS:
 *   - .env.local con NEXT_PUBLIC_FIREBASE_API_KEY y NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   - El proyecto Firebase debe existir
 *   - El proveedor Email/Password debe estar habilitado en Firebase Console
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

let ADMIN_EMAIL = '';
let ADMIN_PASSWORD = '';

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

async function identityToolkitRequest(apiKey, endpoint, body) {
  const url = `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

async function signUpUser(apiKey, email, password) {
  console.log(`\n👤 Creando usuario en Firebase Auth...`);
  console.log(`   Email: ${email}`);

  // Verificar si ya existe intentando signIn
  const signInResult = await identityToolkitRequest(apiKey, 'accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });

  if (signInResult.ok) {
    console.log(`   ⚠️  El usuario ya existe (UID: ${signInResult.data.localId})`);
    return signInResult.data.localId;
  }

  // Crear usuario
  const signUpResult = await identityToolkitRequest(apiKey, 'accounts:signUp', {
    email,
    password,
    returnSecureToken: true,
  });

  if (!signUpResult.ok) {
    const errorMsg = signUpResult.data.error?.message || 'Error desconocido';
    console.error(`   ❌ Error: ${errorMsg}`);
    if (errorMsg.includes('EMAIL_EXISTS')) {
      throw new Error(
        'El correo ya existe, pero la contraseña suministrada no permite iniciar sesión. Usa la recuperación de contraseña o el instalador completo con credenciales de servicio.'
      );
    }
    throw new Error(errorMsg);
  }

  console.log(`   ✅ Usuario creado (UID: ${signUpResult.data.localId})`);
  return signUpResult.data.localId;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ORIGEN ERP - CONFIGURACIÓN RÁPIDA (Identity Toolkit API)     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Cargar .env.local
  const env = loadEnvFile(resolve(process.cwd(), '.env.local'));
  Object.assign(process.env, env);
  ADMIN_EMAIL = process.env.SETUP_ADMIN_EMAIL || '';
  ADMIN_PASSWORD = process.env.SETUP_ADMIN_PASSWORD || '';
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Define SETUP_ADMIN_EMAIL y SETUP_ADMIN_PASSWORD.');
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
  if (process.env.CONFIRM_FIREBASE_SETUP !== 'YES') {
    console.error('Define CONFIRM_FIREBASE_SETUP=YES para confirmar la creación de cuenta.');
    process.exit(1);
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey) {
    console.error('❌ NEXT_PUBLIC_FIREBASE_API_KEY no encontrada en .env.local');
    process.exit(1);
  }

  if (!projectId) {
    console.error('❌ NEXT_PUBLIC_FIREBASE_PROJECT_ID no encontrada en .env.local');
    process.exit(1);
  }

  console.log(`📋 Proyecto Firebase: ${projectId}`);

  try {
    await signUpUser(apiKey, ADMIN_EMAIL, ADMIN_PASSWORD);

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CUENTA DE ACCESO LISTA                                     ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  Completa el registro de empresa desde el onboarding.         ║');
    console.log('║  URL de la aplicación: http://localhost:3000                  ║');
    console.log('║  Página de login:    http://localhost:3000/login              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ ERROR                                                      ║');
    console.error('╠═══════════════════════════════════════════════════════════════╣');
    console.error(`║  ${error.message.padEnd(74)}║`);
    console.error('╚═══════════════════════════════════════════════════════════════╝\n');
    console.error('💡 Verifica que:');
    console.error('   1. El proyecto Firebase exista en Firebase Console');
    console.error('   2. Email/Password esté habilitado en Authentication');
    console.error('   3. localhost esté en Dominios autorizados');
    process.exit(1);
  }
}

main();
