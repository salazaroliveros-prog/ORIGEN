/**
 * Script para verificar dependencias desactualizadas o con vulnerabilidades
 * Requiere: npm
 * Uso: node scripts/check-dependencies.js
 */

const { execSync } = require('child_process');

console.log('🔍 Verificando dependencias...');
console.log('');

try {
  console.log('📦 Buscando paquetes desactualizados...');
  execSync('npm outdated', { stdio: 'inherit' });

  console.log('');
  console.log('🔒 Buscando vulnerabilidades de seguridad...');
  execSync('npm audit', { stdio: 'inherit' });

  console.log('');
  console.log('✅ Verificación completada');
  console.log('');
  console.log('💡 Recomendaciones:');
  console.log('   - Actualiza paquetes desactualizados cuando sea posible');
  console.log('   - Corrige vulnerabilidades de alta severidad inmediatamente');
  console.log('   - Usa npm update para actualizar paquetes menores');
  console.log('   - Usa npm install package@latest para actualizar específicos');
} catch (error) {
  console.error('❌ Error verificando dependencias:', error.message);
  process.exit(1);
}
