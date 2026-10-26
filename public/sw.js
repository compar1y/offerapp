// Service worker simples: guarda só o "casco" do app (HTML, JS, CSS, imagens do app, ícones).
// REGRAS DE SEGURANÇA:
//  - nunca guarda /api/*, PDFs, planilhas, textos ou qualquer arquivo pago;
//  - nunca guarda respostas de outros domínios;
//  - nunca guarda respostas que não sejam 200 ou que tenham Cache-Control: no-store.
const CACHE = 'panetone-shell-v2'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png']
const BLOCKED = /\/api\/|\.(pdf|docx?|xlsx?|txt|csv|zip)(\?|$)/i
const OK = /\.(js|css|webp|png|svg|woff2?|webmanifest)(\?|$)|\/$|index\.html$/i

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  if (BLOCKED.test(url.pathname) || req.headers.has('range')) return
  if (!OK.test(url.pathname)) return
  const isPage = req.mode === 'navigate'
  e.respondWith(
    (isPage
      ? fetch(req).then((res) => keep(req, res))
      : caches.match(req).then((hit) => hit || fetch(req).then((res) => keep(req, res)))
    ).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))),
  )
})
function keep(req, res) {
  const cc = res.headers.get('cache-control') || ''
  if (res.status === 200 && !/no-store/i.test(cc)) {
    const copy = res.clone()
    caches.open(CACHE).then((c) => c.put(req, copy))
  }
  return res
}
