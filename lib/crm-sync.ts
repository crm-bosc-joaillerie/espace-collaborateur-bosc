import {OfflineStore} from './offline-core';
import { stopDeviceNotifications } from "./Notifications";
const ENDPOINT = "https://vdmlixjrbudklieictfj.supabase.co/functions/v1/collaborator-gateway";
const PUBLISHABLE_KEY = "sb_publishable_5DSJ2xzo2pokkFbkB0FTRg_7T4DDwKg";
const DEVICE_KEY = "bosc-collaborateur-appareil";
const SESSION_KEY = "bosc-collaborateur-session";
const NAME_KEY = "bosc-collaborateurs-name";

export type CrmRecord = { id:string; record_key:string; module:string; data:Record<string,any>; updated_at?:string };
export type SharedCrmData = { planning:CrmRecord[]; pochettes:CrmRecord[]; devis:CrmRecord[]; discussion:CrmRecord[]; messages:CrmRecord[]; conges:CrmRecord[]; primes:CrmRecord[]; commandes:CrmRecord[] };
export function recordData(row:CrmRecord) { return { ...(row.data || {}), _crmId:row.id, record_key:row.record_key }; }

async function request(action:string, data:Record<string,any> = {}, authenticated = true) {
  const token = authenticated ? localStorage.getItem(SESSION_KEY) : null;
  if (authenticated && !token) throw new Error("Reconnectez-vous à votre espace collaborateur.");
  const response = await fetch(ENDPOINT, {
    method:"POST",
    headers:{ "Content-Type":"application/json", apikey:PUBLISHABLE_KEY, ...(token ? { "X-Collaborator-Session":token } : {}) },
    body:JSON.stringify({ action, ...data }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && authenticated) localStorage.removeItem(SESSION_KEY);
    const error:any=new Error(result.error || `Service collaborateurs indisponible (${response.status}).`);error.status=response.status;throw error;
  }
  return result;
}

let offlineVault:OfflineStore|undefined;
async function offline(){
 const token=localStorage.getItem(SESSION_KEY);if(!token)throw Error('Reconnectez-vous au CRM.');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(localStorage.getItem(DEVICE_KEY)||token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(offlineVault?.owner===digest)return offlineVault;
 offlineVault=new OfflineStore(digest,async j=>{
   if(j.kind!=='save'||j.module!=='pochettes')throw Error('Cette action nécessite une connexion.');
   const input={...j.row.data,_crmId:j.base?j.row.id:undefined,_offlineBase:j.base,_offlineKey:j.row.id,_offlineMutation:j.id};
   await request('save',{module:'pochettes',data:input});
 });return offlineVault;
}

export function savedDevice() { return localStorage.getItem(DEVICE_KEY); }
export async function requestDevice(name:string, pin:string, label:string) {
  const result = await request("request_device", { name, pin, label }, false);
  localStorage.setItem(DEVICE_KEY, result.deviceToken);
  localStorage.setItem(NAME_KEY, result.name);
  return result as { deviceToken:string; requestCode:string; name:string };
}
export async function deviceStatus() {
  const deviceToken = savedDevice();
  if (!deviceToken) throw new Error("Cet appareil n’a pas encore été enregistré.");
  return await request("device_status", { deviceToken }, false) as { approved:boolean; name:string };
}
export async function login(pin:string) {
  const deviceToken = savedDevice();
  if (!deviceToken) throw new Error("Enregistrez d’abord cet appareil.");
  const result = await request("login", { deviceToken, pin }, false);
  localStorage.setItem(SESSION_KEY, result.sessionToken);
  localStorage.setItem(NAME_KEY, result.name);
  return result.name as string;
}
export async function activeName() {
  if (!localStorage.getItem(SESSION_KEY)) return null;
  const v=await offline();
  if(!navigator.onLine){const auth=await v.meta('auth');return auth&&auth.until>Date.now()?auth.name:null;}
  try {const result=await request("me");await v.meta('auth',{name:result.name,until:Date.now()+86400000});void v.flush();return result.name as string;}
  catch(e:any){if(e.status===401||e.status===403){await v.clear();localStorage.removeItem(SESSION_KEY);return null;}const auth=await v.meta('auth');return auth&&auth.until>Date.now()?auth.name:null;}
}
export async function readSharedCrm():Promise<SharedCrmData> {
 const v=await offline();if(!navigator.onLine){const auth=await v.meta('auth');if(!auth||auth.until<Date.now())throw Error('Reconnectez cet appareil pour renouveler son accès hors ligne.');}let data:SharedCrmData;
 try{if(!navigator.onLine)throw new TypeError('offline');await v.flush();data=await request('read');await v.meta('auth',{name:localStorage.getItem(NAME_KEY),until:Date.now()+86400000});for(const [module,rows]of Object.entries(data))if(Array.isArray(rows))await v.cache(module,rows);}
 catch(e:any){if(!(e instanceof TypeError)&&e.status)throw e;data={} as SharedCrmData;for(const module of ['planning','pochettes','devis','discussion','messages','conges','primes','commandes'])(data as any)[module]=await v.read(module);}
 data.pochettes=await v.read('pochettes') as CrmRecord[];return data;
}
export async function saveRecord(module:string, input:Record<string,any>, _prefix = module) {
  if(!navigator.onLine){
    if(module!=='pochettes')throw Error('Cette action nécessite une connexion. Les pochettes restent modifiables hors ligne.');
    const v=await offline();const rows=await v.read(module);const row=input._crmId?rows.find(r=>r.id===input._crmId):null;
    if(input._crmId&&(!row||!row.updated_at))throw Error('Rechargez cette fiche avec une connexion avant de la modifier hors ligne.');
    const id=row?.id||crypto.randomUUID();
    await v.enqueue(module,'save',{id,record_key:row?.record_key||'offline:'+id,module,data:{...row?.data,...input,kind:'entry',no:input.no,nPochette:input.no,designation:input.piece,statut:input.etat},updated_at:row?.updated_at},row?.updated_at);
    return input;
  }
  const v=await offline();if(await v.pending())await v.flush();if(await v.pending())throw Error("Réglez les modifications en attente avant un nouvel enregistrement en ligne.");
  await request("save", { module, data:input });
  return input;
}
export async function deleteRecord(module:string, input:Record<string,any>) { await request("delete", { module, data:input }); }
export async function signOut() {
  const v=await offline();if(await v.pending())throw Error("Synchronisez ou réglez les modifications en attente avant de vous déconnecter.");await v.clear();
  try { await stopDeviceNotifications(notificationsRequest); } catch {
    const registration = await navigator.serviceWorker?.getRegistration("/");
    const subscription = await registration?.pushManager?.getSubscription();
    await subscription?.unsubscribe();
    localStorage.removeItem("crm-push-enabled");
  }
  try { await request("logout"); } catch { /* A failed network sign-out still clears the local session. */ }
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(NAME_KEY);
}
export async function verifyPrincipalAdminCode(_pin:string) {
  return { success:false, error:"Gérez les accès depuis l’administration du CRM principal." };
}

export async function notificationsRequest(action:string, data:Record<string,unknown> = {}) {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) throw new Error("Reconnectez-vous au CRM.");
  const response = await fetch("https://vdmlixjrbudklieictfj.supabase.co/functions/v1/crm-notifications", {
    method:"POST", headers:{"Content-Type":"application/json",apikey:PUBLISHABLE_KEY,"X-Collaborator-Session":token},
    body:JSON.stringify({action,...data}),
  });
  const result = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(result.error || "Le service de notification est indisponible.");
  return result;
}

