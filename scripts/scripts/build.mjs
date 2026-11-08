import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV = 'production';
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ''} --max-old-space-size=1024`.trim();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const nextBin = path.join(appRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

console.log('[build.mjs] Starting production build with Next.js in:', appRoot);

const buildProcess = spawn(process.execPath, [nextBin, 'build', appRoot], {
  cwd: appRoot,
  stdio: 'inherit',
  env: process.env,
});

buildProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`[build.mjs] Next.js build failed with code ${code}`);
    process.exit(code ?? 1);
  }

  console.log('[build.mjs] Next.js build complete.');
  process.exit(0);
});
