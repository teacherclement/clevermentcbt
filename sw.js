// ============================================================
// CLEVERMENT SERVICE WORKER (Offline Support)
// ============================================================

var CACHE_NAME = 'cleverment-v1';
var urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://i.postimg.cc/q73QqsQR/cleverment-logo.jpg'
];

// Install: Cache files
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate: Clean old caches
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
        })
    );
});

// Fetch: Serve from cache or network
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(function(response) {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    var responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(function(cache) {
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                });
            })
    );
});