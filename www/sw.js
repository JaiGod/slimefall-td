/**
 * sw.js — offline support. Cache-first for the app shell so the game works
 * with no connection after the first visit (and installs as a PWA).
 * Bump CACHE when releasing to force clients onto the new version.
 */
const CACHE = 'slimefall-v1.0.0';
const SHELL = [
  './', './index.html', './css/style.css', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './src/main.js', './src/config.js', './src/util.js', './src/audio.js', './src/save.js',
  './src/data/towers.js', './src/data/enemies.js', './src/data/maps.js', './src/data/heroes.js', './src/data/meta.js', './src/data/waves.js',
  './src/game/game.js', './src/game/render.js', './src/game/path.js', './src/game/particles.js',
  './src/ui/dom.js', './src/ui/hud.js', './src/ui/menus.js',
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
