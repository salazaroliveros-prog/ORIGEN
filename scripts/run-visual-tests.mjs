#!/usr/bin/env node

import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { mkdirSync } from 'fs';

const args = process.argv.slice(2);
const isHeaded = args.includes('--headed');
const isUI = args.includes('--ui');
const isDebug = args.includes('--debug');

// Crear directorios
mkdirSync('screenshots', { recursive: true });
mkdirSync('test-results', { recursive: true });

console.log('🎬 Iniciando pruebas visuales responsivas...\n');
console.log('📊 Configuración:');
console.log(`   • Navegadores: Chrome, Firefox, Safari`);
console.log(`   • Desktop: 1920x1080`);
console.log(`   • Tablets: iPad (1024x1366), Galaxy (1280x800)`);
console.log(`   • Móviles: iPhone (390x844), iPhone SE (375x667), Galaxy S8 (360x740)`);
console.log(`   • Modo headed: ${isHeaded ? 'Sí ✓' : 'No'}`);
console.log(`   • Modo UI: ${isUI ? 'Sí ✓' : 'No'}\n`);

const command = 'npx';
const playwrightArgs = [
  'playwright',
  'test',
  '--config',
  'playwright.visual.config.ts',
];

if (isHeaded) playwrightArgs.push('--headed');
if (isUI) playwrightArgs.push('--ui');
if (isDebug) playwrightArgs.push('--debug');

const proc = spawn(command, playwrightArgs, {
  stdio: 'inherit',
  shell: true,
});

proc.on('close', (code) => {
  console.log('\n' + '='.repeat(60));
  if (code === 0) {
    console.log('✅ Pruebas visuales completadas exitosamente');
    console.log('\n📸 Resultados:');
    console.log('   • Screenshots: ./screenshots/');
    console.log('   • Reporte HTML: ./test-results/visual-html/index.html');
    console.log('   • Reporte JSON: ./test-results/visual.json');
  } else {
    console.log(`❌ Pruebas finalizaron con código ${code}`);
  }
  console.log('='.repeat(60));
  process.exit(code);
});
