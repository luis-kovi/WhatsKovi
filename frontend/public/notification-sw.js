const STATIC_CACHE = 'whatskovi-static-v1';
const DYNAMIC_CACHE = 'whatskovi-dynamic-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/brand/favicon.png',
  '/brand/icone.png',
  '/brand/login_logo.png',
  '/brand/no_photo.png',
  '/icons/icon-96x96.png',
  '/icons/icon-144x144.png',
  '/icons/icon-192x192.png',
  '/icons/icon-256x256.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((error) => console.error('[WhatsKovi][SW] precache failed', error))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) {
    return;
  }

  const shouldBypassCache = url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/');
  if (shouldBypassCache) {
    return;
  }

  const isPrecached = PRECACHE_URLS.includes(url.pathname) || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/brand/') || url.pathname.startsWith('/_next/static/');
  const isDocument = request.mode === 'navigate';

  if (isPrecached) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        const response = await fetch(request);
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  if (isDocument) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(DYNAMIC_CACHE);
          const cached = await cache.match(request);
          if (cached) {
            return cached;
          }
          return caches.match('/');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request)
        .then((response) => {
          if (!response || !response.ok) {
            return response;
          }
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => cached);
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  try {
    const payload = event.data.json();
    const title = payload.title || 'WhatsKovi';
    const options = {
      body: payload.body || 'Você recebeu uma nova notificação.',
      data: payload.data || {},
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      tag: payload.tag || 'whatskovi-notification'
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error('[WhatsKovi] Erro ao processar push notification', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = event.notification.data?.ticketId
    ? `/dashboard?ticket=${event.notification.data.ticketId}`
    : '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'notification-clicked', data: event.notification.data });
          if (client.url.includes(destination)) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(destination);
      }
      return undefined;
    })
  );
});
