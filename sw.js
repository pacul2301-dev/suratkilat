/* Service worker SuratKilat: cangkang aplikasi (HTML/CSS/JS/ikon) disimpan agar terbuka instan & bisa dipasang di HP.
   Permintaan ke Google Apps Script (data) TIDAK pernah disimpan di sini — data tetap lewat server dengan token. */
var VERSI = 'suratkilat-v1.0.0';
var CANGKANG = ['./', './index.html', './verifikasi.html', './css/app.css?v=1.0.0', './js/config.js?v=1.0.0', './js/core.js?v=1.0.0', './js/charts.js?v=1.0.0',
  './js/pages-surat.js?v=1.0.0', './js/pages-lain.js?v=1.0.0', './js/app.js?v=1.0.0', './js/verifikasi.js?v=1.0.0', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSI).then(function (c) { return c.addAll(CANGKANG); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSI; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || /script\.google(usercontent)?\.com|accounts\.google\.com|googleapis\.com\/oauth/.test(url.host + url.pathname)) return;
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') { e.respondWith(fetch(req).then(function (r) { var k = r.clone(); caches.open(VERSI).then(function (c) { c.put(req, k); }); return r; }).catch(function () { return caches.match(req).then(function (r) { return r || caches.match('./index.html'); }); })); return; }
    if (/\/js\/config\.js/.test(url.pathname)) { e.respondWith(fetch(req).catch(function () { return caches.match(req); })); return; }
    e.respondWith(caches.match(req).then(function (r) { return r || fetch(req).then(function (res) { var k = res.clone(); caches.open(VERSI).then(function (c) { c.put(req, k); }); return res; }); }));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(url.host)) {
    e.respondWith(caches.open(VERSI + '-cdn').then(function (c) { return c.match(req).then(function (hit) { var net = fetch(req).then(function (res) { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(function () { return hit; }); return hit || net; }); }));
  }
});
