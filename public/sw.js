// Service worker mínimo: deixa o app instalável e guarda a casca do app para abrir rápido.
// Nunca guarda /api (acesso e páginas compradas sempre passam pelo servidor).
const CACHE = 'fornada-v1'
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/'])).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')))
    return
  }
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(
        (r) => r || fetch(e.request).then((res) => { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return res }),
      ),
    )
  }
})
