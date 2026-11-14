/* Uphar CRM service worker.
 *
 * This is a live, signed-in data app, so the worker is deliberately conservative:
 *   - Pages:        network first. Offline → the /offline page. Pages are never cached,
 *                   so one person's screens can't be shown to the next person on the device.
 *   - /api/*:       never touched. Data always comes from the server.
 *   - /_next/static: cache first. File names are content-hashed, so they never go stale.
 *   - Icons, fonts: stale-while-revalidate.
 *
 * Bump VERSION to drop every old cache on the next visit.
 */
const VERSION = 'v1';
const STATIC = `uphar-static-${VERSION}`;
const ASSETS = `uphar-assets-${VERSION}`;
const OFFLINE_URL = '/offline';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png'];

// The offline page is only useful if its stylesheet and fonts are cached too.
async function cacheOfflineAssets() {
  try {
    const page = await (await caches.open(ASSETS)).match(OFFLINE_URL);
    if (!page) return;
    const html = await page.text();
    const urls = [...new Set(html.match(/\/_next\/static\/[^"'\\\s)]+\.(?:css|js|woff2)/g) || [])];
    const cache = await caches.open(STATIC);
    await Promise.all(urls.map(url => cache.add(url).catch(() => undefined)));
  } catch {
    // Not fatal: the page still renders as plain text.
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(ASSETS)
      .then(cache => cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' }))))
      .then(cacheOfflineAssets)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('uphar-') && k !== STATIC && k !== ASSETS).map(k => caches.delete(k))))
      .then(() => (self.registration.navigationPreload ? self.registration.navigationPreload.enable() : undefined))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const fresh = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => hit);
  return hit || fresh;
}

async function pageOrOffline(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch {
    const cache = await caches.open(ASSETS);
    return (await cache.match(OFFLINE_URL)) || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(pageOrOffline(event));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }

  if (url.pathname.startsWith('/icons/') || /\.(?:png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, ASSETS));
  }
  // Everything else (RSC payloads, manifest) goes straight to the network.
});
