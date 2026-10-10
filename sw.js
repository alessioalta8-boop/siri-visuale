const CACHE = 'siri-clone-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(
        ASSETS.map((asset) => cache.add(new Request(asset, { cache: 'reload' })))
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });

      if (cached) return cached;

      try {
        const res = await fetch(req);

        if (res && res.ok) {
          cache.put(req, res.clone()).catch(() => {});
        }

        return res;
      } catch (err) {
        if (req.mode === 'navigate') {
          const fallback =
            (await cache.match('./index.html')) ||
            (await cache.match('./'));

          if (fallback) return fallback;
        }

        return Response.error();
      }
    })()
  );
});
