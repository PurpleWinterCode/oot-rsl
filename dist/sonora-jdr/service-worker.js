const CACHE='sonora-shell-v2';
const CORE=['./','./index.html','./styles.css','./app.js','./db.js','./state.js','./audio.js','./manifest.webmanifest','./assets/icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sonora-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(event.request);
      if(response.ok && !new URL(event.request.url).pathname.includes('/samples/'))cache.put(event.request,response.clone());
      return response;
    }catch{return (await cache.match(event.request))||Response.error();}
  })());
});
