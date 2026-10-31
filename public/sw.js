
const SHELL_CACHE='bosc-shell-offline-20261031-v7';
async function prepareShell(){
 const cache=await caches.open(SHELL_CACHE);const home=await fetch('/',{cache:'reload'});if(!home.ok)throw Error('Shell unavailable');
 await cache.put('/',home.clone());const html=await home.text();
 const queue=[...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]).filter(x=>/^\/assets\//.test(x));
 for(const icon of ['/icons/bc-180.png','/icons/bc-192.png','/icons/bc-512.png','/apple-touch-icon.png','/logo-bosc.png']){try{const r=await fetch(icon);if(r.ok&&r.headers.get('content-type')?.startsWith('image/'))await cache.put(icon,r)}catch{}}
 const seen=new Set();
 while(queue.length){const path=queue.shift();if(seen.has(path))continue;seen.add(path);const response=await fetch(path,{cache:'reload'});if(!response.ok)throw Error('Asset unavailable');await cache.put(path,response.clone());if(path.endsWith('.js')){const code=await response.text();for(const m of code.matchAll(/["']((?:\.\/|\/)?(?:assets\/)?[A-Za-z0-9_.-]+\.(?:js|css))["']/g)){const file=m[1];const next=file.startsWith('/assets/')?file:file.startsWith('assets/')?'/'+file:new URL(file,new URL(path,self.location.origin)).pathname;if(next.startsWith('/assets/'))queue.push(next)}}}
}
self.addEventListener('install',event=>event.waitUntil(prepareShell()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('bosc-shell-offline-')&&name!==SHELL_CACHE)await caches.delete(name);await self.clients.claim()})()));
// API responses and private customer data are NEVER placed in CacheStorage.
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);if(u.origin!==self.location.origin||event.request.method!=='GET')return;
 if(event.request.mode==='navigate'&&!u.pathname.startsWith('/api/')){
   event.respondWith(fetch(event.request).catch(async()=>{const cached=await(await caches.open(SHELL_CACHE)).match('/');return cached||Response.error()}));return;
 }
 if(u.pathname.startsWith('/assets/')||u.pathname.startsWith('/icons/')||['/apple-touch-icon.png','/logo-bosc.png'].includes(u.pathname))event.respondWith((async()=>{const c=await caches.open(SHELL_CACHE);return (await c.match(u.pathname))||fetch(event.request)})());
});

self.addEventListener('push',event=>{
  let data={};
  try { data=event.data?.json()||{}; } catch { /* Use the generic fallback. */ }
  const kind=['discussion','messages'].includes(data.kind)?data.kind:'test';
  event.waitUntil((async()=>{
    await self.registration.showNotification('CRM Bosc',{
      body:kind==='discussion'?'Nouveau message dans les discussions.':kind==='messages'?'Nouveau message client dans votre CRM.':'Les notifications sont activées sur cet appareil.',
      tag:'crm-'+kind,renotify:true,icon:self.location.origin+'/icons/icon-192.png',data:{kind},
    });
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows)if(kind!=='test')client.postMessage({type:'crm:notification',kind,eventId:data.eventId});
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const kind=event.notification.data?.kind;
  const url=new URL('/',self.location.origin);
  if(kind==='discussion'||kind==='messages')url.searchParams.set('notification',kind);
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if(new URL(client.url).origin===self.location.origin){
        await client.focus();client.postMessage({type:'crm:open-notification',kind});return;
      }
    }
    await self.clients.openWindow(url.href);
  })());
});

