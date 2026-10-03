// Notifications only: no customer data or API responses are cached.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
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
