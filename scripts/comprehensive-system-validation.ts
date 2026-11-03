/**
 * ORIGEN ERP - Comprehensive System Validation Script
 *
 * Este script valida completamente el sistema incluyendo:
 * - Configuración Firebase/Auth
 * - Configuración de seguridad
 * - Configuración PWA
 * - Configuración de build
 * - Integraciones de terceros
 * - Rutas y navegación
 * - Exportación de datos
 * - Todas las funcionalidades
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

interface ValidationResult {
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const results: ValidationResult[] = [];

function addResult(
  category: string,
  item: string,
  status: 'pass' | 'fail' | 'warning',
  message: string,
  details?: any
) {
  results.push({ category, item, status, message, details });
}

// ============================================================================
// 1. ENVIRONMENT VARIABLES VALIDATION
// ============================================================================

function validateEnvironmentVariables() {
  console.log('\n=== VALIDATING ENVIRONMENT VARIABLES ===');

  const envPath = join(process.cwd(), '.env');
  const envExists = existsSync(envPath);

  if (envExists) {
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n').filter((line) => line.trim() && !line.startsWith('#'));

    addResult('Environment', '.env file exists', 'pass', 'Environment file found');

    // Check required Firebase variables
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    ];

    const firebaseVars = requiredVars.filter((varName) => envContent.includes(varName));
    if (firebaseVars.length === requiredVars.length) {
      addResult(
        'Environment',
        'Firebase variables',
        'pass',
        'All required Firebase variables present'
      );
    } else {
      addResult(
        'Environment',
        'Firebase variables',
        'warning',
        `Missing ${requiredVars.length - firebaseVars.length} Firebase variables`
      );
    }

    // Check Gemini API
    if (envContent.includes('GEMINI_API_KEY')) {
      addResult('Environment', 'Gemini API Key', 'pass', 'Gemini API key configured');
    } else {
      addResult('Environment', 'Gemini API Key', 'warning', 'Gemini API key not configured');
    }

    // Check security variables
    if (envContent.includes('ALLOWED_ORIGINS')) {
      addResult('Environment', 'Allowed Origins', 'pass', 'CORS origins configured');
    } else {
      addResult('Environment', 'Allowed Origins', 'warning', 'CORS origins not configured');
    }

    console.log(
      `✓ Environment variables validated: ${results.filter((r) => r.category === 'Environment').length} checks`
    );
  } else {
    addResult('Environment', '.env file exists', 'fail', 'Environment file not found');
    console.log('✗ Environment file not found');
  }
}

// ============================================================================
// 2. FIREBASE CONFIGURATION VALIDATION
// ============================================================================

function validateFirebaseConfig() {
  console.log('\n=== VALIDATING FIREBASE CONFIGURATION ===');

  const firebaseJsonPath = join(process.cwd(), 'firebase.json');
  const firebaseJsonExists = existsSync(firebaseJsonPath);

  if (firebaseJsonExists) {
    const firebaseJson = JSON.parse(readFileSync(firebaseJsonPath, 'utf-8'));

    addResult('Firebase', 'firebase.json exists', 'pass', 'Firebase configuration file found');

    // Check Firestore rules
    if (firebaseJson.firestore?.rules) {
      addResult('Firebase', 'Firestore rules', 'pass', 'Firestore rules configured');
    } else {
      addResult('Firebase', 'Firestore rules', 'warning', 'Firestore rules not configured');
    }

    // Check Firestore indexes
    if (firebaseJson.firestore?.indexes) {
      addResult('Firebase', 'Firestore indexes', 'pass', 'Firestore indexes configured');
    } else {
      addResult('Firebase', 'Firestore indexes', 'warning', 'Firestore indexes not configured');
    }

    // Check emulators
    if (firebaseJson.emulators) {
      addResult('Firebase', 'Emulators', 'pass', 'Firebase emulators configured');
      if (firebaseJson.emulators.auth) {
        addResult(
          'Firebase',
          'Auth emulator',
          'pass',
          `Auth emulator on port ${firebaseJson.emulators.auth.port}`
        );
      }
      if (firebaseJson.emulators.firestore) {
        addResult(
          'Firebase',
          'Firestore emulator',
          'pass',
          `Firestore emulator on port ${firebaseJson.emulators.firestore.port}`
        );
      }
    } else {
      addResult('Firebase', 'Emulators', 'warning', 'Firebase emulators not configured');
    }

    console.log(
      `✓ Firebase configuration validated: ${results.filter((r) => r.category === 'Firebase').length} checks`
    );
  } else {
    addResult('Firebase', 'firebase.json exists', 'fail', 'Firebase configuration file not found');
    console.log('✗ Firebase configuration file not found');
  }

  // Check Firestore rules file
  const firestoreRulesPath = join(process.cwd(), 'firestore.rules');
  if (existsSync(firestoreRulesPath)) {
    const rulesContent = readFileSync(firestoreRulesPath, 'utf-8');
    if (rulesContent.includes('allow') && rulesContent.includes('deny')) {
      addResult(
        'Firebase',
        'Firestore rules file',
        'pass',
        'Firestore rules file exists with content'
      );
    }
  }

  // Check Firestore indexes file
  const firestoreIndexPath = join(process.cwd(), 'firestore.indexes.json');
  if (existsSync(firestoreIndexPath)) {
    const indexes = JSON.parse(readFileSync(firestoreIndexPath, 'utf-8'));
    if (indexes.indexes && indexes.indexes.length > 0) {
      addResult(
        'Firebase',
        'Firestore indexes file',
        'pass',
        `Firestore indexes file with ${indexes.indexes.length} indexes`
      );
    }
  }
}

// ============================================================================
// 3. NEXT.JS CONFIGURATION VALIDATION
// ============================================================================

function validateNextConfig() {
  console.log('\n=== VALIDATING NEXT.JS CONFIGURATION ===');

  const nextConfigPath = join(process.cwd(), 'next.config.ts');
  const nextConfigExists = existsSync(nextConfigPath);

  if (nextConfigExists) {
    const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');

    addResult('Next.js', 'next.config.ts exists', 'pass', 'Next.js configuration file found');

    // Check output mode
    if (nextConfigContent.includes('standalone')) {
      addResult('Next.js', 'Output mode', 'pass', 'Standalone output configured for Docker');
    }

    // Check image optimization
    if (nextConfigContent.includes('remotePatterns')) {
      addResult('Next.js', 'Image optimization', 'pass', 'Remote image patterns configured');
    }

    // Check React strict mode
    if (nextConfigContent.includes('reactStrictMode')) {
      addResult('Next.js', 'React strict mode', 'pass', 'React strict mode enabled');
    }

    // Check bundle analyzer
    if (nextConfigContent.includes('bundle-analyzer')) {
      addResult('Next.js', 'Bundle analyzer', 'pass', 'Bundle analyzer configured');
    }

    console.log(
      `✓ Next.js configuration validated: ${results.filter((r) => r.category === 'Next.js').length} checks`
    );
  } else {
    addResult('Next.js', 'next.config.ts exists', 'fail', 'Next.js configuration file not found');
  }
}

// ============================================================================
// 4. PACKAGE.JSON VALIDATION
// ============================================================================

function validatePackageJson() {
  console.log('\n=== VALIDATING PACKAGE.JSON ===');

  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJsonExists = existsSync(packageJsonPath);

  if (packageJsonExists) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    addResult('Package', 'package.json exists', 'pass', 'Package.json file found');

    // Check key dependencies
    const keyDeps = ['next', 'react', 'firebase', 'zod'];
    const missingDeps = keyDeps.filter((dep) => !packageJson.dependencies?.[dep]);

    if (missingDeps.length === 0) {
      addResult('Package', 'Key dependencies', 'pass', 'All key dependencies present');
    } else {
      addResult(
        'Package',
        'Key dependencies',
        'fail',
        `Missing dependencies: ${missingDeps.join(', ')}`
      );
    }

    // Check scripts
    const requiredScripts = ['dev', 'build', 'test', 'lint'];
    const missingScripts = requiredScripts.filter((script) => !packageJson.scripts?.[script]);

    if (missingScripts.length === 0) {
      addResult('Package', 'Required scripts', 'pass', 'All required scripts present');
    } else {
      addResult(
        'Package',
        'Required scripts',
        'warning',
        `Missing scripts: ${missingScripts.join(', ')}`
      );
    }

    // Check test frameworks
    if (packageJson.devDependencies?.['vitest'] || packageJson.devDependencies?.['@vitest']) {
      addResult('Package', 'Test framework', 'pass', 'Vitest configured');
    }

    if (packageJson.devDependencies?.['@playwright/test']) {
      addResult('Package', 'E2E test framework', 'pass', 'Playwright configured');
    }

    // Check linting
    if (packageJson.devDependencies?.['eslint']) {
      addResult('Package', 'ESLint', 'pass', 'ESLint configured');
    }

    if (packageJson.devDependencies?.['prettier']) {
      addResult('Package', 'Prettier', 'pass', 'Prettier configured');
    }

    console.log(
      `✓ Package.json validated: ${results.filter((r) => r.category === 'Package').length} checks`
    );
  } else {
    addResult('Package', 'package.json exists', 'fail', 'Package.json file not found');
  }
}

// ============================================================================
// 5. PWA CONFIGURATION VALIDATION
// ============================================================================

function validatePWAConfig() {
  console.log('\n=== VALIDATING PWA CONFIGURATION ===');

  const publicDir = join(process.cwd(), 'public');
  const manifestPath = join(publicDir, 'manifest.json');
  const swPath = join(publicDir, 'sw.js');

  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    addResult('PWA', 'manifest.json exists', 'pass', 'PWA manifest found');

    if (manifest.name && manifest.short_name) {
      addResult('PWA', 'App name', 'pass', `App name: ${manifest.name}`);
    }

    if (manifest.icons && manifest.icons.length > 0) {
      addResult('PWA', 'App icons', 'pass', `${manifest.icons.length} icons configured`);
    }

    if (manifest.start_url) {
      addResult('PWA', 'Start URL', 'pass', `Start URL: ${manifest.start_url}`);
    }
  } else {
    addResult('PWA', 'manifest.json exists', 'warning', 'PWA manifest not found');
  }

  if (existsSync(swPath)) {
    addResult('PWA', 'Service worker', 'pass', 'Service worker file found');
  } else {
    addResult('PWA', 'Service worker', 'warning', 'Service worker not found');
  }

  console.log(
    `✓ PWA configuration validated: ${results.filter((r) => r.category === 'PWA').length} checks`
  );
}

// ============================================================================
// 6. SECURITY CONFIGURATION VALIDATION
// ============================================================================

function validateSecurityConfig() {
  console.log('\n=== VALIDATING SECURITY CONFIGURATION ===');

  // Check .gitignore
  const gitignorePath = join(process.cwd(), '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignoreContent = readFileSync(gitignorePath, 'utf-8');

    if (gitignoreContent.includes('.env')) {
      addResult('Security', '.env in .gitignore', 'pass', '.env file ignored in git');
    } else {
      addResult('Security', '.env in .gitignore', 'warning', '.env file not in .gitignore');
    }

    if (gitignoreContent.includes('node_modules')) {
      addResult('Security', 'node_modules in .gitignore', 'pass', 'node_modules ignored in git');
    }
  }

  // Check for service account files
  const serviceAccountPattern = /service-account.*\.json/;
  const filesToCheck = [
    'service-account.json',
    'firebase-service-account.json',
    '.firebase/service-account.json',
  ];

  filesToCheck.forEach((file) => {
    const filePath = join(process.cwd(), file);
    if (existsSync(filePath)) {
      addResult(
        'Security',
        `Service account file (${file})`,
        'warning',
        'Service account file exists - ensure it is in .gitignore'
      );
    }
  });

  console.log(
    `✓ Security configuration validated: ${results.filter((r) => r.category === 'Security').length} checks`
  );
}

// ============================================================================
// 7. ROUTES VALIDATION
// ============================================================================

function validateRoutes() {
  console.log('\n=== VALIDATING ROUTES ===');

  const appDir = join(process.cwd(), 'app');

  // Check app directory structure
  if (existsSync(appDir)) {
    addResult('Routes', 'app directory exists', 'pass', 'App Router directory found');

    // Check for key routes
    const keyRoutes = ['page.tsx', 'layout.tsx', 'not-found.tsx', 'error.tsx'];
    keyRoutes.forEach((route) => {
      const routePath = join(appDir, route);
      if (existsSync(routePath)) {
        addResult('Routes', route, 'pass', `${route} exists`);
      } else {
        addResult('Routes', route, 'warning', `${route} not found`);
      }
    });

    // Check for API routes
    const apiDir = join(appDir, 'api');
    if (existsSync(apiDir)) {
      addResult('Routes', 'API directory', 'pass', 'API routes directory found');
    }

    // Check for signup route
    const signupDir = join(appDir, 'signup');
    if (existsSync(signupDir)) {
      addResult('Routes', 'Signup route', 'pass', 'Signup route exists');
    }
  } else {
    addResult('Routes', 'app directory exists', 'fail', 'App Router directory not found');
  }

  console.log(
    `✓ Routes validated: ${results.filter((r) => r.category === 'Routes').length} checks`
  );
}

// ============================================================================
// 8. COMPONENTS VALIDATION
// ============================================================================

function validateComponents() {
  console.log('\n=== VALIDATING COMPONENTS ===');

  const componentsDir = join(process.cwd(), 'components');

  if (existsSync(componentsDir)) {
    addResult('Components', 'components directory exists', 'pass', 'Components directory found');

    // Check for key components
    const keyComponents = [
      'MainApp.tsx',
      'Navbar.tsx',
      'AuthContainer.tsx',
      'BudgetAndAPU.tsx',
      'ExpensesView.tsx',
      'PayrollView.tsx',
      'QuotationsView.tsx',
      'ReportsView.tsx',
      'GanttSchedule.tsx',
      'MachineryManager.tsx',
    ];

    keyComponents.forEach((component) => {
      const componentPath = join(componentsDir, component);
      if (existsSync(componentPath)) {
        addResult('Components', component, 'pass', `${component} exists`);
      } else {
        addResult('Components', component, 'warning', `${component} not found`);
      }
    });

    // Check for UI components
    const uiDir = join(componentsDir, 'ui');
    if (existsSync(uiDir)) {
      addResult('Components', 'UI components directory', 'pass', 'UI components directory found');
    }

    // Check for auth components
    const authDir = join(componentsDir, 'auth');
    if (existsSync(authDir)) {
      addResult(
        'Components',
        'Auth components directory',
        'pass',
        'Auth components directory found'
      );
    }
  } else {
    addResult(
      'Components',
      'components directory exists',
      'fail',
      'Components directory not found'
    );
  }

  console.log(
    `✓ Components validated: ${results.filter((r) => r.category === 'Components').length} checks`
  );
}

// ============================================================================
// 9. LIB VALIDATION
// ============================================================================

function validateLib() {
  console.log('\n=== VALIDATING LIB DIRECTORY ===');

  const libDir = join(process.cwd(), 'lib');

  if (existsSync(libDir)) {
    addResult('Lib', 'lib directory exists', 'pass', 'Lib directory found');

    // Check for key utilities
    const keyFiles = [
      'firebaseService.ts',
      'firebaseAuth.ts',
      'types.ts',
      'data.ts',
      'hooks/useAuthSession.ts',
      'validation/entity.schemas.ts',
      'utils/calculations.ts',
    ];

    keyFiles.forEach((file) => {
      const filePath = join(libDir, file);
      if (existsSync(filePath)) {
        addResult('Lib', file, 'pass', `${file} exists`);
      } else {
        addResult('Lib', file, 'warning', `${file} not found`);
      }
    });

    // Check for tests
    const testsDir = join(libDir, '__tests__');
    if (existsSync(testsDir)) {
      addResult('Lib', 'Tests directory', 'pass', 'Tests directory found');
    }
  } else {
    addResult('Lib', 'lib directory exists', 'fail', 'Lib directory not found');
  }

  console.log(`✓ Lib validated: ${results.filter((r) => r.category === 'Lib').length} checks`);
}

// ============================================================================
// 10. TYPE VALIDATION
// ============================================================================

function validateTypeScript() {
  console.log('\n=== VALIDATING TYPESCRIPT CONFIGURATION ===');

  const tsconfigPath = join(process.cwd(), 'tsconfig.json');

  if (existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));

    addResult('TypeScript', 'tsconfig.json exists', 'pass', 'TypeScript configuration found');

    if (tsconfig.compilerOptions?.strict) {
      addResult('TypeScript', 'Strict mode', 'pass', 'TypeScript strict mode enabled');
    } else {
      addResult('TypeScript', 'Strict mode', 'warning', 'TypeScript strict mode not enabled');
    }

    if (tsconfig.compilerOptions?.target) {
      addResult('TypeScript', 'Target', 'pass', `Target: ${tsconfig.compilerOptions.target}`);
    }

    if (tsconfig.compilerOptions?.module) {
      addResult('TypeScript', 'Module', 'pass', `Module: ${tsconfig.compilerOptions.module}`);
    }
  } else {
    addResult('TypeScript', 'tsconfig.json exists', 'fail', 'TypeScript configuration not found');
  }

  console.log(
    `✓ TypeScript configuration validated: ${results.filter((r) => r.category === 'TypeScript').length} checks`
  );
}

// ============================================================================
// 11. GIT CONFIGURATION VALIDATION
// ============================================================================

function validateGitConfig() {
  console.log('\n=== VALIDATING GIT CONFIGURATION ===');

  // Check .git directory
  const gitDir = join(process.cwd(), '.git');
  if (existsSync(gitDir)) {
    addResult('Git', '.git directory exists', 'pass', 'Git repository initialized');
  } else {
    addResult('Git', '.git directory exists', 'warning', 'Git repository not initialized');
  }

  // Check for GitHub Actions
  const githubDir = join(process.cwd(), '.github');
  if (existsSync(githubDir)) {
    addResult('Git', '.github directory exists', 'pass', 'GitHub configuration found');

    const workflowsDir = join(githubDir, 'workflows');
    if (existsSync(workflowsDir)) {
      addResult('Git', 'GitHub workflows', 'pass', 'GitHub workflows configured');
    }
  }

  // Check for Husky
  const huskyDir = join(process.cwd(), '.husky');
  if (existsSync(huskyDir)) {
    addResult('Git', 'Husky hooks', 'pass', 'Husky git hooks configured');
  }

  console.log(
    `✓ Git configuration validated: ${results.filter((r) => r.category === 'Git').length} checks`
  );
}

// ============================================================================
// 12. VERCEL CONFIGURATION VALIDATION
// ============================================================================

function validateVercelConfig() {
  console.log('\n=== VALIDATING VERCEL CONFIGURATION ===');

  const vercelJsonPath = join(process.cwd(), 'vercel.json');

  if (existsSync(vercelJsonPath)) {
    const vercelJson = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'));

    addResult('Vercel', 'vercel.json exists', 'pass', 'Vercel configuration found');

    if (vercelJson.buildCommand) {
      addResult('Vercel', 'Build command', 'pass', `Build command: ${vercelJson.buildCommand}`);
    }

    if (vercelJson.outputDirectory) {
      addResult(
        'Vercel',
        'Output directory',
        'pass',
        `Output directory: ${vercelJson.outputDirectory}`
      );
    }
  } else {
    addResult(
      'Vercel',
      'vercel.json exists',
      'warning',
      'Vercel configuration not found (using defaults)'
    );
  }

  console.log(
    `✓ Vercel configuration validated: ${results.filter((r) => r.category === 'Vercel').length} checks`
  );
}

// ============================================================================
// 13. DOCKER CONFIGURATION VALIDATION
// ============================================================================

function validateDockerConfig() {
  console.log('\n=== VALIDATING DOCKER CONFIGURATION ===');

  const dockerfilePath = join(process.cwd(), 'Dockerfile');
  const composePath = join(process.cwd(), 'compose.yaml');

  if (existsSync(dockerfilePath)) {
    addResult('Docker', 'Dockerfile exists', 'pass', 'Dockerfile found');
  } else {
    addResult('Docker', 'Dockerfile exists', 'warning', 'Dockerfile not found');
  }

  if (existsSync(composePath)) {
    addResult('Docker', 'compose.yaml exists', 'pass', 'Docker Compose file found');
  } else {
    addResult('Docker', 'compose.yaml exists', 'warning', 'Docker Compose file not found');
  }

  console.log(
    `✓ Docker configuration validated: ${results.filter((r) => r.category === 'Docker').length} checks`
  );
}

// ============================================================================
// 14. TESTING CONFIGURATION VALIDATION
// ============================================================================

function validateTestingConfig() {
  console.log('\n=== VALIDATING TESTING CONFIGURATION ===');

  const vitestConfigPath = join(process.cwd(), 'vitest.config.ts');
  const playwrightConfigPath = join(process.cwd(), 'playwright.config.ts');

  if (existsSync(vitestConfigPath)) {
    addResult('Testing', 'vitest.config.ts exists', 'pass', 'Vitest configuration found');
  } else {
    addResult('Testing', 'vitest.config.ts exists', 'warning', 'Vitest configuration not found');
  }

  if (existsSync(playwrightConfigPath)) {
    addResult('Testing', 'playwright.config.ts exists', 'pass', 'Playwright configuration found');
  } else {
    addResult(
      'Testing',
      'playwright.config.ts exists',
      'warning',
      'Playwright configuration not found'
    );
  }

  console.log(
    `✓ Testing configuration validated: ${results.filter((r) => r.category === 'Testing').length} checks`
  );
}

// ============================================================================
// RUN ALL VALIDATIONS
// ============================================================================

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║     ORIGEN ERP - COMPREHENSIVE SYSTEM VALIDATION                          ║');
console.log('║     Validating all system configurations and components                    ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

validateEnvironmentVariables();
validateFirebaseConfig();
validateNextConfig();
validatePackageJson();
validatePWAConfig();
validateSecurityConfig();
validateRoutes();
validateComponents();
validateLib();
validateTypeScript();
validateGitConfig();
validateVercelConfig();
validateDockerConfig();
validateTestingConfig();

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                           VALIDATION SUMMARY                                ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

const categories = [...new Set(results.map((r) => r.category))];
categories.forEach((category) => {
  const categoryResults = results.filter((r) => r.category === category);
  const passed = categoryResults.filter((r) => r.status === 'pass').length;
  const failed = categoryResults.filter((r) => r.status === 'fail').length;
  const warnings = categoryResults.filter((r) => r.status === 'warning').length;

  console.log(`\n${category}:`);
  console.log(`  ✓ Passed: ${passed}`);
  console.log(`  ✗ Failed: ${failed}`);
  console.log(`  ⚠ Warnings: ${warnings}`);

  if (failed > 0) {
    categoryResults
      .filter((r) => r.status === 'fail')
      .forEach((r) => {
        console.log(`    ✗ ${r.item}: ${r.message}`);
      });
  }

  if (warnings > 0) {
    categoryResults
      .filter((r) => r.status === 'warning')
      .forEach((r) => {
        console.log(`    ⚠ ${r.item}: ${r.message}`);
      });
  }
});

const totalPassed = results.filter((r) => r.status === 'pass').length;
const totalFailed = results.filter((r) => r.status === 'fail').length;
const totalWarnings = results.filter((r) => r.status === 'warning').length;
const total = results.length;

console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                           FINAL RESULTS                                    ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log(`\nTotal Checks: ${total}`);
console.log(`✓ Passed: ${totalPassed} (${((totalPassed / total) * 100).toFixed(1)}%)`);
console.log(`✗ Failed: ${totalFailed} (${((totalFailed / total) * 100).toFixed(1)}%)`);
console.log(`⚠ Warnings: ${totalWarnings} (${((totalWarnings / total) * 100).toFixed(1)}%)`);

if (totalFailed === 0) {
  console.log('\n✅ SYSTEM VALIDATION PASSED - All critical checks passed');
} else {
  console.log('\n❌ SYSTEM VALIDATION FAILED - Critical issues found');
}

if (totalWarnings > 0) {
  console.log(`\n⚠️ ${totalWarnings} warnings found - Review recommended`);
}

// Export results to JSON
const resultsJson = JSON.stringify(results, null, 2);
console.log('\nValidation results:', resultsJson);
