// Minimal service worker: caches the app shell so ViscoLoop installs as a
// PWA and still opens if the network is briefly unavailable. API calls always
// go to the network (never cached), since documents/tools/chat must stay
// fresh. The shell itself is network-FIRST — this is an actively-changing
// internal app, so a visit while online should always show the latest
// version; the cache is purely an offline fallback, not the primary source.

const CACHE = "viscoloop-shell-v2";
const SHELL_FILES = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/js/app.js",
  "/js/api.js",
  "/js/chat.js",
  "/manifest.webmanifest",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) return; // never cache API/bot responses
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
