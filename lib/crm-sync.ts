const ENDPOINT = "https://vdmlixjrbudklieictfj.supabase.co/functions/v1/collaborator-gateway";
const PUBLISHABLE_KEY = "sb_publishable_5DSJ2xzo2pokkFbkB0FTRg_7T4DDwKg";
const DEVICE_KEY = "bosc-collaborateur-appareil";
const SESSION_KEY = "bosc-collaborateur-session";
const NAME_KEY = "bosc-collaborateurs-name";

export type CrmRecord = { id:string; record_key:string; module:string; data:Record<string,any> };
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
    throw new Error(result.error || `Service collaborateurs indisponible (${response.status}).`);
  }
  return result;
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
  try { const result = await request("me"); return result.name as string; }
  catch { localStorage.removeItem(SESSION_KEY); return null; }
}
export async function readSharedCrm():Promise<SharedCrmData> { return await request("read") as SharedCrmData; }
export async function saveRecord(module:string, input:Record<string,any>, _prefix = module) {
  await request("save", { module, data:input });
  return input;
}
export async function deleteRecord(module:string, input:Record<string,any>) { await request("delete", { module, data:input }); }
export async function signOut() {
  try { await request("logout"); } catch { /* A failed network sign-out still clears the local session. */ }
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(NAME_KEY);
}
export async function verifyPrincipalAdminCode(_pin:string) {
  return { success:false, error:"Gérez les accès depuis l’administration du CRM principal." };
}
