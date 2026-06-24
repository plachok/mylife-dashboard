const CACHE='mylife-v34';
const SHELL=[
  './',
  './index.html',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  // Firebase auth handler — must never be cached or intercepted
  if(url.pathname.startsWith('/__/')){return;}
  // API calls — network only, no cache
  if(url.hostname.includes('generativelanguage.googleapis.com')||
     url.hostname.includes('openfoodfacts.org')||
     url.hostname.includes('firestore.googleapis.com')||
     url.hostname.includes('firebasestorage.googleapis.com')||
     url.hostname.includes('identitytoolkit.googleapis.com')||
     url.hostname.includes('openrouter.ai')){
    return;
  }
  // Shell: cache-first
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached)return cached;
      return fetch(e.request).then(resp=>{
        if(resp&&resp.status===200&&resp.type!=='opaque'){
          const clone=resp.clone();
          caches.open(CACHE).then(c=>c.put(e.request,clone));
        }
        return resp;
      }).catch(()=>caches.match('./index.html'));
    })
  );
});
