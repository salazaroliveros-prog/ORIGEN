/**
 * Script para generar un Service Worker PWA mejorado
 * Genera un service worker con caching estratégico
 * Uso: node scripts/generate-service-worker.js
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../public/sw.js');

const serviceWorkerCode = `// Service Worker para ConstructERP Guatemala
// Generado automáticamente con caching estratégico

const CACHE_NAME = 'constructerp-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// URLs para cachear al instalar
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/assets/branding/favicon-16x16.png',
  '/assets/branding/favicon-32x32.png',
  '/assets/branding/icon-192x192.png',
  '/assets/branding/icon-512x512.png',
  '/assets/branding/apple-touch-icon.png',
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Cacheando activos estáticos');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  return self.clients.claim();
});

// Estrategia de fetching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requests no-GET
  if (request.method !== 'GET') return;
  
  // Ignorar requests a Firebase y APIs externas
  if (url.hostname.includes('firebaseio.com') || 
      url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('googleapis.com')) {
    return;
  }
  
  // Estrategia: Network First para navegación
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clonar respuesta y guardar en cache
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback a offline page
            return caches.match('/');
          });
        })
    );
    return;
  }
  
  // Estrategia: Cache First para activos estáticos
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then((response) => {
        // No cachear respuestas no exitosas
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
        
        return response;
      });
    })
  );
});

// Sincronización en background (para offline)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sincronización en background:', event.tag);
  // Implementar lógica de sincronización cuando sea necesario
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Notificación push recibida');
  
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de ConstructERP',
    icon: '/assets/branding/icon-192x192.png',
    badge: '/assets/branding/favicon-32x32.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };
  
  event.waitUntil(self.registration.showNotification('ConstructERP', options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});
`;

console.log('📝 Generando Service Worker PWA...');
console.log('📁 Ruta de salida:', OUTPUT_PATH);

try {
  fs.writeFileSync(OUTPUT_PATH, serviceWorkerCode, 'utf8');
  console.log('✅ Service Worker generado exitosamente');
  console.log('');
  console.log('📝 Siguientes pasos:');
  console.log('1. Registra el service worker en tu app (app/layout.tsx o lib/serviceWorker.ts)');
  console.log('2. Configura las rutas estáticas que necesitas cachear');
  console.log('3. Personaliza las estrategias de caching según tus necesidades');
  console.log('');
  console.log('💡 Ejemplo de registro:');
  console.log('   if ("serviceWorker" in navigator) {');
  console.log('     navigator.serviceWorker.register("/sw.js");');
  console.log('   }');
} catch (error) {
  console.error('❌ Error generando Service Worker:', error.message);
  process.exit(1);
}
