import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectId = 'demo-origen-erp-test';

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function getAvailablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );

  if (!address || typeof address === 'string') {
    throw new Error('No fue posible reservar un puerto local para Playwright.');
  }
  return address.port;
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

async function main() {
  loadEnvFile(path.join(repositoryRoot, '.env.e2e'));

  const runId = randomBytes(8).toString('hex');
  const port = await getAvailablePort();
  const reportDirectory = path.join(repositoryRoot, 'test-results', runId);
  const htmlDirectory = path.join(repositoryRoot, 'playwright-report', runId);
  const tsconfigFileName = `.tsconfig.e2e-${runId}.json`;
  const tsconfigPath = path.join(repositoryRoot, tsconfigFileName);

  let exitCode = 1;
  try {
    await Promise.all([
      mkdir(reportDirectory, { recursive: true }),
      mkdir(htmlDirectory, { recursive: true }),
      writeFile(
        tsconfigPath,
        (() => {
          const projectConfig = JSON.parse(
            readFileSync(path.join(repositoryRoot, 'tsconfig.json'), 'utf8')
          );
          // No incluir declaraciones .next/types ni .next/dev/types de builds
          // previos. Next agregará los tipos de esta corrida al tsconfig temporal.
          if (Array.isArray(projectConfig.include)) {
            projectConfig.include = projectConfig.include.filter(
              (entry) => typeof entry !== 'string' || !/^(?:\.\/)?\.next(?:\/|\\\\)/.test(entry)
            );
          }
          return `${JSON.stringify(projectConfig, null, 2)}\\n`;
        })(),
        'utf8'
      ),
    ]);

    // El correo y la clave son nuevos por corrida; no se reutilizan cuentas ni
    // datos de otro test. Firebase Auth/Firestore/Storage serán emuladores limpios.
    const env = {
      ...process.env,
      ORIGEN_E2E_RUN_ID: runId,
      ORIGEN_E2E_TSCONFIG_PATH: tsconfigFileName,
      E2E_PORT: String(port),
      E2E_BASE_URL: `http://127.0.0.1:${port}`,
      E2E_ADMIN_EMAIL: `e2e-${runId}@origen.invalid`,
      E2E_ADMIN_PASSWORD: randomBytes(24).toString('base64url'),
      E2E_ALLOW_FIREBASE_MUTATIONS: '1',
      E2E_FIREBASE_TARGET: 'emulator',
      E2E_PLAYWRIGHT_ARGS: JSON.stringify(process.argv.slice(2)),
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'true',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
      NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-api-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'localhost',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:demo',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${projectId}.appspot.com`,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
      NEXT_PUBLIC_FIREBASE_EMULATOR_HOST: '127.0.0.1',
    };

    console.log(`[e2e] Run: ${runId}`);
    console.log(`[e2e] App aislada: ${env.E2E_BASE_URL}`);
    console.log(`[e2e] Firebase project: ${projectId} (emuladores desechables)`);

    const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    exitCode = await run(
      executable,
      [
        '--yes',
        'firebase-tools',
        'emulators:exec',
        '--config',
        'firebase.emulators.json',
        '--project',
        projectId,
        '--only',
        'auth,firestore,storage',
        'node scripts/run-e2e-inside.mjs',
      ],
      {
        cwd: repositoryRoot,
        env,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      }
    );
  } finally {
    // Next.js solo modifica el tsconfig temporal de esta corrida. El original
    // del proyecto permanece intacto incluso cuando el emulador o Playwright falla.
    await rm(tsconfigPath, { force: true });
  }

  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error('[e2e] No se pudo iniciar la ejecución aislada:', error);
  process.exitCode = 1;
});
