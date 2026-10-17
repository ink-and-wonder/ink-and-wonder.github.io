const PREFIX =
  "ink-wonder-" + encodeURIComponent(self.registration.scope) + "-";
const CACHE = PREFIX + "v2.2.4";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "game.js",
  "data.js",
  "engine.js",
  "drawing.js",
  "music.js",
  "world.js",
  "state.js",
  "cloud-config.js",
  "cloud.js",
  "vendor/supabase.js",
  "manifest.webmanifest",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/atelier.webp",
  "assets/village.webp",
  "assets/forest.webp",
  "assets/fonts/fonts.css",
  ...Array.from({ length: 9 }, (_, i) => `assets/fonts/font-${i}.ttf`),
].flatMap(file => file.endsWith(".js") || file === "style.css" ? [file, file + "?v=2.2.4"] : [file]);
const URLS = new Set(
  FILES.map((file) => new URL(file, self.registration.scope).href),
);
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    (!URLS.has(url.href) && event.request.mode !== "navigate")
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && URLS.has(url.href)) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then((cache) => cache.put(event.request, copy)),
          );
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE),
          cached = await cache.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate")
          return cache.match(new URL("index.html", self.registration.scope));
        return Response.error();
      }),
  );
});
