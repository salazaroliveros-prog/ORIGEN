import { createServer } from 'node:http';
import { parse } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import next from 'next';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';

// Ensure .next directory has the build files in all deployment environments
const cwd = process.cwd();
const dotNext = path.join(cwd, '.next');
const distDir = path.join(cwd, 'dist');

if (!dev && !fs.existsSync(path.join(dotNext, 'routes-manifest.json')) && fs.existsSync(distDir)) {
  try {
    fs.cpSync(distDir, dotNext, { recursive: true });
  } catch (err) {
    console.error('Failed copying dist to .next:', err);
  }
}

const app = next({ dev, hostname: '0.0.0.0', port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url || '/', true);
      handle(req, res, parsedUrl);
    });

    server.listen(port, '0.0.0.0', () => {
      console.log(`> Server ready on http://0.0.0.0:${port}`);
    });
  })
  .catch((err) => {
    console.error('Error preparing Next.js server:', err);
    process.exit(1);
  });
