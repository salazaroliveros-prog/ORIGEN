/**
 * DIAGNÓSTICO DE CONECTIVIDAD FRONTEND-BACKEND - ORIGEN ConstructERP
 * Ejecutar con: node scripts/diagnose-vercel-connection.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function checkFile(filePath, description) {
  const fullPath = path.join(ROOT, filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    console.error(`❌ ${description}: ${filePath} - NO ENCONTRADO`);
    return false;
  }
}

function readEnvFile(filePath) {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) return {};
  const content = fs.readFileSync(fullPath, 'utf8');
  const vars = {};
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...val] = line.split('=');
      vars[key.trim()] = val.join('=').trim();
    }
  });
  return vars;
}

let allOk = true;

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║  DIAGNÓSTICO DE CONECTIVIDAD FRONTEND-BACKEND - VERCEL          ║');
console.log('║  ORIGEN ConstructERP Guatemala                                   ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const envVars = readEnvFile('.env.local');

console.log('📁 ARCHIVO DE CONFIGURACIÓN LOCAL:');
console.log(`   .env.local: ${fs.existsSync(path.join(ROOT, '.env.local')) ? 'EXISTE' : 'NO EXISTE'}`);
console.log(`   Variables encontradas: ${Object.keys(envVars).length}`);
console.log('');

console.log('🔑 VARIABLES DE ENTORNO FIREBASE (requeridas para conexión backend):');
const firebaseVars = [
  ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'ID del proyecto Firebase'],
  ['NEXT_PUBLIC_FIREBASE_API_KEY', 'API Key pública'],
  ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'Dominio de autenticación'],
  ['NEXT_PUBLIC_FIREBASE_APP_ID', 'ID de la aplicación'],
  ['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'Bucket de almacenamiento'],
  ['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'ID del remitente'],
  ['NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', 'ID de medición'],
  ['NEXT_PUBLIC_FIRESTORE_DATABASE_ID', 'ID de base de datos Firestore'],
];

for (const [varName, desc] of firebaseVars) {
  const val = envVars[varName];
  if (val && val.trim() !== '') {
    console.log(`   ✅ ${desc}: ${varName}=${val.substring(0, 20)}...`);
  } else {
    console.error(`   ❌ ${desc}: ${varName} - NO CONFIGURADO`);
    allOk = false;
  }
}
console.log('');
console.log('🛣️  RUTAS API DEL BACKEND (Next.js API Routes):');
const apiRoutes = [
  ['app/api/firebase-config.js/route.ts', 'Configuración Firebase para el frontend'],
  ['app/api/gemini/route.ts', 'Asistente IA Gemini'],
  ['app/api/gemini/bitacora/route.ts', 'Análisis de bitácora de obra'],
  ['app/api/gemini/receipt/route.ts', 'Análisis de recibos/facturas'],
  ['app/api/upload-project-photo/route.ts', 'Subida de fotos de obra a Firebase Storage'],
  ['app/api/weather/safety-alerts/route.ts', 'Alertas meteorológicas de seguridad'],
];

for (const [filePath, desc] of apiRoutes) {
  allOk &= checkFile(filePath, desc);
}
console.log('');

console.log('🔥 ARCHIVOS CORE DE FIREBASE:');
const firebaseCore = [
  ['lib/config.ts', 'Configuración runtime de Firebase desde variables de entorno'],
  ['lib/firebaseService.ts', 'Servicio Firebase (Auth, Firestore, Storage)'],
  ['lib/firebaseAuth.ts', 'Servicio de autenticación Firebase'],
];

for (const [filePath, desc] of firebaseCore) {
  allOk &= checkFile(filePath, desc);
}
console.log('');

console.log('📋 REGLAS E ÍNDICES DE FIRESTORE:');
const firestoreFiles = [
  ['firestore.rules', 'Reglas de seguridad de Firestore'],
  ['firestore.indexes.json', 'Índices de Firestore'],
  ['firebase.json', 'Configuración de Firebase CLI'],
  ['.firebaserc', 'Configuración del proyecto Firebase'],
];

for (const [filePath, desc] of firestoreFiles) {
  allOk &= checkFile(filePath, desc);
}
console.log('');

console.log('⚡ CONFIGURACIÓN NEXT.JS PARA VERCEL:');
const vercelFiles = [
  ['next.config.ts', 'Configuración de Next.js'],
];

for (const [filePath, desc] of vercelFiles) {
  const exists = fs.existsSync(path.join(ROOT, filePath));
  if (exists) {
    console.log(`✅ ${desc}: ${filePath}`);
  } else {
    console.warn(`⚠️  ${desc}: ${filePath} - No encontrado (se usará configuración por defecto de Vercel)`);
  }
}
console.log('');

console.log('🔍 VALIDACIÓN DE RUTA firebase-config.js:');
const routeContent = fs.readFileSync(path.join(ROOT, 'app/api/firebase-config.js/route.ts'), 'utf8');
const routeChecks = [
  { name: 'Exporta función GET', pattern: 'export async function GET' },
  { name: 'Usa getFirebaseConfig', pattern: 'getFirebaseConfig()' },
  { name: 'Retorna configuración pública', pattern: 'publicConfig' },
  { name: 'Content-Type application/javascript', pattern: 'application/javascript' },
];
for (const check of routeChecks) {
  const found = routeContent.includes(check.pattern);
  console.log(`   ${found ? '✅' : '❌'} ${check.name}`);
  if (!found) allOk = false;
}
console.log('');

console.log('🔍 VALIDACIÓN DE LECTURA DE VARIABLES DE ENTORNO:');
const configContent = fs.readFileSync(path.join(ROOT, 'lib/config.ts'), 'utf8');
const configChecks = [
  { name: 'Lee NEXT_PUBLIC_FIREBASE_PROJECT_ID', pattern: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID' },
  { name: 'Lee NEXT_PUBLIC_FIREBASE_API_KEY', pattern: 'NEXT_PUBLIC_FIREBASE_API_KEY' },
  { name: 'Lee NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', pattern: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN' },
  { name: 'Lee NEXT_PUBLIC_FIREBASE_APP_ID', pattern: 'NEXT_PUBLIC_FIREBASE_APP_ID' },
  { name: 'Función hasFirebaseRuntimeConfig', pattern: 'hasFirebaseRuntimeConfig' },
];
for (const check of configChecks) {
  const found = configContent.includes(check.pattern);
  console.log(`   ${found ? '✅' : '❌'} ${check.name}`);
  if (!found) allOk = false;
}
console.log('');

console.log('🔍 VALIDACIÓN DE CREDENCIALES DE FIREBASE EN .env.local:');
const expectedKeys = [
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
];
for (const key of expectedKeys) {
  const val = envVars[key];
  if (val && val.trim() !== '') {
    console.log(`   ✅ ${key}: configurado`);
  } else {
    console.error(`   ❌ ${key}: faltante en .env.local`);
    allOk = false;
  }
}
console.log('');

console.log('╔═══════════════════════════════════════════════════════════════════╗');
if (allOk) {
  console.log('║  ✅ DIAGNÓSTICO COMPLETADO: TODO LISTO PARA VERCEL              ║');
  console.log('║  El frontend está correctamente configurado para conectarse     ║');
  console.log('║  con el backend Firebase en producción.                         ║');
} else {
  console.log('║  ⚠️  DIAGNÓSTICO COMPLETADO: HAY PROBLEMAS QUE RESOLVER         ║');
  console.log('║  Revisa los errores marcados arriba antes de desplegar.         ║');
}
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

console.log('📋 INSTRUCCIONES PARA DESPLIEGUE EN VERCEL:');
console.log('   1. Ve a https://vercel.com/dashboard');
console.log('   2. Selecciona tu proyecto ORIGEN');
console.log('   3. Ve a Settings > Environment Variables');
console.log('   4. Agrega todas las variables de .env.local');
console.log('   5. Asegúrate de marcar Production, Preview y Development');
console.log('   6. Haz Redeploy para aplicar los cambios');
console.log('   7. Verifica que la app cargue en https://tu-proyecto.vercel.app');
console.log('   8. Prueba el inicio de sesión con Firebase Auth');

process.exit(allOk ? 0 : 1);