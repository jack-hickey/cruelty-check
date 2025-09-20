const CACHE_VERSION = 'v3';
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

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(precacheResources)));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    }),
  );
});
