// Bump this version on every deploy that changes any APP_SHELL file: a
// byte-different sw.js is what makes the browser install the new worker,
// which (via skipWaiting + controllerchange in script.js) reloads open
// clients onto the fresh files immediately instead of one launch later.
const CACHE_NAME = "autoshort-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./fonts/ObelixProB-cyr.ttf",
];

self.addEventListener("install", (event) => {
  // cache: "reload" bypasses the HTTP cache so the new worker always
  // installs with genuinely fresh copies (GitHub Pages serves files with
  // a 10-minute max-age that could otherwise sneak stale ones back in).
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" }))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only manage caching for our own static assets — API calls (Cloudflare
  // Pages Functions, MyAnimeList/ANN images) must always hit the network
  // for live data, never the cache.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || "Nouvelle actu disponible",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    data: { url: data.url || "./" },
  };
  event.waitUntil(self.registration.showNotification(data.title || "Sukishort", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
