const CACHE = 'the-verse-vault-v1-06';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.json',
  './admin/index.html', './admin/admin.js', './data/verses.json',
  './assets/icon-192.svg', './assets/icon-512.svg', './assets/default-title-logo.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
});
