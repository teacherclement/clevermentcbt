// ============================================================
// CLEVERMENT SERVICE WORKER (Offline Support)
// ============================================================
// Strategy: NETWORK-FIRST. Always try to fetch the latest version
// from the network first; only fall back to the cached copy if the
// network request fails (e.g. the device is offline). This means
// deployed updates show up immediately instead of being masked by
// an old cached copy.
// ============================================================

var CACHE_NAME = 'cleverment-v73';
var urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/cm-theme.css',
    '/cm-theme.js',
    '/cm-redesign.css',
    '/cm-redesign.js',
    '/cm-premium.css',
    '/cm-ui.js',
    '/cm-speech.js',
    '/cm-profile.js',
    '/cm-notify.js',
    '/cm-watch.js',
    '/competition-ui.js',
    '/competition.css',
    '/logo.png',
    '/logo-icon.png',
    '/apple-touch-icon.png',
    '/favicon-64.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js',
    'https://unpkg.com/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    'https://i.postimg.cc/q73QqsQR/cleverment-logo.jpg'
];

// Install: cache the core files, and activate this new worker
// immediately instead of waiting for old tabs to close. Each URL
// is fetched individually rather than via cache.addAll(), so one
// slow/unreachable CDN can't block the whole install (addAll fails
// the entire install if even a single request fails).
self.addEventListener('install', function(event) {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return Promise.all(
                urlsToCache.map(function(url) {
                    return cache.add(url).catch(function(err) {
                        console.warn('SW: could not precache', url, err);
                    });
                })
            );
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
    // Only handle this site's own files. Calls to the backend (a different address) go straight to the network,
    // so a bad connection can never be answered with an empty cached response, and quiz data is never cached.
    try {
        if (new URL(event.request.url).origin !== self.location.origin) return;
    } catch (e) { return; }

    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
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

// ============================================================
// PHONE ALERTS (Web Push)
// ============================================================
self.addEventListener('push', function(event) {
    var d = {};
    try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: 'CleverMent', body: event.data ? event.data.text() : '' }; }
    var title = d.title || 'CleverMent';
    var isApple = /iPhone|iPad|iPod|Macintosh/.test(self.navigator.userAgent || '');
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
            // If CleverMent is open and in front, the in-app alert already shows it (Apple devices always need the system alert).
            var open = list.some(function(c) { return c.visibilityState === 'visible'; });
            if (open && !isApple) return;
            return self.registration.showNotification(title, {
                body: d.body || '',
                icon: '/icon-192.png',
                badge: '/favicon-64.png',
                tag: d.tag || undefined,
                renotify: !!d.tag,
                data: d.data || {}
            });
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    var data = event.notification.data || {};
    var go = data.go || '';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
            for (var i = 0; i < list.length; i++) {
                if ('focus' in list[i]) {
                    try { list[i].postMessage({ type: 'cm-notify-click', go: go }); } catch (e) {}
                    return list[i].focus();
                }
            }
            return self.clients.openWindow('/?cmn=' + encodeURIComponent(go));
        })
    );
});
