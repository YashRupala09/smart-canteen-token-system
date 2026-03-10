const CACHE_NAME = 'smart-canteen-v5';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './dashboard.html',
    './token-counter.html',
    './kitchen.html',
    './display-board.html',
    './menu-management.html',
    './reports.html',
    './css/style.css',
    './js/db.js',
    './js/app.js',
    './js/menu.js',
    './js/orders.js',
    './js/kitchen.js',
    './js/display.js',
    './js/dashboard.js',
    './js/reports.js',
    './js/seed.js',
    './manifest.json',
    './images/coffee.jpg',
    './images/strawberry.jpg',
    './images/tomato.jpg',
    './images/ingredients.jpg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request).then((fetchResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        // Don't cache API calls or dynamic URLs if any, but since it's local only, cache everything
                        if (event.request.url.startsWith(self.location.origin)) {
                            cache.put(event.request, fetchResponse.clone());
                        }
                        return fetchResponse;
                    });
                });
            })
            .catch(() => {
                // Fallback for offline mode if page not cached
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
    );
});
