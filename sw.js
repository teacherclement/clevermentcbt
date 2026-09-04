// ============================================================
// CLEVERMENT SERVICE WORKER (Offline Support)
// ============================================================
// Strategy: NETWORK-FIRST. Always try to fetch the latest version
// from the network first; only fall back to the cached copy if the
// network request fails (e.g. the device is offline). This means
// deployed updates show up immediately instead of being masked by
// an old cached copy.
// ============================================================

var CACHE_NAME = 'cleverment-v2';
var urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://i.postimg.cc/q73QqsQR/cleverment-logo.jpg'
];

// Install: cache the core files, and activate this new worker
// immediately instead of waiting for old tabs to close.
self.addEventListener('install', function(event) {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate: clean old caches and take control of open tabs right away.
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// Fetch: NETWORK-FIRST, cache as a fallback for offline use.
self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                if (response && response.status === 200 && response.type === 'basic') {
                    var responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(function() {
                return caches.match(event.request);
            })
    );
});
