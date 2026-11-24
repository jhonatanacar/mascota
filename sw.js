// Service worker: la app abre sin internet (guarda sus archivos) y muestra los recordatorios push.
const CACHE = 'mascota-v1';
const APP = ['./', 'index.html', 'config.js', 'reglas.js', 'aprende.js', 'comida.js', 'ia.js', 'manifest.webmanifest',
  'icono-192.png', 'icono-512.png', 'apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'];

self.addEventListener('install', e => {
  // uno por uno: si un archivo falla, los demás igual quedan guardados
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(APP.map(u => c.add(u).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Red primero (siempre la última versión); si no hay internet, lo guardado. Los datos de Supabase no pasan por aquí.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const propio = url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net';
  if (e.request.method !== 'GET' || !propio) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })
    .then(r => r || (e.request.mode === 'navigate' ? caches.match('./') : Response.error()))));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch { d = { cuerpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Mascota', {
    body: d.cuerpo || '', icon: 'icono-192.png', badge: 'icono-192.png', tag: d.tag, data: { url: './' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(ws => ws.length ? ws[0].focus() : self.clients.openWindow(e.notification.data.url)));
});
