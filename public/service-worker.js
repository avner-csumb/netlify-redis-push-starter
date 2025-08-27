

self.addEventListener('install', event => {
  console.log('[SW] Installed');
  self.skipWaiting(); // activate immediately
});



self.addEventListener('activate', event => {
  console.log('[SW] Activated');
  self.clients.claim();
});



self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clientsList.length) {
      // Page is open → post message to page
      clientsList.forEach(c => c.postMessage({ type: 'RUN_TEST', payload: data }));
      return;
    }
    // No page open → show a notification the user can tap to run test
    await self.registration.showNotification('Network test', {
      body: 'Tap to run a quick throughput test.',
      data: {
        url: `/?run=1&sid=${encodeURIComponent(data.sid || '')}&streams=${data.streams || ''}&durationMs=${data.durationMs || ''}`,
        payload: data
      }
    });
  })());
});


self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all.length) {
      await all[0].focus();
      all[0].postMessage({ type: 'RUN_TEST', payload: event.notification.data?.payload || {} });
    } else {
      await self.clients.openWindow(event.notification.data?.url || '/?run=1');
    }
  })());
});


