// Minimal service worker for PWA installability.
// Network-first for everything — no aggressive caching that could
// cause stale worship/Bible/auth state.

const CACHE_NAME = "fusion-v2"
const PRECACHE = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  // Let Supabase Realtime, auth, and API requests always go to network
  const url = new URL(event.request.url)
  if (
    url.pathname === "/obs-access" ||
    url.pathname === "/bible/obs" ||
    url.pathname.startsWith("/bible/obs/") ||
    url.pathname === "/lyrics/obs" ||
    url.pathname.startsWith("/lyrics/obs/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname === "/login" ||
    url.pathname.startsWith("/login/") ||
    url.pathname === "/signup" ||
    url.pathname.startsWith("/signup/") ||
    url.pathname === "/register" ||
    url.pathname === "/reset-password" ||
    url.hostname.includes("supabase")
  ) {
    return
  }

  // Network-first for everything else
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached ?? Response.error())
    )
  )
})
