/* SlashPromo Phase A: offline fallback only. No patient, profile, search, admin, API, or form data is cached. */
"use strict";
const CACHE = "slashpromo-pwa-shell-v1";
const SHELL = ["/offline.html", "/assets/pwa-icon.svg", "/assets/pwa-maskable.svg"];
const PRIVATE = /^\/(?:api(?:\/|$)|admin(?:\/|$)|qa-admin(?:\/|$)|control-center(?:\/|$)|analytics(?:\/|$)|enquiries(?:\/|$)|secure-backups(?:\/|$)|review(?:\/|$)|automation(?:\/|$)|functions(?:\/|$))/i;
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("slashpromo-pwa-shell-") && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || PRIVATE.test(url.pathname)) return;
  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match("/offline.html")) || Response.error();
  }));
});
