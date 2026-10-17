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
    body:JSON.stringify({ action, ...data }), signal:AbortSignal.timeout(60000),
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
   if(!['save','delete'].includes(j.kind))throw Error('Opération inconnue.');
   const input={...j.row.data,_crmId:j.base?j.row.id:undefined,_offlineBase:j.base,_offlineKey:j.row.id,_offlineMutation:j.id};
   await request(j.kind==='delete'?'delete':'save',{module:j.module,data:input});
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
  catch(e:any){if(e.status===401||e.status===403){await v.meta('auth',{until:0});localStorage.removeItem(SESSION_KEY);return null;}const auth=await v.meta('auth');return auth&&auth.until>Date.now()?auth.name:null;}
}
export async function readSharedCrm():Promise<SharedCrmData> {
 const v=await offline();if(!navigator.onLine){const auth=await v.meta('auth');if(!auth||auth.until<Date.now())throw Error('Reconnectez cet appareil pour renouveler son accès hors ligne.');}let data:SharedCrmData;
 try{if(!navigator.onLine)throw new TypeError('offline');await v.flush();data=await request('read');await v.meta('auth',{name:localStorage.getItem(NAME_KEY),until:Date.now()+86400000});for(const [module,rows]of Object.entries(data))if(Array.isArray(rows))await v.cache(module,rows);}
 catch(e:any){if(!(e instanceof TypeError)&&e.status)throw e;data={} as SharedCrmData;for(const module of ['planning','pochettes','devis','discussion','messages','conges','primes','commandes'])(data as any)[module]=await v.read(module);}
 for(const module of ['planning','pochettes','discussion','messages','conges']) (data as any)[module]=await v.read(module);data.conges=[...data.conges,...data.planning.filter(r=>r.data.kind==='conge'&&!data.conges.some(c=>c.id===r.id))];return data;
}
async function queueWrite(module:string,input:Record<string,any>,kind:'save'|'delete'){
 const v=await offline();const auth=await v.meta('auth');if(!auth||auth.until<Date.now())throw Error('Reconnectez cet appareil pour renouveler son accès.');
 if(!['pochettes','messages','discussion','planning'].includes(module)||(module==='planning'&&input.kind!=='conge')||(module==='discussion'&&input.kind!=='message'))throw Error('Cette opération nécessite une connexion.');
 let rows:CrmRecord[]=[];try{rows=await v.read(module) as CrmRecord[]}catch{}const row=input._crmId?rows.find(r=>r.id===input._crmId):null;
 if(input._crmId&&(!row||(!row.updated_at&&!row.record_key.startsWith('offline:'))))throw Error('Ouvrez cette fiche avec une connexion avant de la modifier hors ligne.');
 const id=row?.id||crypto.randomUUID();const name=localStorage.getItem(NAME_KEY)||'';
 const data={...row?.data,...input,...(module==='pochettes'?{kind:'entry',no:input.no,nPochette:input.no,designation:input.piece,statut:input.etat}:{kind:input.kind||'message'}),...(module==='discussion'?{auteur:name,horodatage:row?.data.horodatage||new Date().toISOString()}:{}),...(module==='planning'?{collaborateur:name,statut:'En attente'}:{}),...(module==='messages'?{enregistrePar:name}: {})};
 await v.enqueue(module,kind,{id,record_key:row?.record_key||'offline:'+id,module,data,updated_at:row?.updated_at},row?.updated_at);
 if(navigator.onLine)await v.flush(true);return input;
}
export async function saveRecord(module:string,input:Record<string,any>,_prefix=module){return queueWrite(module,input,'save')}
export async function deleteRecord(module:string,input:Record<string,any>){if(module!=='discussion')throw Error('Suppression non autorisée.');return queueWrite(module,{...input,kind:'message'},'delete')}
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

