const CACHE_VERSION = 'v1';
const CACHE_NAME = `cruelty-check-cache-${CACHE_VERSION}`;

const APP_SHELL = [
  '/index.html',
  '/about.html',
  '/js/site.min.js',
  '/js/auxilium.min.js',
  '/js/brand.min.js',
  '/js/preload-handler.min.js',
  '/js/product.min.js',
  '/js/strings/strings-en.min.js',
  '/css/site.min.css',
  '/css/auxilium.css',
  '/manifest.json',
  '/images/logo.svg',
  '/images/kofi.webp',
  '/images/logo-maskable.png',
  '/images/favicon-192x192.png',
  '/images/favicon-512x512.png',
  '/webfonts/fa-light-300.woff2',
  '/webfonts/fa-regular-400.woff2',
  '/webfonts/fa-solid-900.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (!cacheWhitelist.includes(key)) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => { 
  if (event.request.method != "GET") return;
  event.respondWith(async function() {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);

    return cached ? cached : fetch(event.request);
  })
});
