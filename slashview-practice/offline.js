'use strict';
const prefix = 'slashview-practice-';
const version = prefix + 'v1';
const paths = ['./', './index.html', './style.css', './practice.js', './stations.json', './manifest.webmanifest', './icon.png'];
const urls = new Set(paths.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(version).then(cache => cache.addAll(paths)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(prefix) && key !== version).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate' && event.request.url.startsWith(self.registration.scope)) {
    event.respondWith(caches.open(version).then(cache => cache.match('./')).then(cached => cached || fetch(event.request)));
  } else if (urls.has(event.request.url)) {
    event.respondWith(caches.open(version).then(cache => cache.match(event.request)).then(cached => cached || fetch(event.request)));
  }
});