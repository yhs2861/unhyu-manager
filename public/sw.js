const CACHE_NAME = 'unhyu-manager-v7';
const BASE_PATH = new URL(self.registration.scope).pathname;
const APP_SHELL = [
  BASE_PATH,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}icons/unhyu-app-icon-v4-192.png`,
  `${BASE_PATH}icons/unhyu-app-icon-v4-512.png`,
  `${BASE_PATH}icons/unhyu-app-icon-v4-maskable-512.png`,
  `${BASE_PATH}icons/unhyu-apple-touch-icon-v4.png`,
  `${BASE_PATH}branding/company-mark-color.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(APP_SHELL.map((asset) => cache.add(asset).catch(() => undefined))),
      ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse ?? fetch(event.request);
    }),
  );
});
