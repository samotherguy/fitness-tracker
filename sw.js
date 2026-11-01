// Network-first app shell, cache fallback for offline launch. Bump CACHE on every deploy.
const CACHE='form-v2.4.0';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png',
 './cats/frito_sit.webp','./cats/frito_sit_blink.webp','./cats/ramona_sit.webp','./cats/ramona_sit_blink.webp',
 './cats/frito_alert.webp','./cats/frito_alert_meow.webp','./cats/ramona_sleep.webp','./cats/frito_bow.webp','./cats/ramona_bow.webp','./cats/ramona_think.webp','./cats/frito_think.webp','./cats/frito_sit_meow.webp','./cats/ramona_sit_meow.webp'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.pathname.includes('/api/'))return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r})
    .catch(()=>caches.match(e.request).then(m=>m||(e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
