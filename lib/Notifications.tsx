import { useCallback, useEffect, useRef, useState } from 'react';

type Kind = 'discussion' | 'messages';
type RequestApi = (action:string, data?:Record<string,unknown>)=>Promise<any>;
function supported() { return typeof window!=='undefined' && window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window; }
function keyBytes(value:string) { const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from(raw,c=>c.charCodeAt(0)); }
async function worker() {
  const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
  await registration.update();
  return await navigator.serviceWorker.ready;
}
export async function stopDeviceNotifications(api:RequestApi) {
  if(!('serviceWorker' in navigator)) return;
  const registration=await navigator.serviceWorker.getRegistration('/');
  const subscription=await registration?.pushManager?.getSubscription();
  if(subscription) {
    await api('unsubscribe',{endpoint:subscription.endpoint});
    await subscription.unsubscribe();
  }
  localStorage.removeItem('crm-push-enabled');
}
export function CrmNotifications({api,identity,onOpen}:{api:RequestApi;identity:string;onOpen:(kind:Kind)=>void}) {
  const [active,setActive]=useState(false);
  const [busy,setBusy]=useState(false);
  const [panel,setPanel]=useState(false);
  const [notice,setNotice]=useState('');
  const [toast,setToast]=useState<Kind|null>(null);
  const openRef=useRef(onOpen);
  openRef.current=onOpen;
  const seen=useRef(new Set<string>());
  const signal=useCallback((kind:Kind,id:string)=>{
    if(seen.current.has(id))return;
    seen.current.add(id);
    if(seen.current.size>300)seen.current.delete(seen.current.values().next().value!);
    setToast(kind);
    window.dispatchEvent(new CustomEvent('crm:message-arrived',{detail:{kind}}));
  },[]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),12000);return()=>clearTimeout(timer)},[toast]);
  useEffect(()=>{
    let stopped=false;
    let reading=false;
    let cursor:number|null=null;
    seen.current.clear();
    const poll=async()=>{
      if(stopped||reading||document.hidden)return;
      reading=true;
      try {
        let result;
        do {
          result=await api('feed',{since:cursor});
          if(stopped)return;
          cursor=result.cursor;
          for(const event of result.events||[])signal(event.kind,String(event.id));
        } while(result.hasMore&&!stopped);
      }catch{/* Keep the existing CRM available if the notification relay is down. */}
      finally{reading=false;}
    };
    void poll();
    const timer=setInterval(()=>void poll(),15000);
    const onVisibility=()=>void poll();
    document.addEventListener('visibilitychange',onVisibility);
    const onMessage=(event:MessageEvent)=>{
      if(event.data?.type==='crm:notification')signal(event.data.kind,String(event.data.eventId));
      if(event.data?.type==='crm:open-notification'&&['discussion','messages'].includes(event.data.kind))openRef.current(event.data.kind);
    };
    navigator.serviceWorker?.addEventListener('message',onMessage);
    const params=new URLSearchParams(window.location.search);
    const kind=params.get('notification');
    if(kind==='discussion'||kind==='messages'){
      openRef.current(kind);params.delete('notification');
      history.replaceState({},'',location.pathname+(params.size?'?'+params.toString():'')+location.hash);
    }
    if(supported())void (async()=>{
      try{
        const registration=await worker();
        const subscription=await registration.pushManager.getSubscription();
        if(subscription&&Notification.permission==='granted'&&localStorage.getItem('crm-push-enabled')==='true'){
          await api('subscribe',{subscription:subscription.toJSON()});
          if(!stopped)setActive(true);
        }
      }catch{if(!stopped)setNotice('Réactivez les notifications pour reconnecter cet appareil.');}
    })();
    return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility);navigator.serviceWorker?.removeEventListener('message',onMessage)};
  },[api,identity,signal]);
  const enable=async()=>{
    if(busy)return;
    if(!supported()){setPanel(true);setNotice('Sur iPhone ou iPad, ouvrez le CRM installé sur l’écran d’accueil. Sinon, utilisez un navigateur compatible avec les notifications.');return;}
    setBusy(true);setNotice('');
    try{
      // Request from the user's click before any asynchronous network work (iOS requirement).
      const permission=await Notification.requestPermission();
      if(permission!=='granted')throw new Error('Autorisez les notifications dans les réglages du navigateur ou de l’appareil.');
      const [registration,config]=await Promise.all([worker(),api('config')]);
      let subscription=await registration.pushManager.getSubscription();
      if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(config.publicKey)});
      await api('subscribe',{subscription:subscription.toJSON()});
      localStorage.setItem('crm-push-enabled','true');setActive(true);setPanel(true);
      setNotice('Notifications activées. Vous pouvez envoyer un test sur cet appareil.');
    }catch(error){setPanel(true);setNotice(error instanceof Error?error.message:'Activation impossible.');}
    finally{setBusy(false);}
  };
  const disable=async()=>{
    setBusy(true);
    try{await stopDeviceNotifications(api);setActive(false);setNotice('Notifications désactivées sur cet appareil.');}
    catch{setNotice('Désactivation non confirmée. Réessayez.');}
    finally{setBusy(false);}
  };
  const test=async()=>{
    setBusy(true);
    try{
      const subscription=await (await worker()).pushManager.getSubscription();
      if(!subscription)throw new Error('Réactivez les notifications.');
      await api('test',{endpoint:subscription.endpoint});setNotice('Test accepté par le service de notification.');
    }catch(error){setNotice(error instanceof Error?error.message:'Test impossible.');}
    finally{setBusy(false);}
  };
  const buttonStyle={border:'1px solid #D9DCE5',borderRadius:8,padding:'8px 10px',background:'#fff',color:'#19213D',cursor:'pointer',fontSize:12,minHeight:40};
  return <>
    <button type="button" disabled={busy} style={buttonStyle} title="Notifications des messages clients et discussions" onClick={()=>active?setPanel(!panel):void enable()}>🔔 {busy?'Patientez…':active?'Notifications actives':'Activer notifications'}</button>
    {panel&&<div role="dialog" aria-label="Notifications" style={{position:'fixed',zIndex:600,top:80,right:12,width:'min(360px,calc(100vw - 24px))',padding:16,border:'1px solid #D9DCE5',borderRadius:12,background:'#fff',boxShadow:'0 8px 30px #0002',color:'#19213D'}}>
      <button type="button" aria-label="Fermer les réglages des notifications" onClick={()=>setPanel(false)} style={{float:'right',border:0,background:'none',cursor:'pointer'}}>×</button>
      <strong>Notifications sur cet appareil</strong>
      <p style={{fontSize:13,lineHeight:1.5}}>Messages clients et discussions autorisées. Les alertes n’affichent pas les informations du client.</p>
      {notice&&<p role="status" style={{fontSize:13,lineHeight:1.5}}>{notice}</p>}
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{active?<><button disabled={busy} style={buttonStyle} onClick={()=>void test()}>Envoyer un test</button><button disabled={busy} style={buttonStyle} onClick={()=>void disable()}>Désactiver</button></>:<button disabled={busy} style={buttonStyle} onClick={()=>void enable()}>Activer</button>}</div>
    </div>}
    {toast&&<div role="status" aria-live="polite" style={{position:'fixed',zIndex:590,bottom:20,right:12,maxWidth:'calc(100vw - 24px)',padding:16,borderRadius:12,background:'#19213D',color:'#fff',boxShadow:'0 8px 30px #0003',display:'flex',gap:12,alignItems:'center'}}><button type="button" style={{border:0,background:'none',color:'#fff',textAlign:'left',cursor:'pointer',fontSize:14}} onClick={()=>{openRef.current(toast);setToast(null)}}>{toast==='discussion'?'Nouveau message dans les discussions':'Nouveau message client'} · Ouvrir</button><button type="button" aria-label="Fermer l’alerte" onClick={()=>setToast(null)} style={{background:'none',border:0,color:'#fff',cursor:'pointer'}}>×</button></div>}
  </>;
}
