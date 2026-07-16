const CACHE_NAME = 'unhyu-manager-v2.2.11';
const BASE_PATH = new URL(self.registration.scope).pathname;
const APP_SHELL = [
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}icons/unhyu-app-icon-v5-192.png`,
  `${BASE_PATH}icons/unhyu-app-icon-v5-512.png`,
  `${BASE_PATH}icons/unhyu-app-icon-v5-maskable-512.png`,
  `${BASE_PATH}icons/unhyu-apple-touch-icon-v5.png`,
  `${BASE_PATH}branding/company-mark-color.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        APP_SHELL.map(async (asset) => {
          try {
            const response = await fetch(asset, { cache: 'reload' });
            if (response.ok && response.status === 200 && response.type !== 'opaque') {
              await cache.put(asset, response);
            }
          } catch (error) {
            console.error('[Service Worker] Precache failed:', asset, error);
          }
        }),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('unhyu-manager') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (
    request.method !== 'GET' ||
    requestUrl.origin !== self.location.origin ||
    !requestUrl.pathname.startsWith(BASE_PATH)
  ) {
    return;
  }

  const isNavigation = request.mode === 'navigate' || request.destination === 'document';

  if (isNavigation) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok && response.status === 200 && response.type !== 'opaque') {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(BASE_PATH, response.clone());
          }
          return response;
        } catch (error) {
          const cachedApp = await caches.match(BASE_PATH);
          if (cachedApp) {
            return cachedApp;
          }
          throw error;
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      const response = await fetch(request);
      const contentType = response.headers.get('content-type') || '';
      const isScriptOrStyle =
        request.destination === 'script' || request.destination === 'style';
      const hasExpectedContentType =
        request.destination !== 'script' || !contentType.includes('text/html');

      if (
        response.ok &&
        response.status === 200 &&
        response.type !== 'opaque' &&
        (!isScriptOrStyle || hasExpectedContentType)
      ) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    })(),
  );
});
