/* 公差工具站 Service Worker
 * 策略：缓存优先 + 后台更新（stale-while-revalidate）
 * 版本号变更可强制刷新全部缓存
 */
const CACHE = 'gongcha-v3';
const CORE = [
  '/',
  '/fit/',
  '/form/',
  '/keyway/',
  '/roughness/',
  '/cylinder/',
  '/css/common.css',
  '/js/nav.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(CORE.map(function (u) { return new Request(u, { cache: 'reload' }); })); })
      .catch(function () { /* 个别资源失败不影响安装 */ })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  // 只处理本站资源，第三方（统计/字体等）直接放行
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });

      // 有缓存先用（秒开），后台静默更新；没缓存则等网络
      return cached || network;
    })
  );
});
