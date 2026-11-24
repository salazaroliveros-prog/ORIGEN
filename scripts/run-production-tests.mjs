#!/usr/bin/env node

/**
 * Production Visual Testing Suite Runner
 * Ejecuta todas las pruebas visuales y genera reportes completos
 */

import { spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const outputDir = resolve('test-results/visual-production');
mkdirSync(outputDir, { recursive: true });

const startTime = Date.now();
const config = {
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'test',
  ci: process.env.CI === 'true',
  branch: process.env.GITHUB_REF || 'local',
  commitSha: process.env.GITHUB_SHA || 'unknown',
  suites: [
    'e2e/visual/visual-responsiveness.spec.ts',
    'e2e/visual/login-flow.spec.ts',
    'e2e/visual/dashboard-responsiveness.spec.ts',
    'e2e/visual/interactive-components.spec.ts',
  ],
  devices: [
    'Desktop-Chrome',
    'Desktop-Firefox',
    'Desktop-Safari',
    'Tablet-iPad',
    'Tablet-iPad-Mini',
    'Tablet-Android',
    'Mobile-iPhone14',
    'Mobile-iPhone14-Pro-Max',
    'Mobile-iPhone-SE',
    'Mobile-Pixel7',
    'Mobile-Galaxy-S8',
    'Mobile-Galaxy-S21',
  ],
};

console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 PRODUCTION VISUAL TESTING SUITE                       ║
║   Complete Test Execution                                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

📊 Configuration:
   Environment: ${config.environment.toUpperCase()}
   CI Mode: ${config.ci ? '✅ Yes' : '❌ No'}
   Branch: ${config.branch}
   Timestamp: ${config.timestamp}

📱 Test Devices: ${config.devices.length}
   ${config.devices.join(', ')}

📋 Test Suites: ${config.suites.length}
   ${config.suites.map(s => s.split('/').pop()).join(', ')}

🎯 Iniciando pruebas...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

const args = [
  'playwright',
  'test',
  '--config',
  'playwright.visual.config.ts',
  '--reporter=html,json,junit',
  `--output=${outputDir}`,
  config.ci ? '--workers=1' : '--workers=4',
];

const proc = spawn('npx', args, {
  stdio: 'inherit',
  shell: true,
});

proc.on('close', (code) => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  if (code === 0) {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ✅ ALL TESTS PASSED                                      ║
║                                                            ║
║   Duration: ${duration}s                                 ║
║   Reports: ${outputDir}                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

📊 Available Reports:
   • HTML Report: ${outputDir}/index.html
   • JSON Report: ${outputDir}/results.json
   • JUnit XML: ${outputDir}/results.xml

📸 Screenshots:
   • Location: ./screenshots/

💡 Next Steps:
   1. Review HTML report
   2. Compare screenshots
   3. Upload artifacts
    `);

    // Guardar config
    writeFileSync(`${outputDir}/config.json`, JSON.stringify(config, null, 2));
  } else {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ❌ SOME TESTS FAILED                                    ║
║                                                            ║
║   Duration: ${duration}s                                 ║
║   Exit Code: ${code}                                      ║
║                                                            ║
║   Check logs above for details                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  }

  process.exit(code);
});
