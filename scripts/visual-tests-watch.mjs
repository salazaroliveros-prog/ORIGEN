#!/usr/bin/env node

/**
 * Visual Test Watch Mode
 * Monitorea cambios en tests y reruns automáticamente
 */

import { watch } from 'fs';
import { spawn } from 'child_process';
import { resolve } from 'path';

const watchDirs = [
  'e2e/visual',
  'src',
  'app',
  'components',
];

let testProcess = null;
let debounceTimer = null;

function runTests() {
  if (testProcess) {
    testProcess.kill();
  }

  console.clear();
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   👀 VISUAL TEST WATCH MODE                               ║
║   ${new Date().toLocaleTimeString()}                           ║
╚════════════════════════════════════════════════════════════╝
  `);

  testProcess = spawn('npx', [
    'playwright',
    'test',
    '--config',
    'playwright.visual.config.ts',
    '--workers=2',
  ], {
    stdio: 'inherit',
    shell: true,
  });

  testProcess.on('close', (code) => {
    console.log(`
Test run completed with code: ${code}
Watching for changes...
  `);
  });
}

console.log(`
╔════════════════════════════════════════════════════════════╗
║   🔍 Starting Visual Test Watch Mode                       ║
║   Monitorando cambios en:                                  ║
║   ${watchDirs.join(', ')}                                 ║
║                                                            ║
║   Presiona Ctrl+C para salir                              ║
╚════════════════════════════════════════════════════════════╝
  `);

// Inicial run
runTests();

// Watch for changes
watchDirs.forEach((dir) => {
  watch(resolve(dir), { recursive: true }, (eventType, filename) => {
    if (filename && (filename.endsWith('.ts') || filename.endsWith('.tsx'))) {
      console.log(`📝 Cambio detectado: ${dir}/${filename}`);

      // Debounce para evitar múltiples runs
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        runTests();
      }, 1000);
    }
  });
});

// Handle exit
process.on('SIGINT', () => {
  console.log('\n👋 Saliendo del watch mode...');
  if (testProcess) testProcess.kill();
  process.exit(0);
});
