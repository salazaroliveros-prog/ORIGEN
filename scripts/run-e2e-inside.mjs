import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readPlaywrightArgs() {
  const raw = process.env.E2E_PLAYWRIGHT_ARGS ?? '[]';
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string')) {
    throw new Error('E2E_PLAYWRIGHT_ARGS debe ser un arreglo JSON de argumentos de texto.');
  }
  return parsed;
}

function runPlaywright(args) {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(repositoryRoot, 'node_modules', 'playwright', 'cli.js');
    if (!existsSync(cliPath)) {
      reject(new Error('No existe node_modules/playwright/cli.js. Ejecuta npm ci antes de E2E.'));
      return;
    }

    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: repositoryRoot,
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

async function main() {
  const seedPath = path.join(repositoryRoot, 'scripts', 'seed-e2e-emulator.mjs');
  const seed = spawnSync(process.execPath, [seedPath], {
    cwd: repositoryRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (seed.error) throw seed.error;
  if (seed.status !== 0) {
    throw new Error(`El seed E2E terminó con código ${seed.status ?? 1}.`);
  }

  const extraArgs = readPlaywrightArgs();
  const hasConfig = extraArgs.some(
    (argument) => argument === '--config' || argument.startsWith('--config=')
  );
  const args = ['test'];
  if (!hasConfig) args.push('--config=playwright.config.ts');
  args.push(...extraArgs);

  process.exitCode = await runPlaywright(args);
}

main().catch((error) => {
  console.error('[e2e] Falló la preparación o ejecución de Playwright:', error);
  process.exitCode = 1;
});
