self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});


self.addEventListener('fetch', (event) => {
  // Minimal fetch handler keeps SW active; network-first
});


self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const ts = data.ts || Date.now();
  const title = 'Background tick';
  const body = `Received at ${new Date(ts).toLocaleString()}`;

  const show = self.registration.showNotification(title, { body });
  event.waitUntil(show);

  // Also notify any open clients
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    for (const client of all) {
      client.postMessage({ type: 'tick', ts });
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
