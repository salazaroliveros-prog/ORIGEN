import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const nextBin = path.join(appRoot, 'node_modules', '.bin', 'next');

// Auto-heal /app symlinks so root build/lint/dev tools always resolve package.json
try {
  const items = fs.readdirSync(appRoot);
  for (const item of items) {
    const target = path.join('/app', item);
    const source = path.join(appRoot, item);
    if (!fs.existsSync(target) && target !== '/app/applet') {
      try {
        fs.symlinkSync(source, target);
      } catch {}
    }
  }
} catch {}

// Next.js uses --hostname instead of Vite's --host
const rawArgs = process.argv.slice(2);
const args = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--host') {
    args.push('--hostname');
  } else if (arg.startsWith('--host=')) {
    args.push(`--hostname=${arg.slice(7)}`);
  } else {
    args.push(arg);
  }
}

// Ensure default port and host if not provided
if (!args.includes('-p') && !args.includes('--port')) {
  args.push('-p', '3000');
}
if (!args.includes('-H') && !args.includes('--hostname')) {
  args.push('-H', '0.0.0.0');
}

const child = spawn(process.execPath, [nextBin, 'dev', appRoot, ...args], {
  cwd: appRoot,
  stdio: 'inherit',
  env: process.env,
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGHUP', () => {
  child.kill('SIGHUP');
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
