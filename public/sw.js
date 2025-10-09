const CACHE_NAME = 'over-the-hill-v1758349263597'; // Bump version to force update
const urlsToCache = [
  '/manifest.json',
  '/favicon.ico',
  // Remove '/' from cache to prevent stale homepage
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Error caching app shell:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external resources
  if (!url.href.startsWith(self.location.origin)) {
    return;
  }

  // Define patterns that should NEVER be cached
  const shouldSkipCache = 
    // API routes
    url.pathname.includes('/api/') ||
    // Supabase endpoints
    url.hostname.includes('supabase') ||
    // Next.js data routes (production)
    url.pathname.includes('/_next/data/') ||
    // JSON responses
    url.pathname.endsWith('.json') ||
    url.searchParams.has('_rsc') || // React Server Components
    // Authentication
    url.pathname.includes('/auth/') ||
    // Main pages (to ensure fresh data)
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    // Next.js build files that contain dynamic imports
    url.pathname.includes('/_next/static/chunks/pages/') ||
    // Any query parameters (likely dynamic content)
    url.search.length > 0;

  if (shouldSkipCache) {
    console.log('[SW] Network-only for:', request.url);
    return;
  }

  // Only cache static assets (images, fonts, CSS, JS bundles)
  const isStaticAsset = 
    url.pathname.includes('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|otf|css)$/i);
  
  if (!isStaticAsset) {
    console.log('[SW] Skipping non-static asset:', request.url);
    return;
  }

  // For static assets, use cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          console.log('[SW] Cache hit:', request.url);
          return response;
        }

        console.log('[SW] Cache miss, fetching:', request.url);
        return fetch(request)
          .then((response) => {
            // Only cache successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Only cache truly static assets
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('[SW] Caching static asset:', request.url);
                cache.put(request, responseToCache);
              })
              .catch((error) => {
                console.error('[SW] Cache error:', error);
              });

            return response;
          });
      })
      .catch((error) => {
        console.error('[SW] Fetch failed:', error);
        // Don't return cached pages for failed requests
        return new Response('Network error', { status: 503 });
      })
  );
});

// Message event - handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Received CLEAR_CACHE message');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW] Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('[SW] All caches cleared');
        // Notify the app that cache is cleared
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'CACHE_CLEARED'
            });
          });
        });
      })
    );
  }
  
  // Handle selective cache invalidation
  if (event.data && event.data.type === 'INVALIDATE_CACHE') {
    console.log('[SW] Received INVALIDATE_CACHE message for pattern:', event.data.pattern);
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.keys().then((requests) => {
          const toDelete = requests.filter(request => {
            // Invalidate cache entries matching the pattern
            if (event.data.pattern) {
              return request.url.includes(event.data.pattern);
            }
            // Invalidate all data-related cache entries
            return request.url.includes('.json') || 
                   request.url.includes('/_next/data/');
          });
          
          return Promise.all(
            toDelete.map(request => {
              console.log('[SW] Invalidating cache for:', request.url);
              return cache.delete(request);
            })
          );
        });
      }).then(() => {
        console.log('[SW] Cache invalidation complete');
      })
    );
  }
});