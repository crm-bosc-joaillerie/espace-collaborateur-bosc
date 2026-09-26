import { supabase } from "./supabase";

export type CrmRecord = {
  id: string;
  record_key: string;
  module: string;
  data: Record<string, any>;
};

export type SharedCrmData = {
  planning: CrmRecord[];
  pochettes: CrmRecord[];
  devis: CrmRecord[];
  discussion: CrmRecord[];
  messages: CrmRecord[];
  conges: CrmRecord[];
  primes: CrmRecord[];
  commandes: CrmRecord[];
};

export function recordData(row: CrmRecord): Record<string, any> {
  return { ...(row.data || {}), _crmId: row.id, record_key: row.record_key };
}

export async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Session CRM invalide. Reconnectez-vous.");
  return data.user;
}

export async function getStaffProfile() {
  const user = await currentUser();
  if (!user) return null;
  const { data, error } = await supabase.from("profiles")
    .select("id,full_name,role,is_active").eq("id", user.id).maybeSingle();
  if (error) throw new Error("Impossible de vérifier les droits du collaborateur.");
  if (!data?.is_active) return null;
  return data as { id:string; full_name:string; role:"owner"|"admin"|"collaborator"; is_active:boolean };
}

export async function verifyPrincipalAdminCode(_pin: string) {
  const profile = await getStaffProfile();
  return { success: profile?.role === "owner" || profile?.role === "admin",
    error: "Accès réservé à un administrateur du CRM collaborateurs." };
}

export async function readModule(module: string) {
  const { data, error } = await supabase
    .from("crm_records")
    .select("id,record_key,module,data")
    .eq("module", module)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as CrmRecord[];
}

async function readOptionalModule(module: string) {
  try {
    return await readModule(module);
  } catch {
    return [] as CrmRecord[];
  }
}

export async function readSharedCrm(): Promise<SharedCrmData> {
  const [planning, pochettes, devis, discussion, messages, primes, commandes] = await Promise.all([
    readModule("planning"),
    readModule("pochettes"),
    readOptionalModule("devis"),
    readModule("discussion"),
    readModule("messages"),
    readModule("primes"),
    readModule("commandes"),
  ]);
  return {
    planning,
    pochettes,
    devis,
    discussion,
    messages,
    conges: planning.filter((row) => row.data?.kind === "conge"),
    primes,
    commandes,
  };
}

function matchRecord(rows: CrmRecord[], input: Record<string, any>) {
  if (input._crmId) return rows.find((row) => String(row.id) === String(input._crmId));
  const keys = ["record_key", "_row", "horodatage", "interventionId", "id"];
  return rows.find((row) => keys.some((key) => input[key] != null && (
    String(row.record_key) === String(input[key]) || String(row.data?.[key]) === String(input[key])
  )));
}

function newRecordKey(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${uuid}`;
}

export async function saveRecord(module: string, input: Record<string, any>, prefix = module) {
  const rows = await readModule(module);
  const existing = matchRecord(rows, input);
  const user = await currentUser();
  const payload = { ...input };
  delete payload._crmId;
  const recordKey = String(existing?.record_key || payload.record_key || newRecordKey(prefix));
  delete payload.record_key;
  const result = existing
    ? await supabase.from("crm_records").update({ data: payload, updated_by: user.id }).eq("id", existing.id)
    : await supabase.from("crm_records").insert({
      assigned_user_id: module === "discussion" ? null : user.id,
      module,
      record_key: recordKey,
      data: payload,
      created_by: user.id,
      updated_by: user.id,
    });
  if (result.error) throw new Error(result.error.message);
  return { ...payload, _crmId: existing?.id, record_key: recordKey };
}

export async function deleteRecord(module: string, input: Record<string, any>) {
  const rows = await readModule(module);
  const existing = matchRecord(rows, input);
  if (!existing) return;
  const { error } = await supabase.from("crm_records").delete().eq("id", existing.id);
  if (error) throw new Error(error.message);
}

export async function sendOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false },
  });
  if (error) throw new Error(error.message);
}

export async function verifyOtp(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  await supabase.auth.signOut({ scope: "local" });
}
