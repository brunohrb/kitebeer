const CACHE = 'velejin-v7';

// Relativos ao proprio SW: em /kitebeer/ isso vira /kitebeer/... e nao a raiz do dominio.
const STATIC = [
  './manifest-velejin.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // Um arquivo que falhe nao pode derrubar a instalacao inteira.
      Promise.all(STATIC.map(u => c.add(u).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   // Supabase e CDN passam direto

  const escopo = new URL('./', self.location).pathname;
  const ehPagina = e.request.mode === 'navigate' ||
                   url.pathname.endsWith('.html') ||
                   url.pathname === escopo;

  // Network-first nas paginas: sempre pega a versao nova, cai no cache se estiver offline.
  if (ehPagina) {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request).then(
        cached => cached || caches.match('./velejin.html')
      ))
    );
    return;
  }

  // Cache-first no resto (icones, imagens).
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
      if (r.ok) {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return r;
    }))
  );
});
