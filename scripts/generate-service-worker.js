/**
 * Validates the canonical privacy-first Service Worker.
 *
 * The worker is maintained in public/sw.js so there is only one source of
 * truth. This script intentionally does not regenerate/overwrite it: doing so
 * previously replaced the safe production worker with a broader cache policy.
 */
const fs = require('node:fs');
const path = require('node:path');

const workerPath = path.join(__dirname, '../public/sw.js');
const worker = fs.readFileSync(workerPath, 'utf8');

const requiredSafetyChecks = [
  ['same-origin restriction', /url\.origin !== self\.location\.origin/],
  ['API exclusion', /url\.pathname\.startsWith\('\/api\/'\)/],
  ['navigation is not cached', /Do not store authenticated pages/],
  ['offline fallback', /caches\.match\('\/offline\.html'\)/],
  ['public static allowlist', /PUBLIC_ASSET_PREFIXES/],
  ['private/no-store exclusion', /private\|no-store/],
  ['canonical manifest path', /\/site\.webmanifest/],
];

const missing = requiredSafetyChecks
  .filter(([, pattern]) => !pattern.test(worker))
  .map(([name]) => name);

if (missing.length) {
  console.error('[PWA] Service Worker safety validation failed:', missing.join(', '));
  process.exit(1);
}

console.log('[PWA] Canonical Service Worker validated. No file was overwritten.');
