#!/usr/bin/env node

/**
 * Visual Testing Setup & Runner
 * Ejecuta Playwright visual tests con Chromium, Firefox, Safari
 */

import { spawn, execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import chalk from 'chalk';

const commands = process.argv.slice(2);
const isHeaded = commands.includes('--headed');
const isUI = commands.includes('--ui');
const isLocal = commands.includes('--local');
const isDocker = commands.includes('--docker');
const isDebug = commands.includes('--debug');
const isFast = commands.includes('--fast');

// Crear directorios
mkdirSync('screenshots', { recursive: true });
mkdirSync('screenshots/login', { recursive: true });
mkdirSync('screenshots/login/workflow', { recursive: true });
mkdirSync('test-results', { recursive: true });

console.log(`
╔═══════════════════════════════════════════════════════╗
║   🎬 ORIGEN ERP - Visual Testing Suite               ║
║   Playwright with Chromium, Firefox, WebKit           ║
╚═══════════════════════════════════════════════════════╝

📊 Configuration:
   Mode: ${isDocker ? '🐳 Docker' : isLocal ? '💻 Local' : '🔄 Auto-detect'}
   Headed: ${isHeaded ? '✓ Yes' : '✗ No'}
   UI: ${isUI ? '✓ Yes' : '✗ No'}
   Debug: ${isDebug ? '✓ Yes' : '✗ No'}
   Fast mode: ${isFast ? '✓ Yes' : '✗ No'}

📱 Devices:
   • Desktop: Chrome, Firefox, Safari (1920x1080)
   • Tablet: iPad Pro, iPad Mini, Galaxy Tab
   • Mobile: iPhone 14/SE, Pixel 7, Galaxy S8/S21

🎯 Tests:
   1. Visual Responsiveness
   2. Login Flow Validation
   3. Input Field Interaction
   4. Button States & Hover
   5. Keyboard Navigation
   6. Performance Metrics

`);

// Configurar argumentos para Playwright
const playwrightArgs = ['playwright', 'test', '--config', 'playwright.visual.config.ts'];

if (isHeaded) playwrightArgs.push('--headed');
if (isUI) playwrightArgs.push('--ui');
if (isDebug) playwrightArgs.push('--debug');
if (isFast) {
  playwrightArgs.push('--workers=4');
  playwrightArgs.push('--retries=0');
}

console.log(`\n▶️  Iniciando pruebas...\n`);

// Ejecutar Playwright
const proc = spawn('npx', playwrightArgs, {
  stdio: 'inherit',
  shell: true,
});

proc.on('close', (code) => {
  console.log('\n' + '═'.repeat(60));

  if (code === 0) {
    console.log('✅ Visual tests completadas exitosamente\n');

    console.log('📸 Screenshots disponibles en:');
    console.log('   • screenshots/login/');
    console.log('   • screenshots/login/workflow/\n');

    console.log('📊 Reportes HTML:');
    console.log('   📖 Abrir: test-results/visual-html/index.html\n');

    if (!isHeaded && !isUI && !isDebug) {
      console.log('💡 Tips:');
      console.log('   npm run test:visual:headed    - Con navegador visible');
      console.log('   npm run test:visual:ui        - Interfaz interactiva');
      console.log('   npm run test:visual:debug     - Modo paso a paso\n');
    }
  } else {
    console.log(`❌ Tests finalizaron con código ${code}\n`);
    console.log('🔧 Troubleshooting:');
    console.log('   • npm run test:visual:headed  - Debug interactivo');
    console.log('   • npx playwright test --debug - Modo trace');
    console.log('   • npm run dev                 - Verificar app corriendo\n');
  }

  console.log('═'.repeat(60) + '\n');
  process.exit(code);
});
