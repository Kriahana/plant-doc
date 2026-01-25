// A simple service worker for caching the app shell and assets

const CACHE_NAME = 'plant-ai-doc-v1';
// All the CDN assets from index.html are listed here for caching.
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  "https://aistudiocdn.com/rxjs@^7.8.2?conditions=es2015",
  "https://aistudiocdn.com/rxjs@^7.8.2/operators?conditions=es2015",
  "https://aistudiocdn.com/rxjs@^7.8.2/ajax?conditions=es2015",
  "https://aistudiocdn.com/rxjs@^7.8.2/webSocket?conditions=es2015",
  "https://aistudiocdn.com/rxjs@^7.8.2/testing?conditions=es2015",
  "https://aistudiocdn.com/rxjs@^7.8.2/fetch?conditions=es2015",
  "https://next.esm.sh/@angular/platform-browser@^21.0.0?external=rxjs",
  "https://next.esm.sh/@angular/core@^21.0.0?external=rxjs",
  "https://next.esm.sh/@angular/compiler@^21.0.0?external=rxjs",
  "https://next.esm.sh/@angular/common@^21.0.0/http?external=rxjs",
  "https://next.esm.sh/@angular/common@^21.0.0?external=rxjs",
  "https://next.esm.sh/@google/genai@^1.30.0?external=rxjs",
  "https://next.esm.sh/@angular/forms@^21.0.1?external=rxjs"
];

// The install event is fired when the service worker is first installed.
self.addEventListener('install', event => {
  // waitUntil() ensures that the service worker will not install until the code inside has successfully completed.
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching App Shell');
      // Add all the assets to the cache.
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// The activate event is fired after installation.
self.addEventListener('activate', event => {
    // Here you can clean up old caches if needed.
    console.log('Service Worker: Activated');
});

// The fetch event is fired for every network request.
self.addEventListener('fetch', event => {
  // We respond to the request by checking the cache first.
  event.respondWith(
    caches.match(event.request).then(response => {
      // If we have a cached response, return it. Otherwise, fetch from the network.
      return response || fetch(event.request);
    })
  );
});
