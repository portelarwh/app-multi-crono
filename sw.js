'use strict';

const CACHE = 'multi-crono-v3.0.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon.svg',
  './assets/Icon-192.png',
  './assets/Icon-512.png',
  './multi-whatsapp-share-fix.js',
  './multi-pwa-update.js'
];

function injectScripts(html){
  const scripts = '\n<script src="multi-whatsapp-share-fix.js" defer></script>\n<script src="multi-pwa-update.js" defer></script>\n';
  if(html.includes('multi-whatsapp-share-fix.js')) return html;
  if(html.includes('</body>')) return html.replace('</body>', scripts + '</body>');
  return html + scripts;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => response.text())
        .then(html => new Response(injectScripts(html), {
          headers: {'Content-Type':'text/html; charset=UTF-8'}
        }))
        .catch(() => caches.match('./index.html').then(cached => cached ? cached.text() : '')
          .then(html => new Response(injectScripts(html), {
            headers: {'Content-Type':'text/html; charset=UTF-8'}
          })))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
