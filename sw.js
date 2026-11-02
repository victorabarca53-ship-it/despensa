// Sube la versión cada vez que cambien los archivos de la app.
const CACHE = 'despensa-v4';
// Sin data/semilla.json: la versión publicada no la lleva (los datos entran por archivo).
const SHELL = [
  './', './index.html', './manifest.webmanifest', './favicon.ico',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  './vendor/chart.umd.min.js',
  './vendor/fonts/sora-latin-600-normal.woff2', './vendor/fonts/sora-latin-700-normal.woff2',
  './vendor/fonts/inter-latin-400-normal.woff2', './vendor/fonts/inter-latin-600-normal.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// En el supermercado la señal suele ser mala: no se espera a la red más de 3 segundos.
function conLimite(promesa, ms) {
  return new Promise((ok, mal) => {
    const t = setTimeout(() => mal(new Error('lento')), ms);
    promesa.then((r) => { clearTimeout(t); ok(r); }, (e) => { clearTimeout(t); mal(e); });
  });
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // La página y los datos: primero la red para recibir versiones nuevas; sin señal, la copia guardada.
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/data/semilla.json')) {
    const clave = e.request.mode === 'navigate' ? './index.html' : './data/semilla.json';
    e.respondWith(conLimite(fetch(e.request, { cache: 'no-cache' }), 3000)
      .then((res) => { if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(clave, copia)); } return res; })
      .catch(() => caches.match(clave)));
    return;
  }
  // Íconos, fuentes y gráficos: la copia guardada; si falta, la red y se guarda.
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
    return res;
  })));
});
