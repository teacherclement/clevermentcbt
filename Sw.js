// ============================================================
// CLEVERMENT SERVICE WORKER - FIXED CACHE ISSUE (v2.5)
// Network-first strategy + auto-update
// ============================================================

var CACHE_NAME = 'cleverment-v2.5-2500';
var CORE_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json'
];

var CDN_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://i.postimg.cc/q73QqsQR/cleverment-logo.jpg'
];

// Install: cache core assets and skip waiting
self.addEventListener('install', function(event) {
    console.log('[SW] Install v2.5');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                // Cache core assets, but don't fail if one fails
                return cache.addAll(CORE_ASSETS).catch(function(err) {
                    console.log('[SW] Cache addAll error', err);
                    // Try individually
                    return Promise.all(
                        CORE_ASSETS.map(function(url) {
                            return cache.add(url).catch(function() {});
                        })
                    );
                });
            })
            .then(function() {
                // Also try to cache CDN assets but ignore failures
                return caches.open(CACHE_NAME).then(function(cache) {
                    CDN_ASSETS.forEach(function(url) {
                        fetch(url).then(function(resp) {
                            if (resp.ok) cache.put(url, resp);
                        }).catch(function(){});
                    });
                });
            })
    );
});

// Activate: clean old caches and claim clients immediately
self.addEventListener('activate', function(event) {
    console.log('[SW] Activate v2.5');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// Message handler for SKIP_WAITING
self.addEventListener('message', function(event) {
    if (event.data && event.data.action === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Fetch: NETWORK-FIRST for HTML/JS/CSS, fallback to cache when offline
self.addEventListener('fetch', function(event) {
    var request = event.request;
    
    // Only handle GET
    if (request.method !== 'GET') return;

    var url = new URL(request.url);
    
    // For navigation requests (page loads) - always network first
    if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(function(response) {
                    // Cache successful navigation responses
                    if (response.ok) {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                })
                .catch(function() {
                    // Offline fallback
                    return caches.match(request).then(function(cached) {
                        if (cached) return cached;
                        return caches.match('/index.html').then(function(index) {
                            if (index) return index;
                            return caches.match('/');
                        });
                    });
                })
        );
        return;
    }

    // For core assets (style.css, script.js, manifest.json) - NETWORK FIRST
    if (CORE_ASSETS.some(function(asset) { return url.pathname.endsWith(asset) || url.pathname === '/' || url.pathname === '/index.html'; }) ||
        url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.json')) {
        event.respondWith(
            fetch(request, { cache: 'no-store' })
                .then(function(response) {
                    if (response.ok) {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                })
                .catch(function() {
                    return caches.match(request).then(function(cached) {
                        return cached || fetch(request);
                    });
                })
        );
        return;
    }

    // For all other requests (CDN, images, Supabase) - Network first with cache fallback
    event.respondWith(
        fetch(request)
            .then(function(response) {
                // Only cache successful responses from CDN or images
                if (response.ok && (url.origin !== self.location.origin || request.url.includes('postimg') || request.url.includes('google'))) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(request, clone);
                    });
                }
                return response;
            })
            .catch(function() {
                return caches.match(request).then(function(cached) {
                    if (cached) return cached;
                    // For images, return placeholder if needed
                    return new Response('', { status: 404, statusText: 'Offline' });
                });
            })
    );
});
