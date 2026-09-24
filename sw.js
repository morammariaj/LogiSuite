const CACHE="logisuite-v52";const CORE=["./","./index.html","./style.css?v=41","./config.js","./app.js?v=52","./compat.js?v=52","./manifest.webmanifest?v=4","./icon-192-lilac.svg","./icon-512-lilac.svg","./favicon-lilac.svg","https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css","https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js","https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2","https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js","https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js","https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js","https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.wasm"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url);
 if(u.pathname.endsWith("/sw.js")||u.pathname.endsWith("/index.html")||u.pathname.endsWith("/app.js")||u.pathname.endsWith("/compat.js")||u.pathname==="/"||u.pathname.endsWith("/LogiSuite/")){
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{});return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))));
  return;
 }
 e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(x=>x.put(e.request,cp)).catch(()=>{});return r}).catch(()=>caches.match("./index.html"))));
});