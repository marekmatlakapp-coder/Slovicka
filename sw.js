// Slovíčka: appka ide aj bez internetu. Pri každom otvorení s internetom si stiahne novú verziu.
const CACHE = 'slovicka-v4';
const SUBORY = ['./', 'index.html', 'manifest.webmanifest', 'ikona-192.png', 'ikona-512.png', 'ikona-180.png', 'pismo/pismo.css',
  ...['atkinson-hyperlegible-400', 'atkinson-hyperlegible-700', 'bricolage-grotesque-600', 'bricolage-grotesque-800'].flatMap(f => ['latin', 'latin-ext'].map(x => 'pismo/' + f + '-' + x + '.woff2'))];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SUBORY)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // písmo z Google: najprv z pamäte, inak zo siete a uložiť
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const k = res.clone(); caches.open(CACHE).then(c => c.put(req, k)); return res; })));
    return;
  }
  if (url.origin !== location.origin) return;
  // vlastné súbory: najprv sieť (nová verzia), bez internetu z pamäte
  e.respondWith(fetch(req).then(res => { if (res.ok) { const k = res.clone(); caches.open(CACHE).then(c => c.put(req, k)); } return res; })
    .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
