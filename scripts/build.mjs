import { spawn } from 'node:child_process';
import fs from 'node:fs';
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

  // `output: 'standalone'` no copia los assets estáticos ni `public/`.
  // Sin esto `npm run start` sirve HTML sin CSS/JS ni imágenes.
  try {
    const standaloneRoot = path.join(appRoot, '.next', 'standalone');
    const staticSource = path.join(appRoot, '.next', 'static');
    const staticTarget = path.join(standaloneRoot, '.next', 'static');
    const publicSource = path.join(appRoot, 'public');
    const publicTarget = path.join(standaloneRoot, 'public');

    if (fs.existsSync(staticSource)) {
      fs.cpSync(staticSource, staticTarget, { recursive: true });
    }
    if (fs.existsSync(publicSource)) {
      fs.cpSync(publicSource, publicTarget, { recursive: true });
    }

    console.log('[build.mjs] Copied static assets and public/ into the standalone bundle.');
  } catch (error) {
    console.error('[build.mjs] Failed to copy assets into the standalone bundle:', error);
    process.exit(1);
  }

  console.log('[build.mjs] Next.js build complete.');
  process.exit(0);
});
