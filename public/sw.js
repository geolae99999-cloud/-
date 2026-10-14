/* VocaPro 서비스 워커: 네트워크 우선 + 오프라인 폴백 + 알림 클릭 */
const CACHE = 'vocapro-1c260c7038';
const CORE = ["./", "style.css", "config.js", "cloud.js", "app1.js", "app2.js", "app3.js", "app4.js", "app5.js", "app6.js", "app7.js", "app8.js", "app9.js", "app10.js", "app11.js", "app12.js", "app13.js", "app14.js", "app15.js", "app16.js", "app17.js", "app18.js", "app19.js", "app20.js", "app21.js", "app22.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('vocapro-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.includes('/asr/')) return; // 기기 음성 AI 파일은 앱이 따로(vp-asr-1 캐시) 저장해요
  e.respondWith(fetch(req).then(res => {
    if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow ? self.clients.openWindow('./') : null;
  }));
});
