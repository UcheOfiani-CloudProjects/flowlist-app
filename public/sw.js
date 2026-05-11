self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { id, title, fireAt } = event.data;
    const delay = fireAt - Date.now();
    if (delay <= 0) return;
    setTimeout(() => {
      self.registration.showNotification('FlowList reminder', {
        body: title,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: id,
        requireInteraction: true,
      });
    }, delay);
  }

  if (event.data?.type === 'CANCEL_NOTIFICATION') {
    self.registration.getNotifications({ tag: event.data.id }).then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});
