// 짱구's Desk 서비스워커
// - 같은 사이트의 파일은 '네트워크 우선': 새로 배포하면 바로 최신 화면이 뜨고, 오프라인일 때만 저장본을 사용
// - Supabase / 구글 등 다른 사이트 요청은 건드리지 않음 (로그인·데이터가 캐시되지 않도록)
// - 파일 구성을 바꿔 배포할 때는 CACHE 이름의 숫자를 올리면 옛 저장본이 정리됨
const CACHE = 'exam-v3';
const PRECACHE = [
  '/', '/dashboard.html', '/index.html', '/todo.html', '/project.html',
  '/style.css', '/common.js', '/manifest.json',
  '/icons/icon-192.png', '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(PRECACHE.map(u => cache.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('/dashboard.html') : undefined)))
  );
});

// 알림을 누르면 열려 있는 앱 창으로 이동하고, 없으면 새로 염
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/dashboard.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
