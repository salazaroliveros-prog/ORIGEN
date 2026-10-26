/**
 * Script para optimizar imágenes del proyecto
 * Optimiza automáticamente todas las imágenes en public/assets/branding/
 * Requiere: sharp (instalado como devDependency)
 * Uso: node scripts/optimize-images.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../public/assets/branding');
const OPTIMIZED_DIR = path.join(__dirname, '../public/assets/branding/optimized');

console.log('🖼️  Optimizando imágenes...');
console.log('📁 Directorio origen:', ASSETS_DIR);
console.log('📁 Directorio destino:', OPTIMIZED_DIR);

// Crear directorio de salida
if (!fs.existsSync(OPTIMIZED_DIR)) {
  fs.mkdirSync(OPTIMIZED_DIR, { recursive: true });
}

const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
const files = fs.readdirSync(ASSETS_DIR);

let optimizedCount = 0;
let totalSaved = 0;

files.forEach((file) => {
  const ext = path.extname(file).toLowerCase();

  if (!imageExtensions.includes(ext)) return;

  const inputPath = path.join(ASSETS_DIR, file);
  const outputPath = path.join(OPTIMIZED_DIR, file);

  // Obtener tamaño original
  const originalSize = fs.statSync(inputPath).size;

  sharp(inputPath)
    .png({ quality: 85, compressionLevel: 9 })
    .toFile(outputPath, (err, info) => {
      if (err) {
        console.error(`❌ Error optimizando ${file}:`, err.message);
        return;
      }

      const optimizedSize = info.size;
      const savedBytes = originalSize - optimizedSize;
      const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);

      optimizedCount++;
      totalSaved += savedBytes;

      console.log(
        `✅ ${file}: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${savedPercent}% reducido)`
      );
    });
});

setTimeout(() => {
  console.log('');
  console.log('📊 Resumen:');
  console.log(`   Imágenes optimizadas: ${optimizedCount}`);
  console.log(`   Espacio ahorrado: ${formatBytes(totalSaved)}`);
  console.log(`   Directorio destino: ${OPTIMIZED_DIR}`);
  console.log('');
  console.log(
    '💡 Tip: Reemplaza las imágenes originales con las optimizadas cuando estés satisfecho con los resultados'
  );
}, 1000);

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
