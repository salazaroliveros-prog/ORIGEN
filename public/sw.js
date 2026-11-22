/**
 * Service Worker for Offline Support
 * Enables caching of critical assets for use in construction sites with poor connectivity
 */

const CACHE_NAME = 'origen-erp-v1';
const STATIC_CACHE = 'origen-static-v1';
const DYNAMIC_CACHE = 'origen-dynamic-v1';

// Critical assets to cache immediately
const CRITICAL_ASSETS = ['/', '/manifest.json', '/_next/static/css/', '/_next/static/chunks/'];

// Network timeout for poor connectivity scenarios
const NETWORK_TIMEOUT = 3000;

/**
 * Install event - Cache critical assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching critical assets');
      return cache.addAll(CRITICAL_ASSETS.map((url) => new Request(url, { cache: 'reload' })));
    })
  );
  self.skipWaiting();
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch event - Network first with cache fallback
 * Optimized for construction sites with intermittent connectivity
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests (Firebase, APIs, etc.)
  if (url.origin !== self.location.origin) {
    // Cache Firebase Storage images for offline viewing
    if (url.hostname.includes('firebasestorage.googleapis.com')) {
      event.respondWith(cacheFirstStrategy(request));
    }
    return;
  }

  // Skip Next.js API routes
  if (url.pathname.startsWith('/api/')) return;

  // Skip _next/data requests (Next.js data fetching)
  if (url.pathname.startsWith('/_next/data/')) return;

  // Use network-first for HTML pages
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Use cache-first for static assets
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|webp|avif|svg|ico)$/)
  ) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Network-first for everything else
  event.respondWith(networkFirstStrategy(request));
});

/**
 * Network-first strategy with timeout
 * Tries network first, falls back to cache after timeout
 */
async function networkFirstStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    // Race network request with timeout
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT)
    );

    const response = await Promise.race([networkPromise, timeoutPromise]);

    // Cache the successful response
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      const offlineResponse = await cache.match('/offline');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    throw error;
  }
}

/**
 * Cache-first strategy
 * Tries cache first, falls back to network
 */
async function cacheFirstStrategy(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetch(request).then((response) => {
      if (response.ok) {
        cache.put(request, response);
      }
    });
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Cache and network failed:', request.url);
    throw error;
  }
}

/**
 * Background sync for failed requests
 * Stores failed requests for retry when connectivity returns
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(retryFailedRequests());
  }
});

async function retryFailedRequests() {
  // Implementation would retry stored failed requests
  console.log('[SW] Background sync triggered');
}

/**
 * Handle push notifications
 */
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Actualización disponible',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
    },
  };

  event.waitUntil(self.registration.showNotification('ConstructERP', options));
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/'));
});
