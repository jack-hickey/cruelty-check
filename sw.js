const CACHE_VERSION = 'v1.0.6';
const CACHE_NAME = `cruelty-check-cache-${CACHE_VERSION}`;

const APP_SHELL = [
	'/',
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
	'/images/favicon-16x16.png',
	'/images/favicon-32x32.png',
	'/images/favicon-48x48.png',
	'/images/favicon-64x64.png',
	'/images/favicon-96x96.png',
	'/images/favicon-128x128.png',
  '/images/favicon-192x192.png',
	'/images/favicon-256x256.png',
  '/images/favicon-512x512.png',
	'/images/favicon-1024x1024.png',
  '/webfonts/fa-light-300.woff2',
	'/webfonts/fa-light-300.woff',
  '/webfonts/fa-regular-400.woff2',
	'/webfonts/fa-regular-400.woff',
  '/webfonts/fa-solid-900.woff2',
	'/webfonts/fa-solid-900.woff'
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    }).catch(err => caches.match("/index.html") || new Response("You are offline", { status: 503 }))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});
