#!/usr/bin/env node

/**
 * Visual Baseline Generator
 * Genera screenshots de referencia para comparación posterior
 */

import { execSync } from 'child_process';
import { mkdirSync, copyFileSync, readdirSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const isCI = process.env.CI === 'true';
const shouldUseAllBrowsers = args.includes('--all');
const shouldUseChrome = args.includes('--chrome');
const browsers = shouldUseAllBrowsers ? [] : shouldUseChrome ? ['chrome'] : [];

console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   📸 Visual Baseline Generator                             ║
║   Generando screenshots de referencia para tests           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

Configuración:
  • CI Mode: ${isCI ? 'Sí' : 'No'}
  • Browsers: ${browsers.length > 0 ? browsers.join(', ') : 'All (Chrome, Firefox, Safari)'}
  • Output: ./test-baselines/

⏳ Ejecutando pruebas visuales...
`);

try {
  // Crear directorio de baselines
  mkdirSync('test-baselines', { recursive: true });
  mkdirSync('test-baselines/screenshots', { recursive: true });

  // Ejecutar tests
  let cmd = 'npx playwright test --config playwright.visual.config.ts';
  
  if (isCI) {
    cmd += ' --workers=1';
  } else {
    cmd += ' --workers=4';
  }

  if (browsers.length > 0) {
    browsers.forEach((browser) => {
      cmd += ` --project=${browser}`;
    });
  }

  console.log(`Ejecutando: ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit' });

  // Copiar screenshots a baselines
  console.log('\n📋 Copiando screenshots a test-baselines/...');
  
  try {
    const screenshotDir = 'screenshots';
    const files = readdirSync(screenshotDir, { recursive: true });

    let copied = 0;
    files.forEach((file) => {
      const src = join(screenshotDir, String(file));
      const dst = join('test-baselines/screenshots', String(file));
      
      // Crear directorios si es necesario
      const fileStr = String(file);
      const lastSlashIndex = fileStr.lastIndexOf('/');
      const dir = lastSlashIndex >= 0 ? join('test-baselines/screenshots', fileStr.substring(0, lastSlashIndex)) : 'test-baselines/screenshots';
      mkdirSync(dir, { recursive: true });
      
      try {
        copyFileSync(src, dst);
        copied++;
      } catch (e) {
        // Skip directories
      }
    });

    console.log(`✅ ${copied} screenshots copiados a test-baselines/\n`);
  } catch (e) {
    console.error('⚠️  No hay screenshots para copiar aún');
  }

  // Crear índice de baselines
  const baselineIndex = {
    createdAt: new Date().toISOString(),
    ci: isCI,
    browsers: browsers.length > 0 ? browsers : ['chrome', 'firefox', 'webkit'],
    totalScreenshots: 0,
    suites: [
      'e2e/visual/visual-responsiveness.spec.ts',
      'e2e/visual/login-flow.spec.ts',
      'e2e/visual/dashboard-responsiveness.spec.ts',
      'e2e/visual/interactive-components.spec.ts',
    ],
  };

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ✅ Baseline Generation Complete                          ║
║                                                            ║
║   📂 Ubicación: test-baselines/                            ║
║   📊 Suites: ${baselineIndex.suites.length}                             ║
║   🎨 Navegadores: ${baselineIndex.browsers.join(', ')}     ║
║                                                            ║
║   Próximo: Ejecutar pruebas nuevamente para comparar      ║
║   $ npm run test:visual:compare                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  process.exit(0);
} catch (error) {
  console.error('❌ Error generando baselines:', error);
  process.exit(1);
}
