/* Service worker: guarda só a "casca" do app. Dados financeiros NUNCA são cacheados —
   a primeira versão opera exclusivamente online (seção 3.5.2 da documentação). */
const CACHE = 'fc-mobile-v1';
const SHELL = ['/mobile/', '/mobile/css/mobile.css', '/mobile/js/mobile.js', '/mobile/manifest.webmanifest', '/mobile/icons/icon-192.png',
  '/shared/api.js', '/shared/format.js', '/shared/vendor/chart.umd.min.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return; // API: sempre rede
  e.respondWith(fetch(e.request).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return res; })
    .catch(() => caches.match(e.request).then((hit) => hit || caches.match('/mobile/'))));
});
