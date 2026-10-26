// Firebase Cloud Messaging Service Worker for ConstructERP Guatemala
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');
importScripts('/api/firebase-config.js');

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background push message:', payload);

  const notificationTitle = payload.notification?.title || 'ConstructERP Guatemala - Alerta de Campo';
  const notificationOptions = {
    body: payload.notification?.body || 'Nuevo reporte de obra asignado o firma de capataz requerida.',
    icon: '/assets/branding/icon-192x192.png',
    badge: '/assets/branding/icon-192x192.png',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    tag: payload.data?.tag || 'constructerp-alert',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
