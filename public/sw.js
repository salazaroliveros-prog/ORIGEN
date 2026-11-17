// ORIGEN ERP — privacy-first Service Worker.
// Never cache authenticated HTML, API responses, Firebase traffic or cross-origin data.
const CACHE_NAME = 'origen-public-static-v3';
const PRECACHE_ASSETS = ['/site.webmanifest', '/offline.html'];
const PUBLIC_ASSET_PREFIXES = ['/_next/static/', '/assets/branding/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

function isPublicStaticAsset(url) {
  return url.origin === self.location.origin &&
    (url.pathname === '/site.webmanifest' ||
      PUBLIC_ASSET_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) return;

  if (request.mode === 'navigate') {
    // Do not store authenticated pages. Offline navigation receives a static,
    // non-sensitive explanation instead of a previous user's dashboard.
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match('/offline.html');
        return offline || new Response('Sin conexión', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      })
    );
    return;
  }

  if (!isPublicStaticAsset(url)) return;

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;
      const response = await fetch(request);
      const cacheControl = response.headers.get('Cache-Control') || '';
      if (response.ok && !/private|no-store/i.test(cacheControl)) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })
  );
});
