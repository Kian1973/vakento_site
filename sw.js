// Vakento PWA: alleen openbare, statische appbestanden offline opslaan.
const CACHE = "vakento-static-v17-privacy";
const STATIC = new Set([
  "/css/vakento.css",
  "/css/vakento-app.css",
  "/js/vakento-app.js",
  "/js/api.js",
  "/js/self-heal.js",
  "/js/install-app.js",
  "/js/max.js",
  "/assets/vakento-app-icon.svg"
]);

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("vakento-") && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode === "navigate") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !STATIC.has(url.pathname)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: "no-store" });
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (err) {
      const cached = await caches.match(request);
      if (cached) return cached;
      throw err;
    }
  })());
});
