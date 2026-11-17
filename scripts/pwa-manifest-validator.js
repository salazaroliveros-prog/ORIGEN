/**
 * Strict PWA manifest validation for local assets and required metadata.
 * Fails CI on missing fields, malformed asset paths or missing files.
 */
const fs = require('node:fs');
const path = require('node:path');

const manifestPath = path.join(__dirname, '../public/site.webmanifest');
const publicDir = path.resolve(__dirname, '../public');
const errors = [];

function validateAsset(src, label) {
  if (typeof src !== 'string' || !src.startsWith('/') || src.startsWith('//')) {
    errors.push(`${label}: asset path must be a same-origin absolute path.`);
    return;
  }

  const filePath = path.resolve(publicDir, `.${src}`);
  const relative = path.relative(publicDir, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    errors.push(`${label}: asset path escapes the public directory.`);
    return;
  }

  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile() || stats.size === 0) errors.push(`${label}: asset is empty or not a file (${src}).`);
  } catch {
    errors.push(`${label}: asset does not exist (${src}).`);
  }
}

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const requiredFields = ['name', 'short_name', 'start_url', 'scope', 'display', 'theme_color', 'background_color'];
  for (const field of requiredFields) {
    if (typeof manifest[field] !== 'string' || manifest[field].trim() === '') {
      errors.push(`Missing or invalid required field: ${field}`);
    }
  }

  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    errors.push('Manifest must define at least one icon.');
  } else {
    manifest.icons.forEach((icon, index) => {
      if (!icon || typeof icon !== 'object') {
        errors.push(`icons[${index}] must be an object.`);
        return;
      }
      if (typeof icon.sizes !== 'string' || !icon.sizes.trim()) errors.push(`icons[${index}] is missing sizes.`);
      if (typeof icon.type !== 'string' || !icon.type.trim()) errors.push(`icons[${index}] is missing type.`);
      validateAsset(icon.src, `icons[${index}]`);
    });
  }

  for (const collectionName of ['shortcuts', 'screenshots']) {
    const collection = manifest[collectionName];
    if (collection !== undefined && !Array.isArray(collection)) {
      errors.push(`${collectionName} must be an array when provided.`);
      continue;
    }
    (collection || []).forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`${collectionName}[${index}] must be an object.`);
        return;
      }
      if (collectionName === 'shortcuts') {
        if (typeof item.name !== 'string' || !item.name.trim()) errors.push(`shortcuts[${index}] is missing name.`);
        if (typeof item.url !== 'string' || !item.url.startsWith('/') || item.url.startsWith('//')) {
          errors.push(`shortcuts[${index}] must use a same-origin URL.`);
        }
      }
      if (item.src) validateAsset(item.src, `${collectionName}[${index}]`);
      (item.icons || []).forEach((icon, iconIndex) => validateAsset(icon?.src, `${collectionName}[${index}].icons[${iconIndex}]`));
    });
  }
} catch (error) {
  errors.push(`Unable to parse PWA manifest: ${error.message}`);
}

if (errors.length) {
  console.error('[PWA] Manifest validation failed:');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[PWA] Manifest, icons, shortcuts and screenshots validated successfully.');
