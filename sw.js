// Permite reabrir la página sin señal: guarda la página, la lista y el lector QR en el celular.
var CACHE = 'cc-v1';
var LIB = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(['./', 'index.html', 'config.js', 'datos.bin']).then(function () {
      return fetch(new Request(LIB, { mode: 'no-cors' })).then(function (r) { return c.put(LIB, r); }).catch(function () {});
    });
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});

function guardar(req, res) {
  var copia = res.clone();
  caches.open(CACHE).then(function (c) { c.put(req, copia); });
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') { return; }
  var url = new URL(req.url);
  if (url.origin === location.origin) {
    // Red primero (máx. 5 s), si no hay señal usa la copia guardada
    e.respondWith(new Promise(function (ok) {
      var listo = false;
      var t = setTimeout(function () {
        caches.match(req, { ignoreSearch: true }).then(function (r) { if (r && !listo) { listo = true; ok(r); } });
      }, 5000);
      fetch(req).then(function (res) {
        clearTimeout(t);
        if (!listo) { listo = true; ok(guardar(req, res)); } else { guardar(req, res); }
      }).catch(function () {
        clearTimeout(t);
        caches.match(req, { ignoreSearch: true }).then(function (r) { if (!listo) { listo = true; ok(r || Response.error()); } });
      });
    }));
  } else if (req.url.indexOf('html5-qrcode') >= 0) {
    e.respondWith(caches.match(LIB).then(function (r) {
      return r || fetch(req).then(function (res) { return guardar(LIB, res); });
    }));
  }
});
