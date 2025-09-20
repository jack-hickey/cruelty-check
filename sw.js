const CACHE_NAME = 'cruelty-check-cache';

const urlsToCache = [
  "/index.html",
	"/about.html",
  "/js/site.min.js",
	"/js/auxilium.min.js",
	"/js/brand.min.js",
	"/js/preload-handler.min.js",
	"/js/product.min.js",
	"/js/strings/strings-en.min.js",
	"/css/auxilium.css",
	"/css/site.min.css",
	"/images/logo.svg",
	"/images/kofi.webp",
	"/images/logo-maskable.png",
	"/images/favicon-192x192.png",
	"/images/favicon-1024x1024.png",
	"/images/favicon-128x128.png",
	"/images/favicon-16x16.png",
	"/images/favicon-256x256.png",
	"/images/favicon-32x32.png",
	"/images/favicon-48x48.png",
	"/images/favicon-512x512.png",
	"/images/favicon-64x64.png",
	"/images/favicon-96x96.png",
	"/manifest.json",
	"/webfonts/fa-light-300.eot",
	"/webfonts/fa-light-300.ttf",
	"/webfonts/fa-light-300.woff",
	"/webfonts/fa-light-300.woff2",
	"/webfonts/fa-regular-400.eot",
	"/webfonts/fa-regular-400.ttf",
	"/webfonts/fa-regular-400.woff",
	"/webfonts/fa-regular-400.woff2",
	"/webfonts/fa-solid-900.eot",
	"/webfonts/fa-solid-900.ttf",
	"/webfonts/fa-solid-900.woff",
	"/webfonts/fa-solid-900.woff2"
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
			.then(cache => cache.addAll(urlsToCache))
			.catch(err => console.warn("Cache install failed:", err))
  );
  self.skipWaiting();
});

self.addEventListener("fetch", event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || caches.match("/index.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );

	self.clients.claim();
});
