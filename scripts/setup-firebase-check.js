/**
 * SCRIPT DE VERIFICACIÓN Y CONFIGURACIÓN DE FIREBASE - ORIGEN ConstructERP
 * Ejecutar con: node scripts/setup-firebase-check.js
 * 
 * Este script verifica que toda la configuración de Firebase esté completa
 * y lista para conectarse con datos reales.
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

function checkEnvVar(varName, description, isOptional = false) {
  const value = process.env[varName];
  if (value && value.trim() !== '') {
    console.log(`✅ ${description}: ${varName}=${value.substring(0, 10)}...`);
    return true;
  } else if (isOptional) {
    console.warn(`⚠️  ${description}: ${varName} (opcional, no configurado)`);
    return true;
  } else {
    console.error(`❌ ${description}: ${varName} - NO CONFIGURADO`);
    return false;
  }
}

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║  VERIFICACIÓN DE CONFIGURACIÓN FIREBASE - ORIGEN ConstructERP  ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

let allOk = true;

// 1. Verificar archivos de configuración crítica
console.log('📁 ARCHIVOS DE CONFIGURACIÓN:');
allOk &= checkFile('firebase.json', 'Firebase config');
allOk &= checkFile('.firebaserc', 'Firebase project config');
allOk &= checkFile('firestore.rules', 'Firestore security rules');
allOk &= checkFile('firestore.indexes.json', 'Firestore indexes');
allOk &= checkFile('lib/config.ts', 'Firebase runtime config');
allOk &= checkFile('lib/firebaseService.ts', 'Firebase service');
allOk &= checkFile('lib/firebaseAuth.ts', 'Firebase Auth service');
allOk &= checkFile('app/api/firebase-config.js/route.ts', 'Firebase config API route');
console.log('');

// 2. Verificar variables de entorno
console.log('🔑 VARIABLES DE ENTORNO (requeridas para producción):');
const requiredEnv = [
  ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'ID del proyecto Firebase'],
  ['NEXT_PUBLIC_FIREBASE_API_KEY', 'API Key pública de Firebase'],
  ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'Dominio de autenticación Firebase'],
  ['NEXT_PUBLIC_FIREBASE_APP_ID', 'ID de la aplicación Firebase'],
  ['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'Bucket de almacenamiento Firebase'],
  ['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'ID del remitente de mensajería'],
  ['NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', 'ID de medición de Analytics'],
];

for (const [varName, desc] of requiredEnv) {
  allOk &= checkEnvVar(varName, desc);
}

console.log('');
console.log('🔑 VARIABLES DE ENTORNO (opcionales):');
allOk &= checkEnvVar('NEXT_PUBLIC_FIREBASE_VAPID_KEY', 'VAPID key para notificaciones FCM', true);
allOk &= checkEnvVar('GEMINI_API_KEY', 'API key de Gemini para asistente IA', true);
allOk &= checkEnvVar('PRIMARY_ADMIN_EMAIL', 'Email del administrador principal', true);
console.log('');

// 3. Verificar dependencias instaladas
console.log('📦 DEPENDENCIAS CRÍTICAS:');
const criticalDeps = ['firebase', 'zod', 'next', 'react', 'react-dom', 'vitest'];
for (const dep of criticalDeps) {
  const depPath = path.join(ROOT, 'node_modules', dep);
  if (fs.existsSync(depPath)) {
    console.log(`✅ ${dep}: instalado`);
  } else {
    console.error(`❌ ${dep}: NO instalado`);
    allOk = false;
  }
}
console.log('');

// 4. Verificar colecciones Firestore esperadas en reglas
console.log('📋 COLECCIONES FIRESTORE EN REGLAS:');
const rulesContent = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
const expectedCollections = [
  'projects', 'expenses', 'attendance', 'fieldVisits', 'employees',
  'employeeDirectory', 'quotes', 'machinery', 'machineryLogs', 'apuItems',
  'companySettings', 'fcm_tokens', 'project_alerts'
];
for (const coll of expectedCollections) {
  if (rulesContent.includes(`match /${coll}/`)) {
    console.log(`✅ ${coll}: regla definida`);
  } else {
    console.error(`❌ ${coll}: regla NO definida`);
    allOk = false;
  }
}
console.log('');

// 5. Verificar índices Firestore
console.log('🔍 ÍNDICES FIRESTORE:');
const indexesContent = JSON.parse(fs.readFileSync(path.join(ROOT, 'firestore.indexes.json'), 'utf8'));
console.log(`✅ Total de índices definidos: ${indexesContent.indexes.length}`);
console.log('');

// 6. Resumen final
console.log('╔═══════════════════════════════════════════════════════════════════╗');
if (allOk) {
  console.log('║  ✅ TODA LA CONFIGURACIÓN ESTÁ COMPLETA                         ║');
  console.log('║  El sistema está listo para conectarse con Firebase real.       ║');
} else {
  console.log('║  ⚠️  HAY PROBLEMAS QUE DEBEN RESOLVERSE ANTES DE USAR DATOS     ║');
  console.log('║  REALES. Revisa los errores marcados arriba.                    ║');
}
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

process.exit(allOk ? 0 : 1);