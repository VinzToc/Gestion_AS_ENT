const V='mon-as-v1.0.0';
const FILES=['./','index.html','app.js','style.css','as-core.js','eps-core.js','eleve-core.js','textes-legaux.js','version.js','confidentialite.html','manifest.webmanifest','img/logo-app.png','img/logo-as.png','icons/icon-192.png','icons/icon-512.png','lib/qrcode-generator-1.4.4.js','lib/jspdf-2.5.1.umd.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
