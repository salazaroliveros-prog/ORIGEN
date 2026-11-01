import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const dotNext = path.join(appRoot, '.next');
const distDir = path.join(appRoot, 'dist');
const publicDir = path.join(appRoot, 'public');

console.log('[prepare-dist] Populating dist/ directory with build artifacts...');

if (!fs.existsSync(dotNext)) {
  console.error('[prepare-dist] Error: .next directory does not exist. Did next build succeed?');
  process.exit(1);
}

// Clean and create dist
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

// Copy entries from .next (skipping cache to avoid bloat)
for (const entry of fs.readdirSync(dotNext)) {
  if (entry === 'cache') continue;
  const src = path.join(dotNext, entry);
  const dest = path.join(distDir, entry);
  fs.cpSync(src, dest, { recursive: true });
}

// Copy public assets
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, path.join(distDir, 'public'), { recursive: true });
  fs.cpSync(publicDir, distDir, { recursive: true });
}

// Copy prerendered HTML index if available
const prerenderedIndex = path.join(dotNext, 'server', 'app', 'index.html');
const distIndex = path.join(distDir, 'index.html');
if (fs.existsSync(prerenderedIndex) && !fs.existsSync(distIndex)) {
  fs.cpSync(prerenderedIndex, distIndex);
}

// Provide _next/static link/copy in dist for static asset hosts
const staticSrc = path.join(dotNext, 'static');
const distUnderscoreNextStatic = path.join(distDir, '_next', 'static');
if (fs.existsSync(staticSrc)) {
  fs.mkdirSync(path.join(distDir, '_next'), { recursive: true });
  fs.cpSync(staticSrc, distUnderscoreNextStatic, { recursive: true });
}

// If standalone directory exists, ensure static and public are synced inside it
const standaloneDir = path.join(dotNext, 'standalone');
if (fs.existsSync(standaloneDir)) {
  const standaloneDotNext = path.join(standaloneDir, '.next');
  fs.mkdirSync(standaloneDotNext, { recursive: true });
  if (fs.existsSync(staticSrc)) {
    fs.cpSync(staticSrc, path.join(standaloneDotNext, 'static'), { recursive: true });
  }
  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, path.join(standaloneDir, 'public'), { recursive: true });
  }
}

console.log('[prepare-dist] Successfully populated dist/ directory with production artifacts.');
