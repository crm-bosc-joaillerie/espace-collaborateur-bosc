import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import {isDeviceOwner} from "./device-owner.mjs";

const url = Deno.env.get("SUPABASE_URL") || "";
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const publishable = Deno.env.get("SUPABASE_ANON_KEY") || "";
const db = createClient(url, secret, { auth: { persistSession: false } });
const auth = createClient(url, publishable, { auth: { persistSession: false } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-collaborator-session", "Access-Control-Allow-Methods": "POST,OPTIONS", "Content-Type": "application/json", "Cache-Control": "no-store" };
const text = (value: unknown) => String(value ?? "").trim();
const key = (value: unknown) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]+/g, "-").replace(/^-|-+$/g, "");
const comparable = (value: unknown) => key(value).replace(/-/g, "");
const bytes = (length = 32) => { const array = crypto.getRandomValues(new Uint8Array(length)); return Array.from(array, b => b.toString(16).padStart(2, "0")).join(""); };
async function hash(input: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)); return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join(""); }
async function pinHash(pin: string, salt: string) { const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]); const digest = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 310000, hash: "SHA-256" }, base, 256); return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join(""); }
function reply(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: cors }); }
function fail(message: string, status = 400): never { throw Object.assign(new Error(message), { status }); }
function requireResult<T>(result: { data: T; error: { message: string } | null }): T { if (result.error) fail("Erreur de stockage.", 500); return result.data; }
type Account = { id: string; display_name: string; name_key: string; is_active: boolean };
type Device = { id: string; collaborator_id: string; device_label: string; device_token_hash: string; pin_salt: string; pin_hash: string; approved_at: string | null; revoked_at: string | null; failed_attempts: number; locked_until: string | null; request_code: string; collaborator_accounts: Account };
type RecordRow = { id: string; module: string; record_key: string; data: Record<string, unknown> };

