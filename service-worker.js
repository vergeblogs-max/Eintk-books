
const STATIC_CACHE_NAME = 'eintk-static-v7';
const DYNAMIC_CACHE_NAME = 'eintk-dynamic-v7';

// Assets to be precached on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/index.css',
    'https://i.ibb.co/8gh3Q7Cd/Google-AI-Studio-2025-11-06-T13-09-43-299-Z.png', 
    'https://i.ibb.co/xqR9J0rm/apple-touch-icon.png', 
    'https://i.ibb.co/v6Mf9F37/android-chrome-192x192.png', 
    'https://i.ibb.co/HRx7T4z/android-chrome-512x512.png',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js'
];

// Routes that need their JS chunks cached for offline usage
const READER_ROUTES = [
    '/ebook-reader',
    '/exam-qst-reader',
    '/general-reader'
];

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            console.log('[SW] Forging App Shell & Reader Engine');
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    if (url.hostname.includes('firebase') || 
        url.hostname.includes('googleapis.com')) {
        return;
    }

    // Cache-First for static/engine assets
    if (STATIC_ASSETS.includes(url.pathname) || 
        url.hostname === 'aistudiocdn.com' || 
        url.hostname === 'cdn.jsdelivr.net') {
        
        event.respondWith(
            caches.match(request).then(cachedResponse => {
                return cachedResponse || fetch(request).then(networkResponse => {
                    return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // Network-First for navigations, fallback to cached index.html
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('/'))
        );
        return;
    }

    // Stale-While-Revalidate for dynamic assets (images/JSON)
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            const fetchPromise = fetch(request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                        cache.put(request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => {});
            return cachedResponse || fetchPromise;
        })
    );
});
