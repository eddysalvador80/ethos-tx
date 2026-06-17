// ETHOS·TX — Service Worker
// Estrategia: NETWORK-FIRST para la navegación/HTML (siempre la versión más
// fresca cuando hay conexión; respaldo a la caché si está offline) y CACHE-FIRST
// para estáticos (íconos, manifest). Así las actualizaciones aparecen solas al
// abrir la app con internet, sin quedarse pegada en una versión vieja.
const CACHE = 'ethos-tx-v21';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icono-192.png',
  './icono-512.png',
  './icono-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');

  if (isHTML) {
    // Network-first: trae la versión más reciente; si no hay red, usa la caché.
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first para estáticos (íconos, manifest): rápidos y disponibles offline.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