async function administrator(req: Request, ownerOnly = false) {
  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) fail("Session administrateur requise.", 401);
  const { data: userData, error } = await auth.auth.getUser(token);
  if (error || !userData.user) fail("Session administrateur invalide.", 401);
  const profile = requireResult(await db.from("profiles").select("role,is_active").eq("id", userData.user.id).maybeSingle());
  if (!profile?.is_active || !["owner", "admin"].includes(profile.role)) fail("Accès administrateur refusé.", 403);
  if(ownerOnly&&!isDeviceOwner({id:userData.user.id,role:profile.role}))fail('Seul Laurent peut autoriser ou révoquer un appareil.',403);
  return userData.user.id;
}
async function session(req: Request) {
  const token = req.headers.get("X-Collaborator-Session") || "";
  if (!/^[0-9a-f]{64}$/.test(token)) fail("Connexion collaborateur requise.", 401);
  const row = requireResult(await db.from("collaborator_sessions").select("device_id,expires_at,collaborator_devices(id,approved_at,revoked_at,collaborator_accounts(id,display_name,name_key,is_active))").eq("token_hash", await hash(token)).maybeSingle()) as any;
  const device = row?.collaborator_devices;
  const account = device?.collaborator_accounts as Account | undefined;
  if (!row || Date.parse(row.expires_at) < Date.now() || !device?.approved_at || device.revoked_at || !account?.is_active) fail("Session expirée ou appareil révoqué.", 401);
  return { account, deviceId: device.id };
}
async function allRows(module: string): Promise<RecordRow[]> {
  const result: RecordRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const rows = requireResult(await db.from("crm_records").select("id,module,record_key,data,updated_at").eq("workspace_key", "bosc").eq("module", module).order("created_at").range(offset, offset + 499)) as RecordRow[];
    result.push(...rows);
    if (rows.length < 500) return result;
  }
}
async function technicalActor() {
  const profile = requireResult(await db.from("profiles").select("id").eq("role", "owner").eq("is_active", true).limit(1).maybeSingle());
  if (!profile?.id) fail("Compte technique indisponible.", 500);
  return profile.id as string;
}
async function audit(account: Account, action: string, entityId: string) {
  requireResult(await db.from("audit_log").insert({ action, entity_type: "pochette_collaborateur", entity_id: entityId, details: { collaborateur_id: account.id, collaborateur: account.display_name } }));
}
function assigned(row: RecordRow, name: string) {
  const data = row.data || {};
  const raw = ["collaborateur", "collaborator", "employee", "employe", "employée", "nomCollaborateur", "collaborateurNom", "assignedTo", "assignee", "responsable"].map(k => data[k]).find(Boolean);
  return typeof raw === "string" && raw.split(/[;,|]/).some(value => comparable(value) === comparable(name));
}
function roomAllowed(config: Record<string, any>, room: string, name: string) {
  if (["general", "commun"].includes(comparable(room))) return true;
  const setting = Object.entries(config).find(([k]) => comparable(k) === comparable(room))?.[1];
  if (!setting) return false;
  const exception = Object.entries(setting.exceptions || {}).find(([k]) => comparable(k) === comparable(name));
  return exception ? Boolean(exception[1]) : Boolean(setting.visibleParDefaut);
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Méthode refusée." }, 405);
  try {
    const body = await req.json();
    const action = text(body.action);
    if (action === "accounts" || action === "account_add" || action === "account_toggle" || action === "devices" || action === "device_approve" || action === "device_revoke") {
      await administrator(req, ['device_approve','device_revoke'].includes(action));
      if (action === "accounts") return reply({ accounts: requireResult(await db.from("collaborator_accounts").select("id,display_name,name_key,is_active").order("display_name")) });
      if (action === "account_add") {
        const name = text(body.name);
        if (name.length < 2 || name.length > 80 || !key(name)) fail("Nom invalide.");
        const row = requireResult(await db.from("collaborator_accounts").insert({ display_name: name, name_key: key(name) }).select("id,display_name,name_key,is_active").single());
        return reply({ account: row });
      }
      if (action === "account_toggle") {
        const id = text(body.id);
        const row = requireResult(await db.from("collaborator_accounts").update({ is_active: Boolean(body.active) }).eq("id", id).select("id").maybeSingle());
        if (!row) fail("Collaborateur introuvable.", 404);
        return reply({ ok: true });
      }
      if (action === "devices") {
        const devices = requireResult(await db.from("collaborator_devices").select("id,collaborator_id,device_label,request_code,approved_at,revoked_at,created_at,last_used_at,collaborator_accounts(display_name)").order("created_at", { ascending: false }).limit(100));
        return reply({ devices });
      }
      if (action === "device_approve" || action === "device_revoke") {
        const id = text(body.id);
        const update = action === "device_approve" ? { approved_at: new Date().toISOString() } : { revoked_at: new Date().toISOString() };
        const row = requireResult(await db.from("collaborator_devices").update(update).eq("id", id).select("id").maybeSingle());
        if (!row) fail("Appareil introuvable.", 404);
        if (action === "device_revoke") requireResult(await db.from("collaborator_sessions").delete().eq("device_id", id));
        return reply({ ok: true });
      }
    }
    if (action === "request_device") {
      const name = key(body.name), pin = text(body.pin), label = text(body.label).slice(0, 100);
      if (!/^[0-9]{4}$/.test(pin) || !name || !label) fail("Nom, appareil et code à quatre chiffres requis.");
      const account = requireResult(await db.from("collaborator_accounts").select("id,display_name,name_key,is_active").eq("name_key", name).maybeSingle()) as Account | null;
      if (!account?.is_active) fail("Compte non disponible.", 403);
      const pending = requireResult(await db.from("collaborator_devices").select("id", { count: "exact" }).eq("collaborator_id", account.id).is("approved_at", null).is("revoked_at", null).limit(6));
      if (pending.length >= 5) fail("Trop de demandes en attente. Contactez l’administrateur.", 429);
      const deviceToken = bytes(), salt = bytes(16), requestCode = bytes(3).toUpperCase();
      requireResult(await db.from("collaborator_devices").insert({ collaborator_id: account.id, device_label: label, device_token_hash: await hash(deviceToken), pin_salt: salt, pin_hash: await pinHash(pin, salt), request_code: requestCode }));
      return reply({ deviceToken, requestCode, name: account.display_name });
    }
    if (action === "device_status" || action === "login") {
      const deviceToken = text(body.deviceToken);
      if (!/^[0-9a-f]{64}$/.test(deviceToken)) fail("Appareil inconnu.", 401);
      const device = requireResult(await db.from("collaborator_devices").select("id,collaborator_id,device_label,device_token_hash,pin_salt,pin_hash,approved_at,revoked_at,failed_attempts,locked_until,request_code,collaborator_accounts(id,display_name,name_key,is_active)").eq("device_token_hash", await hash(deviceToken)).maybeSingle()) as Device | null;
      if (!device || device.revoked_at || !device.collaborator_accounts?.is_active) fail("Appareil non autorisé.", 403);
      if (action === "device_status") return reply({ approved: Boolean(device.approved_at), name: device.collaborator_accounts.display_name, requestCode: device.request_code });
      if (!device.approved_at) fail("Demande en attente de validation.", 403);
      const reserved = requireResult(await db.rpc("reserve_collaborator_pin_attempt", { p_device_id: device.id }));
      if (!reserved) fail("Trop d’essais. Réessayez plus tard.", 429);
      const match = /^[0-9]{4}$/.test(text(body.pin)) && await pinHash(text(body.pin), device.pin_salt) === device.pin_hash;
      if (!match) fail("Code incorrect.", 401);
      requireResult(await db.from("collaborator_devices").update({ failed_attempts: 0, locked_until: null, last_used_at: new Date().toISOString() }).eq("id", device.id));
      const token = bytes();
      requireResult(await db.from("collaborator_sessions").insert({ token_hash: await hash(token), device_id: device.id, expires_at: new Date(Date.now() + 12 * 3600000).toISOString() }));
      return reply({ sessionToken: token, name: device.collaborator_accounts.display_name });
    }
    const { account, deviceId } = await session(req);
    if (action === "me") return reply({ name: account.display_name });
    if (action === "logout") { requireResult(await db.from("collaborator_sessions").delete().eq("token_hash", await hash(req.headers.get("X-Collaborator-Session") || ""))); return reply({ ok: true }); }
    if (action === "read") {
      const [planning, pochettes, devis, discussion, messages, commandes] = await Promise.all(["planning", "pochettes", "devis", "discussion", "messages", "commandes"].map(allRows));
      const ownPlanning = planning.filter(row => row.data?.kind === "entry" && assigned(row, account.display_name));
      const ownPochettes = pochettes.filter(row => row.data?.kind === "entry" && assigned(row, account.display_name));
      const ownIds = new Set(ownPochettes.flatMap(row => ["nPochette", "no", "interventionId"].map(k => text(row.data[k])).filter(Boolean)));
      const ownDescriptions = ownPochettes.map(row => ({ client: comparable(row.data.client || row.data.nom), piece: comparable(row.data.designation || row.data.piece) })).filter(pair => pair.client && pair.piece);
      const safeDevis = devis.filter(row =>
        ["id", "nPochette", "no", "interventionId"].some(k => ownIds.has(text(row.data[k]))) ||
        ownDescriptions.some(pair => pair.client === comparable(row.data.client) && pair.piece === comparable(row.data.designation))
      ).map(row => ({ ...row, data: Object.fromEntries(["id", "nPochette", "no", "interventionId", "client", "designation", "photoPochette"].filter(k => row.data[k] != null).map(k => [k, row.data[k]])) }));
      const config = (discussion.find(row => row.data?.kind === "config")?.data?.salonsConfig || {}) as Record<string, any>;
      const allowedConfig = Object.fromEntries(Object.keys(config).filter(room => roomAllowed(config, room, account.display_name)).map(room => [room, { visibleParDefaut: true, exceptions: {} }]));
      const permittedDiscussion = discussion.flatMap(row => {
        if (row.data?.kind === "config") return [{ ...row, data: { kind: "config", salonsConfig: allowedConfig } }];
        if (row.data?.kind === "room" && roomAllowed(config, text(row.data.nom), account.display_name)) return [row];
        if (row.data?.kind === "message" && roomAllowed(config, text(row.data.salle || "Général"), account.display_name)) return [row];
        return [];
      });
      const safeOrders = commandes.map(row => ({ ...row, data: {
        kind: row.data.kind, fournisseur: row.data.fournisseur, reference: row.data.reference || row.data.refCommande || row.data.refArticle,
        objet: row.data.objet || row.data.article, date: row.data.date || row.data.dateSaisie,
        etat: row.data.etat || row.data.statut,
      } }));
      return reply({ planning: ownPlanning, pochettes: ownPochettes, devis: safeDevis, discussion: permittedDiscussion, messages, conges: planning.filter(row => row.data?.kind === "conge" && assigned(row, account.display_name)), primes: [], commandes: safeOrders });
    }
    if (action === "save") {
      const module = text(body.module), input = body.data || {};
      if (typeof input !== "object" || Array.isArray(input)) fail("Données invalides.");
      const id = text(input._crmId);
      const mutation=text(input._offlineMutation), queueKey=text(input._offlineKey);
      if((mutation&&!/^[0-9a-f-]{36}$/i.test(mutation))||(queueKey&&!/^[0-9a-f-]{36}$/i.test(queueKey)))fail("Référence hors ligne invalide.");
      const checkVersion=(row:any)=>{if(mutation&&row.data?._offlineMutation===mutation)return true;if(mutation&&(!input._offlineBase||row.updated_at!==input._offlineBase))fail("Conflit : cette fiche a changé. Modification locale conservée.",409);return false;};
      if(!id&&queueKey&&module!=="pochettes"){
        const prior=requireResult(await db.from("crm_records").select("id,data").eq("workspace_key","bosc").eq("module",module).eq("record_key","offline:"+queueKey).maybeSingle());
        if(prior){const owner=prior.data?.auteur||prior.data?.enregistrePar||prior.data?.collaborateur;if(comparable(owner)===comparable(account.display_name)&&prior.data?._offlineMutation===mutation)return reply({ok:true});fail("Référence déjà enregistrée.",409);}
      }
      if (module === "pochettes") {
        const row = id ? requireResult(await db.from("crm_records").select("id,record_key,data,updated_at").eq("id", id).eq("module", "pochettes").eq("workspace_key", "bosc").maybeSingle()) : null;
        if (id && (!row || row.data?.kind !== "entry" || !assigned(row as RecordRow, account.display_name))) fail("Pochette non attribuée.", 403);
        if(row && text(input._offlineMutation) && row.data?._offlineMutation===input._offlineMutation)return reply({ok:true});
        if(row && input._offlineBase && row.updated_at!==input._offlineBase)fail("Conflit : la pochette a changé sur un autre appareil. Modification locale conservée.",409);
        if(text(input._offlineMutation)&&!/^[0-9a-f-]{36}$/i.test(text(input._offlineMutation)))fail("Modification hors ligne invalide.");
        const offlineKey=text(input._offlineKey);
        if(offlineKey && !/^[0-9a-f-]{36}$/i.test(offlineKey))fail("Référence hors ligne invalide.");
        if(!row && offlineKey){
          const prior=requireResult(await db.from("crm_records").select("id,data").eq("workspace_key","bosc").eq("module","pochettes").eq("record_key","offline:"+offlineKey).maybeSingle());
          if(prior){if(assigned(prior as RecordRow,account.display_name)&&prior.data?._offlineMutation===input._offlineMutation)return reply({ok:true});fail("Référence déjà enregistrée.",409);}
        }
        const status = text(input.etat);
        if (!["En attente", "En cours", "Fait"].includes(status)) fail("Statut invalide.");
        const note = text(input.note);
        if (note.length > 2000) fail("Note trop longue.");
        const no = text(input.no), client = text(input.client), piece = text(input.piece), livraison = text(input.livraison);
        if (!no || !client || no.length > 80 || client.length > 200 || piece.length > 500 || livraison.length > 100) fail("Pochette invalide.");
        const existing = await allRows("pochettes");
        const unchangedNumber = row && text(row.data.nPochette || row.data.no || row.data.interventionId) === no;
        if (!unchangedNumber && existing.some(other => other.id !== id && ["nPochette", "no", "interventionId"].some(field => text(other.data?.[field]) === no))) fail("Ce numéro de pochette existe déjà.", 409);
        if (!row) {
          const data = { kind: "entry", no, nPochette: no, interventionId: no, client, piece, designation: piece,
            livraison, dateLivraison: livraison, mois: "À planifier", semaine: "À définir", collaborateur: account.display_name,
            etat: status, statut: status, _offlineMutation:text(input._offlineMutation), note, noteAuteur: account.display_name, noteDate: new Date().toISOString() };
          const actor = await technicalActor();
          requireResult(await db.from("crm_records").insert({ workspace_key: "bosc", module, record_key: offlineKey ? "offline:"+offlineKey : `pochette:${crypto.randomUUID()}`, data, created_by: actor, updated_by: actor }));
        } else {
          const pickExisting = (keys: string[]) => keys.find(field => row.data[field] !== undefined) || keys[0];
          const data = { ...row.data, _offlineMutation:text(input._offlineMutation), etat: status, ...(row.data.statut !== undefined ? { statut: status } : {}), note, noteAuteur: account.display_name, noteDate: new Date().toISOString(),
            [pickExisting(["nPochette", "no"])]: no, [pickExisting(["client", "nomClient", "nom"])]: client,
            [pickExisting(["designation", "piece", "travail"])]: piece, [pickExisting(["livraison", "dateLivraison"])]: livraison };
          const updated = requireResult(await db.from("crm_records").update({ data, updated_by: await technicalActor() }).eq("id", id).eq("updated_at", row.updated_at).select("id").maybeSingle());
          if (!updated) fail("La pochette a changé. Rechargez la page.", 409);
        }
        await audit(account, "pochette_note_statut", id || "nouvelle");
        return reply({ ok: true });
      }
      if (module === "planning" && input.kind === "conge") {
        if (id) fail("Une demande de congés ne peut pas être modifiée ici.", 403);
        const debut = text(input.debut), fin = text(input.fin);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin) || fin < debut) fail("Dates de congés invalides.");
        const data = { _offlineMutation:mutation, kind: "conge", debut, fin, jours: text(input.jours).slice(0, 20), motif: text(input.motif).slice(0, 500), statut: "En attente", collaborateur: account.display_name };
        const actor = await technicalActor();
        requireResult(await db.from("crm_records").insert({ workspace_key: "bosc", module, record_key: queueKey?"offline:"+queueKey:`conge:${crypto.randomUUID()}`, data, created_by: actor, updated_by: actor }));
        return reply({ ok: true });
      }
      if (module === "messages") {
        if (id) {
          const row = requireResult(await db.from("crm_records").select("id,data,updated_at").eq("id", id).eq("module", module).eq("workspace_key", "bosc").maybeSingle());
          if (!row || row.data?.kind !== "message") fail("Message introuvable.", 404);
          if(checkVersion(row))return reply({ok:true});
          const result = requireResult(await db.from("crm_records").update({ data: { ...row.data, _offlineMutation:mutation, resolved: Boolean(input.resolved) }, updated_by: await technicalActor() }).eq("id", id).eq("updated_at", row.updated_at).select("id").maybeSingle());
          if (!result) fail("Le message a changé. Rechargez la page.", 409);
        } else {
          const message = text(input.message || input.text).slice(0, 2000);
          if (!message) fail("Message vide.");
          const data = { _offlineMutation:mutation, kind: "message", client: text(input.client).slice(0, 200), message, text: message, horodatage: new Date().toISOString(), resolved: false,
            deLaPartDe: text(input.deLaPartDe).slice(0, 200), pour: text(input.pour).slice(0, 80), societe: text(input.societe).slice(0, 200),
            service: text(input.service).slice(0, 100), tel: text(input.tel).slice(0, 80), email: text(input.email).slice(0, 200),
            date: text(input.date).slice(0, 80), heure: text(input.heure).slice(0, 80), contact: text(input.contact).slice(0, 200),
            rappellera: Boolean(input.rappellera), merciDeRappeler: Boolean(input.merciDeRappeler), urgent: Boolean(input.urgent),
            pourInfo: Boolean(input.pourInfo), enregistrePar: account.display_name };
          const actor = await technicalActor();
          requireResult(await db.from("crm_records").insert({ workspace_key: "bosc", module, record_key: queueKey?"offline:"+queueKey:`message:${crypto.randomUUID()}`, data, created_by: actor, updated_by: actor }));
        }
        return reply({ ok: true });
      }
      if (module === "discussion" && input.kind === "message") {
        const discussion = await allRows("discussion");
        const config = (discussion.find(row => row.data?.kind === "config")?.data?.salonsConfig || {}) as Record<string, any>;
        const room = text(input.salle || "Général");
        if (!roomAllowed(config, room, account.display_name)) fail("Salon non autorisé.", 403);
        const message = text(input.message).slice(0, 3000);
        if (!message) fail("Message vide.");
        if (id) {
          const row = discussion.find(row => row.id === id);
          if (!row || row.data?.kind !== "message" || comparable(row.data.auteur) !== comparable(account.display_name)) fail("Message non autorisé.", 403);
          if(checkVersion(row))return reply({ok:true});
          const updated=requireResult(await db.from("crm_records").update({ data: { ...row.data, _offlineMutation:mutation, message }, updated_by: await technicalActor() }).eq("id", id).eq("updated_at",row.updated_at).select("id").maybeSingle());if(!updated)fail("Le message a changé.",409);
        } else {
          const data = { _offlineMutation:mutation, kind: "message", salle: room, auteur: account.display_name, message, horodatage: new Date().toISOString(), _row: crypto.randomUUID() };
          const actor = await technicalActor();
          requireResult(await db.from("crm_records").insert({ workspace_key: "bosc", module, record_key: queueKey?"offline:"+queueKey:`discussion:${crypto.randomUUID()}`, data, created_by: actor, updated_by: actor }));
        }
        return reply({ ok: true });
      }
      fail("Cette modification nécessite une autorisation spécifique.", 403);
    }
    if (action === "delete" && body.module === "discussion") {
      const id = text(body.data?._crmId);
      const row = requireResult(await db.from("crm_records").select("id,data,updated_at").eq("id", id).eq("module", "discussion").eq("workspace_key", "bosc").maybeSingle());
      if (!row && body.data?._offlineMutation)return reply({ok:true});
      if (!row || row.data?.kind !== "message" || comparable(row.data.auteur) !== comparable(account.display_name)) fail("Message non autorisé.", 403);
      if(body.data?._offlineMutation&&row.updated_at!==body.data?._offlineBase)fail("Le message a changé. Suppression locale conservée.",409);
      const removed=requireResult(await db.from("crm_records").delete().eq("id", id).eq("updated_at",row.updated_at).select("id").maybeSingle());if(!removed)fail("Le message a changé.",409);
      return reply({ ok: true });
    }
    fail("Action inconnue.", 404);
  } catch (error) {
    const err = error as Error & { status?: number };
    return reply({ error: err.status && err.status < 500 ? err.message : "Erreur du service collaborateurs." }, err.status || 500);
  }
});
