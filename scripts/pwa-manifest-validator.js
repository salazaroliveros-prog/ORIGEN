/**
 * Script para validar el manifiesto PWA
 * Verifica que todos los iconos referenciados existan
 * Uso: node scripts/pwa-manifest-validator.js
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '../public/site.webmanifest');
const PUBLIC_DIR = path.join(__dirname, '../public');

console.log('🔍 Validando manifiesto PWA...');

try {
  const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestContent);

  console.log('✅ Manifiesto cargado correctamente');
  console.log(`   Nombre: ${manifest.name}`);
  console.log(`   Nombre corto: ${manifest.short_name}`);
  console.log(`   Modo de visualización: ${manifest.display}`);
  console.log('');

  // Validar iconos
  console.log('📁 Validando iconos...');
  let allIconsExist = true;

  if (manifest.icons && Array.isArray(manifest.icons)) {
    manifest.icons.forEach((icon, index) => {
      const iconPath = path.join(PUBLIC_DIR, icon.src.replace(/^\//, ''));
      const exists = fs.existsSync(iconPath);

      if (exists) {
        const stats = fs.statSync(iconPath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`   ✅ ${icon.sizes} (${icon.purpose}): ${icon.src} (${sizeKB} KB)`);
      } else {
        console.log(`   ❌ ${icon.sizes}: ${icon.src} - ARCHIVO NO ENCONTRADO`);
        allIconsExist = false;
      }
    });
  }

  // Validar shortcuts
  if (manifest.shortcuts && Array.isArray(manifest.shortcuts)) {
    console.log('');
    console.log('🔗 Validando shortcuts...');
    manifest.shortcuts.forEach((shortcut, index) => {
      console.log(`   ${index + 1}. ${shortcut.name} → ${shortcut.url}`);
      if (shortcut.icons && shortcut.icons[0]) {
        const iconPath = path.join(PUBLIC_DIR, shortcut.icons[0].src.replace(/^\//, ''));
        const exists = fs.existsSync(iconPath);
        if (exists) {
          console.log(`      ✅ Icono: ${shortcut.icons[0].src}`);
        } else {
          console.log(`      ❌ Icono: ${shortcut.icons[0].src} - NO ENCONTRADO`);
          allIconsExist = false;
        }
      }
    });
  }

  console.log('');
  if (allIconsExist) {
    console.log('✅ Todos los iconos del manifiesto existen');
  } else {
    console.log('⚠️  Algunos iconos del manifiesto no existen');
  }

  // Validar campos requeridos
  console.log('');
  console.log('📋 Validando campos requeridos...');
  const requiredFields = [
    'name',
    'short_name',
    'start_url',
    'display',
    'theme_color',
    'background_color',
  ];
  const missingFields = requiredFields.filter((field) => !manifest[field]);

  if (missingFields.length === 0) {
    console.log('✅ Todos los campos requeridos están presentes');
  } else {
    console.log('❌ Campos faltantes:', missingFields.join(', '));
  }

  console.log('');
  console.log('🎯 Validación completada');
} catch (error) {
  console.error('❌ Error validando manifiesto:', error.message);
  process.exit(1);
}
