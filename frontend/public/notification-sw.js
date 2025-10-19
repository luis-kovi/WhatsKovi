self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
