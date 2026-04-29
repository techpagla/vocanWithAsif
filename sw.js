// VocabFlash Service Worker — Push Notifications
const CACHE = 'vocabflash-v1';

// Install — cache core files
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(['/', '/index.html', '/notification.html']).catch(() => {})
    )
  );
});

// Activate — take control immediately
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// Push event — show notification when server sends push
self.addEventListener('push', e => {
  let data = { title: 'VocabFlash', body: 'Time to study!' };
  try { if (e.data) data = e.data.json(); } catch(err) {}

  e.waitUntil(
    self.registration.showNotification(data.title || 'VocabFlash', {
      body:     data.body || 'Time to study your vocabulary!',
      icon:     data.icon || 'icon.png',
      badge:    'icon.png',
      vibrate:  [200, 100, 200],
      tag:      'vocabflash-reminder',
      renotify: true,
      data:     { url: data.url || '/' }
    })
  );
});

// Notification click — open the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(all => {
      // If app already open, focus it
      for (const c of all) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          return c.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Fetch — serve from cache when offline, fallback to network
self.addEventListener('fetch', e => {
  // Only cache GET requests for same origin
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Cache successful html/css/js responses
        if (resp && resp.status === 200) {
          const ct = resp.headers.get('content-type') || '';
          if (ct.includes('html') || ct.includes('javascript') || ct.includes('css')) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
