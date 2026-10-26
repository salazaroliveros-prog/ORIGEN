/**
 * Script para generar iconos PWA automáticamente
 * Requiere: pwa-asset-generator (instalado globalmente o como devDependency)
 * Uso: node scripts/generate-pwa-icons.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SOURCE_ICON = path.join(__dirname, '../public/assets/branding/icon-512x512.png');
const OUTPUT_DIR = path.join(__dirname, '../public/assets/branding/generated');
const MANIFEST_PATH = path.join(__dirname, '../public/site.webmanifest');

console.log('🎨 Generando iconos PWA...');
console.log('📁 Icono fuente:', SOURCE_ICON);
console.log('📁 Directorio salida:', OUTPUT_DIR);

// Crear directorio de salida si no existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('✅ Directorio creado:', OUTPUT_DIR);
}

try {
  // Generar iconos con pwa-asset-generator
  const command = `npx pwa-asset-generator "${SOURCE_ICON}" "${OUTPUT_DIR}" --background "#0f172a" --padding "none" --opaque false --manifest "${MANIFEST_PATH}" --index false --xhtml false --splash false`;

  console.log('⚙️ Ejecutando comando...');
  execSync(command, { stdio: 'inherit' });

  console.log('✅ Iconos PWA generados exitosamente');
  console.log('📂 Revisa el directorio:', OUTPUT_DIR);
  console.log('');
  console.log('📝 Siguientes pasos:');
  console.log('1. Copia los iconos generados a public/assets/branding/');
  console.log('2. Actualiza site.webmanifest con las nuevas rutas');
  console.log('3. Actualiza app/layout.tsx si es necesario');
} catch (error) {
  console.error('❌ Error generando iconos:', error.message);
  console.log('');
  console.log('💡 Solución alternativa:');
  console.log('   Visita https://realfavicongenerator.net/ para generar iconos online');
  process.exit(1);
}
