const CACHE_NAME = 'herbal-rhymes-v2';
const BASE = '/herbalrhymes-app/';

const PRECACHE_URLS = [
  BASE,
  BASE + 'index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return response;
    }).catch(() => {
      return caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match(BASE + 'index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
