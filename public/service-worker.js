self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});


self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch {}
    const ts = data.ts || Date.now();

    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasVisibleClient = clientsList.some(c => c.visibilityState === 'visible');

    if (hasVisibleClient) {
      // App is open somewhere: update UI without a system notification
      clientsList.forEach(c => c.postMessage({ type: 'tick', ts }));
    } else {
      // No visible client: show a notification to satisfy user-visible requirement
      await self.registration.showNotification('Background tick', {
        body: `Received at ${new Date(ts).toLocaleString()}`,
        tag: 'tick',          // coalesce repeated ticks
        renotify: false
      });
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window' });
    if (all.length) {
      all[0].focus();
    } else {
      self.clients.openWindow('/');
    }
  })());
});
