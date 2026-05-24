// public/sw.js
// Network-first for HTML (prevents blank screen after Vercel redeploy)
// Cache-first for static assets (fonts, icons, images)

const CACHE_NAME    = 'meckury-v4'
const STATIC_ASSETS = ['/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = event.request.url

  // ── CRITICAL: never intercept auth flow routes ───────────────
  // These routes carry ?code= or #access_token query params that
  // must reach the React app intact. Any SW interference breaks
  // exchangeCodeForSession and the entire OAuth flow.
  if (
    url.includes('/auth/callback') ||
    url.includes('/auth/reset-password')
  ) return

  // ── Never intercept API or external service calls ────────────
  if (
    url.includes('/api/')      ||
    url.includes('supabase')   ||
    url.includes('fal.ai')     ||
    url.includes('wavespeed')  ||
    url.includes('anthropic')  ||
    url.includes('paystack')   ||
    url.includes('googleapis') ||
    url.includes('gstatic')
  ) return

  const isHTML    = event.request.headers.get('accept')?.includes('text/html')
  const isJSorCSS = url.match(/\.(js|css)(\?|$)/)

  // ── HTML pages: always network-first ────────────────────────
  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)          // never cache HTML
        .catch(() => caches.match('/index.html'))  // offline fallback
    )
    return
  }

  // ── JS/CSS chunks: network-first (new deploy = new hashes) ──
  if (isJSorCSS) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          }
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // ── Static assets (icons, images, fonts): cache-first ───────
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
    })
  )
})
