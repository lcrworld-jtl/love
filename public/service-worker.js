// Love 站点 Service Worker
// 策略：API 请求网络优先（数据时效性），静态资源缓存优先（含离线兜底）

const CACHE_VERSION = 'love-v16';
const STATIC_CACHE = CACHE_VERSION + '-static';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';

// 预缓存的静态资源
const PRECACHE_URLS = [
  '/',
  '/lover',
  '/capsule',
  '/stars',
  '/css/style.css',
  '/js/app.js',
  '/js/capsule.js',
  '/js/stars.js',
  '/js/widgets.js',
  '/js/common.js',
  '/js/sakura.js',
  '/js/click-effect.js',
  '/manifest.json'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => !k.startsWith(CACHE_VERSION))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// 请求拦截
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 只处理 GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 同源 API：网络优先，失败时返回缓存（无缓存返回 JSON 错误）
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          // 不缓存 POST/PUT 的响应；GET API 缓存短时
          if (req.method === 'GET' && res.ok) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then(r => r || new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })))
    );
    return;
  }

  // 语音文件：网络优先，失败回缓存
  if (url.pathname.startsWith('/voice/')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, clone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 同源静态资源
  if (url.origin === self.location.origin) {
    // HTML 导航请求：网络优先，确保页面始终最新
    if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
      event.respondWith(
        fetch(req).then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(req, clone)).catch(() => {});
          }
          return res;
        }).catch(() => caches.match(req).then(r => r || caches.match('/')))
      );
      return;
    }

    // 其他静态资源：缓存优先，回退网络
    event.respondWith(
      caches.match(req).then(cached => {
        return cached || fetch(req).then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(req, clone)).catch(() => {});
          }
          return res;
        }).catch(() => {
          // 离线兜底：HTML 请求回退到首页
          if (req.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
        });
      })
    );
    return;
  }

  // 跨域请求（如图片、Three.js CDN）：直接网络
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

// 接收消息：手动更新
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
