// FXSEDGE Service Worker — notifications push + offline cache

const CACHE_NAME = 'fxsedge-v2'
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.svg']

// Install — cache static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  )
})

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  // Don't intercept external resources, APIs, or WebSocket
  const url = e.request.url
  if (!url.startsWith(self.location.origin)) return
  if (url.includes('/api/')) return
  
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok && r.type === 'basic') {
        const clone = r.clone()
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
      }
      return r
    }).catch(() => caches.match(e.request))
  )
})

// Push notifications
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'FXSEDGE', body: 'Alerte prix' }
  e.waitUntil(
    self.registration.showNotification(data.title || 'FXSEDGE', {
      body: data.body || 'Alerte de prix atteinte',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [100, 50, 100],
      tag: data.tag || 'fxs-alert',
      data: { url: data.url || '/' },
    })
  )
})

// Click on notification — open app
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      if (list.length) return list[0].focus()
      return clients.openWindow(e.notification.data?.url || '/')
    })
  )
})
