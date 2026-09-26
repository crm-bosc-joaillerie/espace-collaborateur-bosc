"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CalendarRange, ChevronRight, CircleDollarSign, ClipboardList, Download, ExternalLink, KeyRound, LockKeyhole, LogOut, Menu, MessageCircle, ShoppingBag, Plus, Search, Send, ShieldCheck, Sparkles, UserRound, UsersRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteRecord, readSharedCrm, recordData, saveRecord, sendOtp, signOut, verifyOtp, verifyPrincipalAdminCode, type CrmRecord, type SharedCrmData } from "@/lib/crm-sync";
import { supabase } from "@/lib/supabase";

type View = "accueil" | "discussion" | "messages" | "planning" | "pochettes" | "conges" | "commandes" | "primes" | "admin";
type ClientMessage = { id:string; client:string; text:string; createdAt:string; resolved:boolean; deLaPartDe?:string; pour?:string; societe?:string; service?:string; tel?:string; email?:string; date?:string; heure?:string; enregistrePar?:string; rappellera?:boolean; merciDeRappeler?:boolean; urgent?:boolean; pourInfo?:boolean; contact?:string; _crmId?:string; record_key?:string };
type PlanningRow = { id:string; heure:string; date:string; dateKey:string; monthKey:string; monthLabel:string; weekKey:string; weekLabel:string; pochette:string; type:string; client:string; piece:string; duree:string; statut:string; _crmId?:string; record_key?:string };
type PochettesRow = { no:string; client:string; piece:string; livraison:string; duree:string; etat:string; dateKey:string; monthKey:string; monthLabel:string; weekKey:string; weekLabel:string; data?:Record<string,any>; _crmId?:string; record_key?:string };
type LeaveRow = { id:string; debut:string; fin:string; jours:string; statut:string; motif:string; _crmId?:string; record_key?:string };
type SupplierOrder = { id:string; fournisseur:string; reference:string; objet:string; date:string; etat:string; _crmId?:string; record_key?:string };
type DiscussionRoomOption = { key:string; name:string; label:string };
type DiscussionRoomAccess = { visibleParDefaut:boolean; exceptions:Record<string,boolean> };
type DiscussionAccessConfig = Record<string,DiscussionRoomAccess>;
type AccessLocks = Partial<Record<View, boolean>>;
type GateState = { type:"admin" } | { type:"module"; module:View };

const ACCESS_LOCKS_KEY = "bosc-collaborateurs-access-locks";
const CLIENT_MESSAGES_KEY = "bosc-collaborateurs-client-messages";
const MAIN_CRM_URL = "https://crm-vite-pied.vercel.app/";
const DEFAULT_LOCKS:AccessLocks = {};
const accessOptions:{id:View;label:string;description:string}[] = [
  {id:"messages",label:"Messages clients",description:"Accès aux messages reçus et à leur suivi."},
  {id:"planning",label:"Planning atelier",description:"Consultation du planning de l’atelier."},
  {id:"pochettes",label:"Suivi des pochettes",description:"Consultation des pochettes et travaux."},
  {id:"conges",label:"Congés",description:"Consultation des demandes de congés."},
  {id:"commandes",label:"Commandes fournisseurs",description:"Consultation des commandes."},
  {id:"primes",label:"Primes",description:"Accès au module primes."},
];

const nav = [
  { id:"accueil", label:"Mon espace", icon:Sparkles },
  { id:"discussion", label:"Discussion", icon:MessageCircle },
  { id:"messages", label:"Messages clients", icon:Send },
  { id:"planning", label:"Planning atelier", icon:CalendarRange },
  { id:"pochettes", label:"Suivi pochettes", icon:ClipboardList },
  { id:"conges", label:"Mes congés", icon:CalendarDays },
  { id:"commandes", label:"Commandes fournisseurs", icon:ShoppingBag },
  { id:"primes", label:"Primes", icon:CircleDollarSign, future:true },
  { id:"admin", label:"Administration", icon:ShieldCheck },
] as const;

const planning = [
  { heure:"08:30", pochette:"4821", type:"FAB", client:"Client démonstration A", piece:"Bague sur mesure", duree:"3 h", statut:"En cours" },
  { heure:"13:30", pochette:"4828", type:"REP", client:"Client démonstration B", piece:"Mise à taille", duree:"1 h 30", statut:"À commencer" },
  { heure:"15:30", pochette:"4834", type:"SAV", client:"Client démonstration C", piece:"Contrôle sertissage", duree:"45 min", statut:"À commencer" },
];
const pochettes = [
  { no:"4821", client:"Client démonstration A", piece:"Bague sur mesure", livraison:"18 sept.", etat:"En fabrication" },
  { no:"4828", client:"Client démonstration B", piece:"Mise à taille", livraison:"16 sept.", etat:"Urgent" },
  { no:"4834", client:"Client démonstration C", piece:"Contrôle sertissage", livraison:"20 sept.", etat:"À faire" },
  { no:"4816", client:"Client démonstration D", piece:"Pendentif", livraison:"22 sept.", etat:"En attente" },
];
const commandes = [
  { fournisseur:"Fournisseur démonstration A", reference:"CMD-1042", objet:"Apprêts or 18 k", date:"12 sept. 2026", etat:"Commandée" },
  { fournisseur:"Fournisseur démonstration B", reference:"CMD-1048", objet:"Pierres calibrées", date:"14 sept. 2026", etat:"À commander" },
];
const discussionsInitiales = [
  { auteur:"Laurent", heure:"08:42", texte:"Le point atelier est décalé à 11 h.", moi:false },
  { auteur:"Équipe", heure:"09:05", texte:"La commande d’apprêts est bien partie.", moi:false },
];

// Valeurs identiques au menu Statut du CRM principal.
const POCHETTE_STATUS_OPTIONS = ["En attente", "En cours", "Fait"] as const;

function tone(status:string) {
  if (/urgent|retard/i.test(status)) return "bg-red-50 text-red-700 border-red-200";
  if (/termin|valid|commandée/i.test(status)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (/cours/i.test(status)) return "bg-[#C3C7D6]/40 text-[#303851] border-[#D9DCE5]";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

const WEEK_COLOR_CLASSES = [
  "border-[#19213D]/30 bg-[#19213D]/10 text-[#19213D]",
  "border-[#303851]/35 bg-[#303851]/10 text-[#303851]",
  "border-[#57617E]/35 bg-[#57617E]/10 text-[#57617E]",
  "border-[#57617E]/25 bg-[#C3C7D6]/45 text-[#303851]",
  "border-[#19213D]/20 bg-[#C3C7D6]/25 text-[#19213D]",
  "border-[#303851]/25 bg-[#57617E]/20 text-[#303851]",
];

// Pastel row/card fills used when a month is selected without a specific week.
// The colors are assigned in the order the visible weeks appear, so every
// week in the selected month is easy to distinguish at a glance.
const WEEK_ROW_COLOR_CLASSES = [
  "bg-[#DDF3E4] hover:bg-[#D2EEDB]",
  "bg-[#DCE7FA] hover:bg-[#D2E1F5]",
  "bg-[#E9E1F8] hover:bg-[#E1D7F2]",
  "bg-[#F8E8D7] hover:bg-[#F2DDC7]",
  "bg-[#DDEFF0] hover:bg-[#D3E7E8]",
];

function weekColorMap(keys:string[]) {
  const visibleWeeks = Array.from(new Set(keys.filter(Boolean)));
  return new Map(visibleWeeks.map((key, index) => [key, WEEK_ROW_COLOR_CLASSES[index % WEEK_ROW_COLOR_CLASSES.length]]));
}

function weekColorClass(weekKey:string) {
  const weekNumber = Number(weekKey.match(/S(\d{1,2})/)?.[1] || 0);
  return WEEK_COLOR_CLASSES[weekNumber ? weekNumber % WEEK_COLOR_CLASSES.length : 0];
}

function pick(data:Record<string, any>, ...keys:string[]) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== "") return String(data[key]);
  }
  return "";
}

function durationLabel(totalMinutes:number) {
  if (!Number.isFinite(totalMinutes)) return "";
  const rounded = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return `${hours} h ${String(minutes).padStart(2, "0")} min`;
}

/** Match the CRM principal: duration values are decimal hours (0.5 = 30 min). */
function formatDuration(value:any) {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const normalized = raw.toLocaleLowerCase("fr").replace(/\s+/g, " ").trim();
  const decimal = normalized.replace(",", ".");
  if (/^\d+(?:\.\d+)?$/.test(decimal)) return durationLabel(Number(decimal) * 60) || raw;
  const clock = normalized.match(/^(\d+)\s*:\s*(\d{1,2})$/);
  if (clock) return durationLabel(Number(clock[1]) * 60 + Number(clock[2])) || raw;
  const minutesOnly = normalized.match(/^(\d+(?:[.,]\d+)?)\s*(?:m|min|minute|minutes)$/);
  if (minutesOnly) return durationLabel(Number(minutesOnly[1].replace(",", "."))) || raw;
  const hoursAndMinutes = normalized.match(/^(\d+(?:[.,]\d+)?)\s*(?:h|heure|heures)(?:\s*(\d{1,2})\s*(?:m|min|minute|minutes))?$/);
  if (hoursAndMinutes) {
    const hours = Number(hoursAndMinutes[1].replace(",", "."));
    const minutes = hoursAndMinutes[2] ? Number(hoursAndMinutes[2]) : 0;
    return durationLabel(hours * 60 + minutes) || raw;
  }
  return raw;
}

function comparable(value:any) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

// Les enregistrements du CRM principal portent le nom du collaborateur dans
// le champ « collaborateur ». On accepte aussi les variantes déjà utilisées
// par les anciennes fiches afin que chaque espace personnel reste compatible.
const COLLABORATOR_KEYS = [
  "collaborateur", "collaborator", "employee", "employe", "employée",
  "nomCollaborateur", "collaborateurNom", "assignedTo", "assignee", "responsable",
];

function recordMatchesCollaborator(row:CrmRecord, collaborator:string) {
  const expected = comparable(collaborator);
  if (!expected) return false;
  const assigned = pick(row.data || {}, ...COLLABORATOR_KEYS);
  if (!assigned) return false;
  return assigned
    .split(/[;,|]/)
    .map(value => comparable(value))
    .filter(Boolean)
    .includes(expected);
}

function onlyCollaboratorRows(rows:CrmRecord[], collaborator:string) {
  return rows.filter(row => recordMatchesCollaborator(row, collaborator));
}

// Chaque espace collaborateur peut être ouvert avec une URL personnelle,
// par exemple ?collaborateur=laurent. Le paramètre est dérivé du nom affiché
// dans le CRM principal afin qu'un nouveau collaborateur soit compatible sans
// modifier le code de l'application.
function collaboratorSlug(value:any) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function collaboratorNameFromUrl() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("collaborateur") || params.get("collaborator") || "";
  if (!slug) return "";
  const normalizedSlug = collaboratorSlug(slug);
  return normalizedSlug.split("-").filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function parsePlanningDate(value:any): Date | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const french = text.match(/^(\d{1,2})[\\/. -](\d{1,2})[\\/. -](\d{4})/);
  if (french) {
    const date = new Date(Date.UTC(Number(french[3]), Number(french[2]) - 1, Number(french[1]), 12));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isoWeekInfo(date:Date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
  const year = target.getUTCFullYear();
  return { key:`${year}-S${String(week).padStart(2, "0")}`, label:`S${String(week).padStart(2, "0")} · ${year}` };
}

function planningDateFromData(data:Record<string, any>) {
  const dateKeys = ["date", "jour", "datePlanning", "dateIntervention", "datePrevue", "datePrévue", "dateLivraison", "echeance", "échéance", "startDate", "dateDebut", "du"];
  for (const key of dateKeys) {
    const value = data[key];
    const parsed = parsePlanningDate(value);
    if (parsed) return { raw:String(value), date:parsed };
  }
  for (const value of Object.values(data)) {
    if (typeof value !== "string") continue;
    const parsed = parsePlanningDate(value);
    if (parsed && /\d{4}|\d{1,2}[\\/. -]\d{1,2}[\\/. -]\d{4}/.test(value)) return { raw:value, date:parsed };
  }
  return { raw:"", date:null };
}

function planningMonthInfo(data:Record<string, any>, date:Date | null) {
  const value = pick(data, "mois", "month");
  const match = value.match(/(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})/i);
  if (match) {
    const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    const monthName = match[1].toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const month = monthNames.findIndex(name => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === monthName) + 1;
    if (month > 0) return { key:`${match[2]}-${String(month).padStart(2, "0")}`, label:`${monthNames[month - 1]} ${match[2]}` };
  }
  if (date) return { key:`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`, label:new Intl.DateTimeFormat("fr-FR", { month:"long", year:"numeric", timeZone:"UTC" }).format(date) };
  return { key:"", label:"" };
}

function planningWeekInfo(data:Record<string, any>, date:Date | null) {
  const value = pick(data, "semaine", "week", "numeroSemaine", "numSemaine");
  const match = value.match(/(?:semaine|week|s)?\s*0?(\d{1,2})/i);
  if (match) {
    const year = value.match(/\b(20\d{2})\b/)?.[1] || (date ? String(date.getUTCFullYear()) : "");
    if (year) return { key:`${year}-S${String(Number(match[1])).padStart(2, "0")}`, label:`S${String(Number(match[1])).padStart(2, "0")} · ${year}` };
  }
  return date ? isoWeekInfo(date) : { key:"", label:"" };
}

function normalizePlanning(rows:CrmRecord[]):PlanningRow[] {
  return rows.filter(row => row.data?.kind === "entry").map(row => {
    const d = recordData(row);
    const planningDate = planningDateFromData(d);
    const date = planningDate.date;
    const month = planningMonthInfo(d, date);
    const week = planningWeekInfo(d, date);
    return {
      id: row.id,
      date: planningDate.raw || "—",
      dateKey: date ? date.toISOString().slice(0, 10) : "",
      monthKey: month.key,
      monthLabel: month.label,
      weekKey: week.key,
      weekLabel: week.label,
      heure: pick(d, "heure", "start", "debut", "horaire") || "—",
      pochette: pick(d, "nPochette", "numeroPochette", "pochette", "no", "interventionId") || "—",
      type: pick(d, "type", "categorie", "service") || "—",
      client: pick(d, "client", "nomClient", "nom") || "Client non renseigné",
      piece: pick(d, "designation", "désignation", "piece", "travail", "description", "objet") || "—",
      duree: formatDuration(pick(d, "duree", "durée", "temps", "duration")),
      statut: pick(d, "statut", "etat", "état") || "À traiter",
      _crmId: row.id,
      record_key: row.record_key,
    };
  });
}

function findDevisPhoto(pochette:Record<string, any>, devisRows:CrmRecord[]) {
  const identifierKeys = ["id", "devisId", "nDevis", "nPochette", "pochette", "no", "numero", "numeroPochette", "interventionId"];
  const clientKeys = ["client", "nomClient", "nom", "societe", "société"];
  const designationKeys = ["designation", "désignation", "piece", "travail", "description", "objet"];
  const pochetteIdentifiers = identifierKeys.map((key) => comparable(pochette[key])).filter(Boolean);
  const client = comparable(pick(pochette, ...clientKeys));
  const designation = comparable(pick(pochette, ...designationKeys));
  let best: { photo:string; score:number } | null = null;

  for (const row of devisRows) {
    const data = recordData(row);
    const photo = pick(data, "photoPochette", "photo", "photoUrl", "photoURL", "image", "imageUrl", "imageURL");
    if (!photo) continue;
    const devisIdentifiers = identifierKeys.map((key) => comparable(data[key])).filter(Boolean);
    let score = 0;
    if (pochetteIdentifiers.some((value) => devisIdentifiers.includes(value))) score += 100;
    if (client && client === comparable(pick(data, ...clientKeys))) score += 20;
    if (designation && designation === comparable(pick(data, ...designationKeys))) score += 10;
    if (score > (best?.score ?? 0)) best = { photo, score };
  }
  return best?.photo || "";
}

function normalizePochettes(rows:CrmRecord[], devisRows:CrmRecord[] = []):PochettesRow[] {
  return rows.filter(row => row.data?.kind === "entry").map(row => {
    const d = recordData(row);
    const photo = pick(d, "photoPochette", "photo", "photoUrl", "photoURL", "image", "imageUrl", "imageURL") || findDevisPhoto(d, devisRows);
    const deliveryDate = planningDateFromData(d);
    const month = planningMonthInfo(d, deliveryDate.date);
    const week = planningWeekInfo(d, deliveryDate.date);
    return {
      no: pick(d, "nPochette", "no", "numero", "pochette", "numeroPochette", "interventionId") || "—",
      client: pick(d, "client", "nomClient", "nom") || "Client non renseigné",
      piece: pick(d, "designation", "désignation", "piece", "travail", "description", "objet") || "—",
      livraison: pick(d, "livraison", "dateLivraison", "datePrevue", "echeance") || "—",
      duree: formatDuration(pick(d, "duree", "durée", "temps", "duration")),
      etat: pick(d, "etat", "état", "statut") || "À traiter",
      dateKey: deliveryDate.date ? deliveryDate.date.toISOString().slice(0, 10) : "",
      monthKey: month.key,
      monthLabel: month.label,
      weekKey: week.key,
      weekLabel: week.label,
      data: photo ? { ...d, photoPochette: photo } : d,
      _crmId: row.id,
      record_key: row.record_key,
    };
  });
}

function normalizeMessages(rows:CrmRecord[]):ClientMessage[] {
  return rows.filter(row => row.data?.kind === "message").map(row => {
    const d = recordData(row);
    return {
      id: row.id,
      client: pick(d, "client", "deLaPartDe", "pour", "societe", "société") || "Client non renseigné",
      text: pick(d, "text", "message", "texte") || "—",
      createdAt: pick(d, "createdAt", "date", "horodatage") || "—",
      resolved: Boolean(d.resolved || d.traite || d.traité),
      deLaPartDe: pick(d, "deLaPartDe", "auteur"), pour: pick(d, "pour"), societe: pick(d, "societe", "société"), service: pick(d, "service"), tel: pick(d, "tel", "telephone", "téléphone"), email: pick(d, "email"), date: pick(d, "date"), heure: pick(d, "heure"), enregistrePar: pick(d, "enregistrePar", "enregistréPar"), rappellera: Boolean(d.rappellera), merciDeRappeler: Boolean(d.merciDeRappeler), urgent: Boolean(d.urgent), pourInfo: Boolean(d.pourInfo), contact: pick(d, "contact"),
      _crmId: row.id,
      record_key: row.record_key,
    };
  });
}

function discussionRoomKey(value:string) {
  const normalized = comparable(value);
  return normalized === "commun" || normalized === "general" ? "commun" : (normalized || "commun");
}

function discussionRoomLabel(value:string) {
  const key = discussionRoomKey(value);
  if (key === "commun") return "Général";
  return value.trim().replace(/^./, char => char.toUpperCase());
}

function discussionRooms(rows:CrmRecord[]):DiscussionRoomOption[] {
  const names = rows.flatMap(row => {
    if (row.data?.kind === "room") return [pick(row.data, "nom", "name", "salle")];
    if (row.data?.kind === "message") return [pick(row.data, "salle", "room")];
    return [];
  }).filter(Boolean);
  if (names.length === 0) names.push("Général");
  const result = new Map<string,DiscussionRoomOption>();
  for (const name of names) {
    const key = discussionRoomKey(name);
    if (!result.has(key)) result.set(key, { key, name, label:discussionRoomLabel(name) });
  }
  return [...result.values()].sort((a,b) => a.label.localeCompare(b.label, "fr"));
}

function discussionCollaborators(rows:CrmRecord[]):string[] {
  const names = rows.filter(row => row.data?.kind === "employee").map(row => pick(row.data, "nom", "name", "prenom", "prénom"));
  for (const row of rows.filter(item => item.data?.kind === "message")) {
    const author = pick(row.data, "auteur", "author");
    if (author) names.push(author);
  }
  return [...new Map(names.filter(Boolean).map(name => [comparable(name), name.trim()])).values()].sort((a,b) => a.localeCompare(b, "fr"));
}

function discussionAccessConfig(rows:CrmRecord[]) {
  const row = rows.find(item => item.data?.kind === "config" && item.data?.salonsConfig && typeof item.data.salonsConfig === "object");
  const raw = row?.data?.salonsConfig as Record<string, any> | undefined;
  const config:DiscussionAccessConfig = {};
  for (const [key,value] of Object.entries(raw || {})) {
    config[discussionRoomKey(key)] = {
      visibleParDefaut: Boolean(value?.visibleParDefaut),
      exceptions: value?.exceptions && typeof value.exceptions === "object" ? Object.fromEntries(Object.entries(value.exceptions).map(([name,allowed]) => [comparable(name), Boolean(allowed)])) : {},
    };
  }
  return { row, config };
}

function discussionRoomAllowed(config:DiscussionAccessConfig, room:DiscussionRoomOption, collaborator:string) {
  if (room.key === "commun") return true;
  const roomConfig = config[room.key];
  if (!roomConfig) return false;
  const personKey = comparable(collaborator);
  if (Object.prototype.hasOwnProperty.call(roomConfig.exceptions, personKey)) return roomConfig.exceptions[personKey];
  return roomConfig.visibleParDefaut;
}

function normalizeOrders(rows:CrmRecord[]):SupplierOrder[] {
  return rows.filter(row => row.data?.kind !== "config").map(row => {
    const d = recordData(row);
    return { id: row.id, fournisseur: pick(d, "fournisseur", "supplier") || "Fournisseur non renseigné", reference: pick(d, "reference", "référence", "ref") || "—", objet: pick(d, "objet", "commande", "article", "description") || "—", date: pick(d, "date", "dateCommande", "createdAt") || "—", etat: pick(d, "etat", "état", "statut") || "À commander", _crmId: row.id, record_key: row.record_key };
  });
}

function normalizeLeaves(rows:CrmRecord[]):LeaveRow[] {
  return rows.map(row => {
    const d = recordData(row);
    return {
      id: row.id,
      debut: pick(d, "debut", "dateDebut", "du", "date") || "—",
      fin: pick(d, "fin", "dateFin", "au") || "—",
      jours: pick(d, "jours", "nombreJours", "duree") || "—",
      statut: pick(d, "statut", "etat", "état") || "En attente",
      motif: pick(d, "motif", "commentaire", "note") || "",
      _crmId: row.id,
      record_key: row.record_key,
    };
  });
}

function Brand({light=false}:{light?:boolean}) { return <div className="relative flex items-center gap-3">
  <div className={`size-10 rounded-full border grid place-items-center font-serif text-xl ${light?"border-[#C3C7D6] text-[#C3C7D6]":"border-[#303851] text-[#19213D]"}`}>B</div>
  <div><div className={`font-serif text-lg tracking-wide ${light?"text-white":"text-[#20253A]"}`}>MAISON BOSC</div><div className={`text-[10px] tracking-[.22em] ${light?"text-white/40":"text-[#57617E]"}`}>JOAILLERIE</div></div>
  </div> }

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function InstallAppButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone) {
      setInstalled(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !installEvent) return null;
  return <Button type="button" onClick={async () => {
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }} className="h-11 w-full bg-[#303851] hover:bg-[#19213D] text-white rounded-xl">
    <Download className="size-4" /> Installer CRM Bosc
  </Button>;
}

function Login({ onEnter }:{ onEnter:(name:string)=>void }) {
  const [email,setEmail]=useState(""); const [otp,setOtp]=useState(""); const [name,setName]=useState(""); const [localCode,setLocalCode]=useState("");
  const [step,setStep]=useState<"email"|"otp"|"profile">("email"); const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [notice,setNotice]=useState("");
  const [lockedName,setLockedName]=useState("");
  useEffect(()=>{
    const urlName = collaboratorNameFromUrl();
    if (urlName) { setLockedName(urlName); setName(urlName); }
    void (async()=>{const {data}=await supabase.auth.getSession();if(data.session){setStep("profile");}})();
  },[]);
  const finishProfile=()=>{
    if(lockedName && comparable(name)!==comparable(lockedName)){setError(`Cette adresse est réservée à ${lockedName}.`);return}
    if(name.trim().length<2||!/^[0-9]{4}$/.test(localCode)){setError("Saisissez un prénom et un code personnel de 4 chiffres.");return}
    localStorage.setItem("bosc-collaborateurs-name",name.trim());onEnter(name.trim())
  };
  const requestOtp=async(e:React.FormEvent)=>{e.preventDefault();if(!email.trim()||busy)return;setBusy(true);setError("");setNotice("");try{await sendOtp(email);setStep("otp");setNotice("Le code à 8 chiffres a été envoyé à votre adresse professionnelle.")}catch(err){setError(err instanceof Error?err.message:"Envoi impossible. Vérifiez l’adresse et réessayez.")}finally{setBusy(false)}};
  const validateOtp=async(e:React.FormEvent)=>{e.preventDefault();if(otp.length!==8||busy)return;setBusy(true);setError("");setNotice("");try{await verifyOtp(email,otp);setStep("profile");setNotice("Connexion validée. Complétez votre identification collaborateur.")}catch(err){setError(err instanceof Error?err.message:"Code invalide ou expiré. Demandez un nouveau code.")}finally{setBusy(false)}};
  return <main className="min-h-screen bg-[#19213D] grid lg:grid-cols-[1.15fr_.85fr]">
    <section className="relative hidden lg:flex flex-col justify-between p-14 overflow-hidden"><div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_35%_20%,#C3C7D6,transparent_36%),radial-gradient(circle_at_80%_85%,#57617E,transparent_30%)]"/><Brand light/><div className="relative max-w-xl"><div className="text-[#C3C7D6] text-sm uppercase tracking-[.24em] mb-5">Espace équipe</div><h1 className="font-serif text-white text-5xl leading-[1.08]">L’atelier, organisé autour de chacun.</h1><p className="text-white/55 text-lg mt-6 max-w-lg">Les données du logiciel principal sont accessibles avec votre connexion professionnelle.</p></div><p className="relative text-white/30 text-sm">Maison Bosc Joaillerie · Salles</p></section>
    <section className="bg-[#F7F3EC] flex items-center justify-center p-6 sm:p-12"><Card className="w-full max-w-md border-[#D9DCE5] shadow-[0_30px_80px_rgba(0,0,0,.14)] rounded-3xl"><CardHeader className="p-8 pb-4"><div className="lg:hidden mb-8"><Brand/></div><Badge variant="outline" className="w-fit border-[#D9DCE5] bg-[#F7F3EC] text-[#303851]">Connexion sécurisée</Badge><CardTitle className="font-serif text-3xl mt-4">Bonjour</CardTitle><p className="text-sm text-[#57617E] leading-relaxed">Utilisez la même adresse professionnelle que pour le CRM principal.</p></CardHeader><CardContent className="p-8 pt-3 space-y-5">
      {step==="email"&&<form onSubmit={requestOtp} className="space-y-5"><label className="grid gap-2 text-sm font-medium">Adresse e-mail professionnelle<Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@maisonbosc.fr" className="h-12 bg-[#F7F3EC]" autoComplete="email"/></label><Button type="submit" disabled={busy||!email.trim()} className="h-12 w-full bg-[#19213D] hover:bg-[#303851] text-white rounded-xl">{busy?"Envoi…":"Recevoir mon code"} <ChevronRight/></Button></form>}
      {step==="otp"&&<form onSubmit={validateOtp} className="space-y-5"><label className="grid gap-2 text-sm font-medium">Code reçu par e-mail<Input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,8))} inputMode="numeric" pattern="[0-9]{8}" maxLength={8} autoComplete="one-time-code" placeholder="8 chiffres" className="h-12 bg-[#F7F3EC] text-center text-lg tracking-[.35em]" autoFocus/></label><Button type="submit" disabled={busy||otp.length!==8} className="h-12 w-full bg-[#19213D] hover:bg-[#303851] text-white rounded-xl">{busy?"Vérification…":"Valider le code"} <ChevronRight/></Button><button type="button" className="w-full text-sm text-[#57617E] underline" onClick={()=>{setStep("email");setOtp("");setNotice("");}}>Changer d’adresse</button></form>}
      {step==="profile"&&<form onSubmit={e=>{e.preventDefault();finishProfile()}} className="space-y-5"><label className="grid gap-2 text-sm font-medium">{lockedName?"Collaborateur autorisé":"Votre prénom"}<Input required readOnly={Boolean(lockedName)} value={name} onChange={e=>setName(e.target.value)} placeholder="Saisissez votre prénom" className={`h-12 bg-[#F7F3EC] ${lockedName?"font-semibold text-[#303851]":""}`} autoFocus/></label>{lockedName&&<p className="-mt-3 text-xs text-[#57617E]">Cet espace est réservé à {lockedName}.</p>}<label className="grid gap-2 text-sm font-medium">Code personnel de l’application<Input required value={localCode} onChange={e=>setLocalCode(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="4 chiffres" className="h-12 bg-[#F7F3EC] text-center text-lg tracking-[.45em]"/></label><Button type="submit" disabled={!name.trim()||localCode.length!==4} className="h-12 w-full bg-[#19213D] hover:bg-[#303851] text-white rounded-xl">Ouvrir mon espace <ChevronRight/></Button><button type="button" className="w-full text-sm text-[#57617E] underline" onClick={()=>void signOut().then(()=>{setStep("email");setName("");setLocalCode("")})}>Changer de compte</button></form>}
      {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      <InstallAppButton/><a href={MAIN_CRM_URL} target="_blank" rel="noreferrer" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D9DCE5] bg-white text-sm font-medium text-[#303851] transition hover:border-[#57617E] hover:bg-[#F7F3EC]">Ouvrir le CRM principal <ExternalLink className="size-4"/></a><p className="text-xs text-[#57617E] leading-relaxed rounded-xl bg-[#F7F3EC] p-3">Le code reçu par e-mail sécurise l’accès aux données. Le code personnel à 4 chiffres identifie votre espace sur cet appareil.</p></CardContent></Card></section>
  </main>;
}

function PageTitle({eyebrow,title,action}:{eyebrow:string,title:string,action?:React.ReactNode}) { return <div className="flex items-end justify-between gap-4 mb-6"><div><p className="text-xs font-semibold uppercase tracking-[.17em] text-[#57617E] mb-2">{eyebrow}</p><h1 className="font-serif text-3xl sm:text-4xl text-[#20253A]">{title}</h1></div>{action}</div> }
function Stat({label,value,detail}:{label:string,value:string,detail:string}) { return <Card className="rounded-2xl border-[#D9DCE5] shadow-none"><CardContent className="p-5"><p className="text-sm text-[#57617E]">{label}</p><p className="font-serif text-3xl mt-2">{value}</p><p className="text-xs text-[#57617E]/70 mt-1">{detail}</p></CardContent></Card> }

function Accueil({name,setView,planningRows,pochettesRows,messages,leaves}:{name:string;setView:(v:View)=>void;planningRows:PlanningRow[];pochettesRows:PochettesRow[];messages:ClientMessage[];leaves:LeaveRow[]}) {
  const openRows=planningRows.filter(p=>/cours|faire|attente/i.test(p.statut));
  return <><PageTitle eyebrow="Mon espace" title={`Bonjour ${name}`} action={<Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Données synchronisées</Badge>}/><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"><Stat label="Travaux aujourd’hui" value={String(planningRows.length)} detail="Depuis le CRM principal"/><Stat label="Pochettes en cours" value={String(pochettesRows.length)} detail="Depuis le CRM principal"/><Stat label="Messages non lus" value={String(messages.filter(m=>!m.resolved).length)} detail="Partagés avec l’équipe"/><Stat label="Demandes de congés" value={String(leaves.length)} detail="Enregistrées dans le CRM"/></div><div className="grid xl:grid-cols-[1.45fr_.75fr] gap-5"><Card className="rounded-2xl border-[#D9DCE5] shadow-none"><CardHeader className="flex-row items-center justify-between"><CardTitle className="font-serif text-xl">Planning atelier</CardTitle><Button variant="ghost" size="sm" onClick={()=>setView("planning")}>Voir le planning <ChevronRight/></Button></CardHeader><CardContent className="space-y-2">{(openRows.length?openRows:planningRows).slice(0,4).map(p=><div key={p._crmId||p.id} className="grid grid-cols-[58px_1fr_auto] items-center gap-3 rounded-xl border border-[#D9DCE5] p-3 bg-white"><span className="font-semibold text-[#57617E]">{p.heure}</span><div><p className="font-medium">{p.piece}</p><p className="text-sm text-[#57617E]">Pochette {p.pochette} · {p.client}</p></div><Badge variant="outline" className={tone(p.statut)}>{p.type}</Badge></div>)}{planningRows.length===0&&<div className="rounded-xl border border-dashed p-8 text-center text-sm text-[#57617E]">Aucun planning disponible.</div>}</CardContent></Card><Card className="rounded-2xl bg-[#19213D] text-white border-0 shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Accès aux données</CardTitle></CardHeader><CardContent><p className="text-sm text-white/70 leading-relaxed">Le planning et les primes sont consultables depuis le CRM principal. Les échanges, messages, pochettes et congés sont enregistrés dans la base commune.</p><Button variant="outline" className="mt-5 border-white/25 bg-transparent text-white hover:bg-white/10" onClick={()=>setView("primes")}>Voir les primes</Button></CardContent></Card></div></> }

function DiscussionLegacy({name,rows,onRefresh}:{name:string;rows:CrmRecord[];onRefresh:()=>Promise<void>}) { const [text,setText]=useState(""); const [busy,setBusy]=useState(false); const [editingId,setEditingId]=useState(""); const [editingText,setEditingText]=useState(""); const items=rows.filter(row=>row.data?.kind==="message").map(row=>({row,auteur:pick(row.data,"auteur","author")||"Équipe",heure:pick(row.data,"horodatage","heure")||"",texte:pick(row.data,"message","texte","text")||""})); const send=async()=>{if(!text.trim()||busy)return;setBusy(true);try{await saveRecord("discussion",{kind:"message",salle:"Général",auteur:name,message:text.trim(),horodatage:new Date().toISOString(),_row:crypto.randomUUID()},"discussion");setText("");await onRefresh()}catch(err){alert(err instanceof Error?err.message:"Enregistrement impossible.")}finally{setBusy(false)}}; const edit=async(row:CrmRecord)=>{if(!editingText.trim())return;setBusy(true);try{await saveRecord("discussion",{...recordData(row),message:editingText.trim(),kind:"message"},"discussion");setEditingId("");setEditingText("");await onRefresh()}catch(err){alert(err instanceof Error?err.message:"Modification impossible.")}finally{setBusy(false)}}; const remove=async(row:CrmRecord)=>{if(!window.confirm("Supprimer ce message ?"))return;setBusy(true);try{await deleteRecord("discussion",{_crmId:row.id});await onRefresh()}catch(err){alert(err instanceof Error?err.message:"Suppression impossible.")}finally{setBusy(false)}}; return <><PageTitle eyebrow="Équipe" title="Discussion" action={<Badge variant="outline"><UsersRound/> Général</Badge>}/><Card className="rounded-2xl border-[#D9DCE5] shadow-none overflow-hidden"><CardContent className="p-0"><div className="h-[52vh] min-h-80 overflow-y-auto p-5 space-y-5 bg-[#F7F3EC]">{items.length===0&&<div className="rounded-xl border border-dashed p-8 text-center text-sm text-[#57617E]">Aucun message dans la discussion.</div>}{items.map(({row,auteur,heure,texte})=><div key={row.id} className="flex justify-start"><div className="max-w-[78%] rounded-2xl px-4 py-3 bg-white border border-[#D9DCE5]"><div className="text-xs font-semibold mb-1 text-[#57617E]">{auteur} · {heure}</div>{editingId===row.id?<div className="flex gap-2"><Input value={editingText} onChange={e=>setEditingText(e.target.value)}/><Button size="sm" onClick={()=>void edit(row)}>OK</Button></div>:<p className="text-sm sm:text-base whitespace-pre-wrap">{texte}</p>}{auteur.toLowerCase()===name.toLowerCase()&&editingId!==row.id&&<div className="mt-2 flex gap-3 text-xs"><button className="text-[#57617E] underline" onClick={()=>{setEditingId(row.id);setEditingText(texte)}}>Modifier</button><button className="text-red-700 underline" onClick={()=>void remove(row)}>Supprimer</button></div>}</div></div>)}</div>{activeRoomUnread&&activeRoom&&<div className="flex justify-end border-t border-[#D9DCE5] bg-white px-4 py-2"><button type="button" onClick={()=>onRead(activeRoom.key,visibleIds?visibleIds.split("|"):[])} className="rounded-lg px-3 py-2 text-sm font-medium text-[#303851] underline">Marquer ce salon comme lu</button></div>}<div className="p-3 border-t flex gap-2"><Input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void send()} placeholder="Écrire à l’équipe…" className="h-11"/><Button onClick={()=>void send()} disabled={busy||!text.trim()} aria-label="Envoyer" className="h-11 bg-[#19213D] hover:bg-[#303851]"><Send/></Button></div></CardContent></Card></> }

function Discussion({name,rows,onRefresh,onRead,unreadRooms}:{name:string;rows:CrmRecord[];onRefresh:()=>Promise<void>;onRead:(room:string,ids:string[])=>void;unreadRooms:string[]}) {
  const [text,setText]=useState("");
  const [busy,setBusy]=useState(false);
  const [editingId,setEditingId]=useState("");
  const [editingText,setEditingText]=useState("");
  const [roomKey,setRoomKey]=useState("");
  const [roomMenuOpen,setRoomMenuOpen]=useState(false);
  const rooms=useMemo(()=>discussionRooms(rows),[rows]);
  const access=useMemo(()=>discussionAccessConfig(rows),[rows]);
  const allowedRooms=useMemo(()=>rooms.filter(room=>discussionRoomAllowed(access.config,room,name)),[rooms,access.config,name]);
  useEffect(()=>{if(!allowedRooms.some(room=>room.key===roomKey))setRoomKey(allowedRooms[0]?.key||"")},[allowedRooms,roomKey]);
  const activeRoom=allowedRooms.find(room=>room.key===roomKey)||allowedRooms[0];
  const items=rows.filter(row=>row.data?.kind==="message"&&discussionRoomKey(pick(row.data,"salle","room")||"Général")===(activeRoom?.key||"")).map(row=>({row,auteur:pick(row.data,"auteur","author")||"Équipe",heure:pick(row.data,"horodatage","heure")||"",texte:pick(row.data,"message","texte","text")||""}));
  const visibleIds=items.map(item=>item.row.id).join("|");
  const activeRoomUnread=unreadRooms.includes(activeRoom?.key||"");
  const send=async()=>{if(!text.trim()||busy||!activeRoom)return;setBusy(true);try{await saveRecord("discussion",{kind:"message",salle:activeRoom.name,auteur:name,message:text.trim(),horodatage:new Date().toISOString(),_row:crypto.randomUUID()},"discussion");setText("");await onRefresh()}catch(err){alert(err instanceof Error?err.message:"Enregistrement impossible.")}finally{setBusy(false)}};
  const edit=async(row:CrmRecord)=>{if(!editingText.trim())return;setBusy(true);try{await saveRecord("discussion",{...recordData(row),message:editingText.trim(),kind:"message"},"discussion");setEditingId("");setEditingText("");await onRefresh()}catch(err){alert(err instanceof Error?err.message:"Modification impossible.")}finally{setBusy(false)}};
  const remove=async(row:CrmRecord)=>{if(!window.confirm("Supprimer ce message ?"))return;setBusy(true);try{await deleteRecord("discussion",{_crmId:row.id});await onRefresh()}catch(err){alert(err instanceof Error?err.message:"Suppression impossible.")}finally{setBusy(false)}};
  return <><PageTitle eyebrow="Équipe" title="Discussion" action={allowedRooms.length>0?<div className="relative flex items-center gap-2 text-sm"><span className="text-[#57617E]">Salon</span><button type="button" aria-label="Choisir un salon" aria-expanded={roomMenuOpen} onClick={()=>setRoomMenuOpen(open=>!open)} className="flex h-9 min-w-36 items-center justify-between gap-3 rounded-lg border border-[#D9DCE5] bg-white px-3 text-sm text-[#20253A]">{activeRoom?.label}{unreadRooms.includes(activeRoom?.key||"")&&<span className="size-2.5 rounded-full bg-red-500" aria-label="Nouveaux messages"/>}<span aria-hidden="true">⌄</span></button>{roomMenuOpen&&<div className="absolute right-0 top-full z-30 mt-1 min-w-48 rounded-xl border border-[#D9DCE5] bg-white p-1 shadow-lg" role="group" aria-label="Salons">{allowedRooms.map(room=><button key={room.key} type="button" onClick={()=>{setRoomKey(room.key);setRoomMenuOpen(false)}} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F7F3EC]"><span className="flex-1">{room.label}</span>{unreadRooms.includes(room.key)&&<span className="size-2.5 rounded-full bg-red-500" aria-label="Nouveaux messages"/>}</button>)}</div>}</div>:<Badge variant="outline" className="border-[#D9DCE5] bg-[#F7F3EC] text-[#57617E]">Aucun salon autorisé</Badge>}/>{allowedRooms.length===0?<Card className="rounded-2xl border-[#D9DCE5] shadow-none"><CardContent className="p-8 text-center text-sm text-[#57617E]">L’administrateur n’a pas encore autorisé de salon pour votre compte.</CardContent></Card>:<Card className="rounded-2xl border-[#D9DCE5] shadow-none overflow-hidden"><CardContent className="p-0"><div className="h-[52vh] min-h-80 overflow-y-auto p-5 space-y-5 bg-[#F7F3EC]">{items.length===0&&<div className="rounded-xl border border-dashed p-8 text-center text-sm text-[#57617E]">Aucun message dans ce salon.</div>}{items.map(({row,auteur,heure,texte})=><div key={row.id} className="flex justify-start"><div className="max-w-[78%] rounded-2xl px-4 py-3 bg-white border border-[#D9DCE5]"><div className="text-xs font-semibold mb-1 text-[#57617E]">{auteur} · {heure}</div>{editingId===row.id?<div className="flex gap-2"><Input value={editingText} onChange={e=>setEditingText(e.target.value)}/><Button size="sm" onClick={()=>void edit(row)}>OK</Button></div>:<p className="text-sm sm:text-base whitespace-pre-wrap">{texte}</p>}{auteur.toLowerCase()===name.toLowerCase()&&editingId!==row.id&&<div className="mt-2 flex gap-3 text-xs"><button className="text-[#57617E] underline" onClick={()=>{setEditingId(row.id);setEditingText(texte)}}>Modifier</button><button className="text-red-700 underline" onClick={()=>void remove(row)}>Supprimer</button></div>}</div></div>)}</div><div className="p-3 border-t flex gap-2"><Input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void send()} placeholder={"Écrire dans "+(activeRoom?.label||"le salon")+"…"} className="h-11"/><Button onClick={()=>void send()} disabled={busy||!text.trim()} aria-label="Envoyer" className="h-11 bg-[#19213D] hover:bg-[#303851]"><Send/></Button></div></CardContent></Card>}</>;
}

function Messages({items,onAdd,onResolve,onPrepare}:{items:ClientMessage[];onAdd:(message:ClientMessage)=>Promise<void>;onResolve:(id:string)=>Promise<void>;onPrepare:(data:Record<string,any>)=>Promise<void>}) {
  const [tab,setTab]=useState<"nouveau"|"reçus">("nouveau");
  const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const now=new Date();
  const [form,setForm]=useState({deLaPartDe:"",pour:"",societe:"",service:"",tel:"",date:now.toLocaleDateString("fr-FR"),heure:now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),email:"",enregistrePar:"",message:"",rappellera:false,merciDeRappeler:false,urgent:false,pourInfo:false});
  const setField=(key:string,value:any)=>setForm(current=>({...current,[key]:value}));
  const save=async()=>{if(!form.deLaPartDe.trim()||!form.message.trim()||busy)return;setBusy(true);setError("");try{await onPrepare({...form,kind:"message",client:form.deLaPartDe,text:form.message,createdAt:new Date().toISOString(),resolved:false,_row:crypto.randomUUID()});setForm(current=>({...current,message:"",rappellera:false,merciDeRappeler:false,urgent:false,pourInfo:false}));setTab("reçus")}catch(err){setError(err instanceof Error?err.message:"Enregistrement du message impossible.")}finally{setBusy(false)}};
  return <><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-2xl">✉️</span><h1 className="font-serif text-3xl sm:text-4xl text-[#20253A]">Message client</h1></div><Badge variant="outline" className="border-[#D9DCE5] bg-white text-[#57617E]">CRM partagé</Badge></div>{error&&<p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<Card className="rounded-2xl border-[#D9DCE5] shadow-none overflow-hidden"><div className="border-b border-[#D9DCE5] px-5 sm:px-7 py-5 flex gap-2"><Button onClick={()=>setTab("nouveau")} className={tab==="nouveau"?"bg-[#303851] text-white hover:bg-[#19213D]":"bg-transparent text-[#57617E] hover:bg-[#F7F3EC]"}>Nouveau message</Button><Button onClick={()=>setTab("reçus")} className={tab==="reçus"?"bg-[#303851] text-white hover:bg-[#19213D]":"bg-transparent text-[#57617E] hover:bg-[#F7F3EC]"}>Messages reçus ({items.length})</Button></div>{tab==="nouveau"?<CardContent className="p-5 sm:p-7 space-y-6"><div className="grid md:grid-cols-2 gap-x-6 gap-y-5">{([["deLaPartDe","DE LA PART DE","text"],["pour","POUR","text"],["societe","SOCIÉTÉ","text"],["service","SERVICE","text"],["tel","TEL","tel"],["date","DATE","date"],["heure","HEURE","time"],["email","@ (EMAIL)","email"],["enregistrePar","ENREGISTRÉ PAR","text"]] as const).map(([key,label,type])=><label key={key} className={`grid gap-2 text-sm font-semibold tracking-[.12em] text-[#57617E] ${key==="date"||key==="heure"?"":""}`}>{label}<Input type={type} value={String(form[key])} onChange={e=>setField(key,e.target.value)} className="h-12 bg-[#F7F3EC] border-[#D9DCE5] text-base font-normal tracking-normal"/></label>)}</div><label className="grid gap-2 text-sm font-semibold tracking-[.12em] text-[#57617E]">MESSAGE<Textarea value={form.message} onChange={e=>setField("message",e.target.value)} placeholder="Écrire le message…" rows={6} className="bg-[#F7F3EC] border-[#D9DCE5] text-base font-normal tracking-normal"/></label><div className="flex flex-wrap gap-5 text-base">{([["rappellera","Rappellera"],["merciDeRappeler","Merci de rappeler"],["urgent","Urgent"],["pourInfo","Pour info"]] as const).map(([key,label])=><label key={key} className="flex items-center gap-2"><input type="checkbox" checked={form[key]} onChange={e=>setField(key,e.target.checked)} className="size-5 accent-[#19213D]"/>{label}</label>)}</div><div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2"><p className="text-sm text-[#57617E]">Auto-effacé 30 jours après la date de saisie</p><div className="flex gap-3"><Button type="button" variant="outline" onClick={()=>setForm(current=>({...current,message:""}))}>Annuler</Button><Button type="button" onClick={()=>void save()} disabled={busy||!form.deLaPartDe.trim()||!form.message.trim()} className="bg-[#19213D] hover:bg-[#303851] text-white"><span className="mr-2">✓</span>{busy?"Enregistrement…":"Enregistrer le message"}</Button></div></div></CardContent>:<CardContent className="p-5 sm:p-7 space-y-3">{items.length===0?<div className="rounded-xl border border-dashed p-8 text-center text-sm text-[#57617E]">Aucun message client enregistré.</div>:items.map(message=><div key={message.id} className={`rounded-xl border p-4 ${message.resolved?"border-[#D9DCE5] bg-white":"border-red-200 bg-red-50/40"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{message.client}{!message.resolved&&<span className="ml-2 inline-block size-2 rounded-full bg-red-500"/>}</p><p className="text-xs text-[#57617E] mt-1">{message.createdAt}</p></div>{!message.resolved&&<Button size="sm" variant="outline" onClick={()=>void onResolve(message.id)}>Traité</Button>}</div><p className="text-sm mt-3 whitespace-pre-wrap">{message.text}</p></div>)}</CardContent>}</Card></>;
}

function Planning({rows}:{rows:PlanningRow[]}) {
  const [month, setMonth] = useState("Tous les mois");
  const [week, setWeek] = useState("Toutes les semaines");
  const months = useMemo(() => Array.from(new Map(rows.filter(row => row.monthKey).map(row => [row.monthKey, row.monthLabel])).entries()).sort(([a], [b]) => a.localeCompare(b)), [rows]);
  const weeks = useMemo(() => Array.from(new Map(rows.filter(row => row.weekKey && (month === "Tous les mois" || row.monthKey === month)).map(row => [row.weekKey, row.weekLabel])).entries()).sort(([a], [b]) => a.localeCompare(b)), [rows, month]);
  const hasFilter = month !== "Tous les mois" || week !== "Toutes les semaines";
  const monthOnly = month !== "Tous les mois" && week === "Toutes les semaines";
  const filtered = useMemo(() => rows
    .filter(row => (month === "Tous les mois" || row.monthKey === month) && (week === "Toutes les semaines" || row.weekKey === week))
    .sort((a, b) =>
      (a.monthKey || "9999-99").localeCompare(b.monthKey || "9999-99") ||
      (a.weekKey || "9999-S99").localeCompare(b.weekKey || "9999-S99") ||
      (a.dateKey || "9999-99-99").localeCompare(b.dateKey || "9999-99-99") ||
      a.heure.localeCompare(b.heure, "fr") ||
      a.pochette.localeCompare(b.pochette, "fr", { numeric:true })
    ), [rows, month, week]);
  const weekColors = useMemo(() => weekColorMap(filtered.map(row => row.weekKey)), [filtered]);
  const resetWeekIfNeeded = (nextMonth:string) => {
    setMonth(nextMonth);
    if (nextMonth !== "Tous les mois" && week !== "Toutes les semaines" && !rows.some(row => row.monthKey === nextMonth && row.weekKey === week)) setWeek("Toutes les semaines");
  };
  return <><PageTitle eyebrow="Mon activité" title="Planning atelier" action={<Badge variant="outline" className="border-[#D9DCE5] bg-white text-[#57617E]">Lecture seule · CRM principal</Badge>}/><div className="mb-5 grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-semibold uppercase tracking-[.12em] text-[#57617E]">MOIS<select value={month} onChange={e=>resetWeekIfNeeded(e.target.value)} className="h-12 rounded-xl border border-[#D9DCE5] bg-white px-4 text-base font-normal normal-case tracking-normal text-[#20253A]"><option>Tous les mois</option>{months.map(([value,label])=><option key={value} value={value}>{label.charAt(0).toUpperCase()+label.slice(1)}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold uppercase tracking-[.12em] text-[#57617E]">NUMÉRO DE SEMAINE<select value={week} onChange={e=>setWeek(e.target.value)} className="h-12 rounded-xl border border-[#D9DCE5] bg-white px-4 text-base font-normal normal-case tracking-normal text-[#20253A]"><option>Toutes les semaines</option>{weeks.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>{monthOnly&&<p className="mb-4 text-sm text-[#57617E]">Chaque semaine est identifiée par une couleur différente.</p>}{!hasFilter?<div className="rounded-2xl border border-dashed border-[#D9DCE5] bg-white p-10 text-center text-[#57617E]">Sélectionnez un mois ou un numéro de semaine pour afficher les pochettes du planning.</div>:<Card className="rounded-2xl border-[#D9DCE5] shadow-none"><CardContent className="p-0 overflow-x-auto">{filtered.length===0?<div className="p-8 text-center text-sm text-[#57617E]">Aucune pochette ne correspond aux filtres sélectionnés.</div>:<Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Semaine</TableHead><TableHead>Heure</TableHead><TableHead>Pochette</TableHead><TableHead>Type</TableHead><TableHead>Client</TableHead><TableHead>Travail</TableHead><TableHead>Durée</TableHead><TableHead>État</TableHead></TableRow></TableHeader><TableBody>{filtered.map(p=><TableRow key={p._crmId||p.id} className={monthOnly ? weekColors.get(p.weekKey) : undefined}><TableCell className="whitespace-nowrap">{p.date}</TableCell><TableCell className="whitespace-nowrap">{p.weekLabel?<span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${monthOnly?weekColorClass(p.weekKey):"border-transparent bg-transparent text-[#57617E]"}`}>{p.weekLabel}</span>:"—"}</TableCell><TableCell className="font-semibold text-[#57617E]">{p.heure}</TableCell><TableCell>{p.pochette}</TableCell><TableCell><Badge variant="outline">{p.type}</Badge></TableCell><TableCell>{p.client}</TableCell><TableCell>{p.piece}</TableCell><TableCell>{p.duree}</TableCell><TableCell><Badge variant="outline" className={tone(p.statut)}>{p.statut}</Badge></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>}</> }

function findPhotoSource(data?:Record<string,any>) {
  if(!data)return "";
  const keys=["photoPochette","photo","photoUrl","photoURL","image","imageUrl","imageURL","photoClient","photoAvant","photoApres","photos"];
  const normalize=(value:any):string=>{
    if(Array.isArray(value)){
      for(const item of value){const source=normalize(item);if(source)return source}
      return "";
    }
    if(value&&typeof value==="object")return normalize(value.url||value.src||value.href||value.publicUrl||value.path);
    if(typeof value!=="string")return "";
    const text=value.trim();
    if(!text)return "";
    if((text.startsWith("{")||text.startsWith("["))){try{return normalize(JSON.parse(text))}catch{return ""}}
    return /^(https?:\/\/|data:image\/|blob:|\/)/i.test(text)?text:"";
  };
  for(const key of keys){const source=normalize(data[key]);if(source)return source}
  return "";
}

function Pochettes({rows,onSave}:{rows:PochettesRow[];onSave:(data:Record<string,any>)=>Promise<void>}) {
  const [q,setQ]=useState("");
  const [month,setMonth]=useState("Tous les mois");
  const [week,setWeek]=useState("Toutes les semaines");
  const [editing,setEditing]=useState<PochettesRow|null>(null);
  const [selected,setSelected]=useState<PochettesRow|null>(null);
  const [photoPreview,setPhotoPreview]=useState<{src:string; no:string; client:string}|null>(null);
  const [formOpen,setFormOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({no:"",client:"",piece:"",livraison:"",etat:"En attente",note:""});
  const months=useMemo(()=>Array.from(new Map(rows.filter(row=>row.monthKey).map(row=>[row.monthKey,row.monthLabel])).entries()).sort(([a],[b])=>a.localeCompare(b)),[rows]);
  const weeks=useMemo(()=>Array.from(new Map(rows.filter(row=>row.weekKey&&(month==="Tous les mois"||row.monthKey===month)).map(row=>[row.weekKey,row.weekLabel])).entries()).sort(([a],[b])=>a.localeCompare(b)),[rows,month]);
  const hasFilter=q.trim().length>0||month!=="Tous les mois"||week!=="Toutes les semaines";
  const monthOnly=month!=="Tous les mois"&&week==="Toutes les semaines";
  const filtered=useMemo(()=>rows.filter(p=>{
    const haystack=[p.no,p.client,p.piece,p.livraison,p.etat,p.monthLabel,p.weekLabel,JSON.stringify(p.data||{})].join(" ").toLowerCase();
    return haystack.includes(q.toLowerCase())&&(month==="Tous les mois"||p.monthKey===month)&&(week==="Toutes les semaines"||p.weekKey===week);
  }).sort((a,b)=>
    (a.monthKey || "9999-99").localeCompare(b.monthKey || "9999-99") ||
    (a.weekKey || "9999-S99").localeCompare(b.weekKey || "9999-S99") ||
    (a.dateKey || "9999-99-99").localeCompare(b.dateKey || "9999-99-99") ||
    a.no.localeCompare(b.no, "fr", { numeric:true })
  ),[q,rows,month,week]);
  const weekColors=useMemo(()=>weekColorMap(filtered.map(row=>row.weekKey)),[filtered]);
  const resetWeekIfNeeded=(nextMonth:string)=>{
    setMonth(nextMonth);
    if(nextMonth!=="Tous les mois"&&week!=="Toutes les semaines"&&!rows.some(row=>row.monthKey===nextMonth&&row.weekKey===week))setWeek("Toutes les semaines");
  };
  const openEditor=(row?:PochettesRow)=>{const p=row||{no:"",client:"",piece:"",livraison:"",etat:"En attente"};setEditing(row||null);setFormOpen(true);setForm({no:p.no,client:p.client,piece:p.piece,livraison:p.livraison,etat:p.etat,note:row ? pick(row.data || {}, "note", "commentaire") : ""})};
  const save=async()=>{if(!form.no.trim()||!form.client.trim()||saving)return;setSaving(true);try{await onSave({...editing?.data,...form,...(editing?.data && Object.prototype.hasOwnProperty.call(editing.data,"statut") ? {statut:form.etat} : {}),kind:"entry",_crmId:editing?._crmId,record_key:editing?.record_key,interventionId:form.no});setEditing(null);setFormOpen(false)}finally{setSaving(false)}};
  const detailEntries=selected?Object.entries(selected.data||{}).filter(([key,value])=>!['kind','_row','interventionId','nPochette','no','numero','pochette','numeroPochette','client','nomClient','nom','designation','désignation','piece','travail','description','objet','mois','semaine','livraison','dateLivraison','datePrevue','echeance','etat','état','statut','photo','photoUrl','photoURL','image','imageUrl','imageURL','photoClient','photoAvant','photoApres','photos','duree','durée','temps','duration'].includes(key)&&value!==undefined&&value!==null&&String(value).trim()!==""):[];
  const selectedPhoto=selected?findPhotoSource(selected.data):"";
  const label=(key:string)=>key.replace(/([A-Z])/g," $1").replace(/^./,char=>char.toUpperCase()).replace(/_/g," ");
  return <>
    <PageTitle eyebrow="Mes clients" title="Suivi des pochettes" action={<Button onClick={()=>openEditor()} className="bg-[#19213D] hover:bg-[#303851]"><Plus/> Nouvelle pochette</Button>}/>
    <div className="relative mb-4 max-w-sm"><Search className="absolute left-3 top-3 size-4 text-[#57617E]/70"/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher…" className="pl-9"/></div>
    <div className="mb-5 grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-semibold uppercase tracking-[.12em] text-[#57617E]">MOIS<select value={month} onChange={e=>resetWeekIfNeeded(e.target.value)} className="h-12 rounded-xl border border-[#D9DCE5] bg-white px-4 text-base font-normal normal-case tracking-normal text-[#20253A]"><option>Tous les mois</option>{months.map(([value,label])=><option key={value} value={value}>{label.charAt(0).toUpperCase()+label.slice(1)}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold uppercase tracking-[.12em] text-[#57617E]">NUMÉRO DE SEMAINE<select value={week} onChange={e=>setWeek(e.target.value)} className="h-12 rounded-xl border border-[#D9DCE5] bg-white px-4 text-base font-normal normal-case tracking-normal text-[#20253A]"><option>Toutes les semaines</option>{weeks.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
    {formOpen&&<Card className="mb-5 rounded-2xl border-[#D9DCE5] shadow-none"><CardContent className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 p-5"><Input value={form.no} onChange={e=>setForm({...form,no:e.target.value})} placeholder="N° pochette"/><Input value={form.client} onChange={e=>setForm({...form,client:e.target.value})} placeholder="Client"/><Input value={form.piece} onChange={e=>setForm({...form,piece:e.target.value})} placeholder="Travail"/><Input value={form.livraison} onChange={e=>setForm({...form,livraison:e.target.value})} placeholder="Livraison"/><div className="flex gap-2"><select value={form.etat} onChange={e=>setForm({...form,etat:e.target.value})} aria-label="Statut de la pochette" className="h-10 min-w-0 flex-1 rounded-md border border-[#D9DCE5] bg-[#F7F3EC] px-3 text-sm text-[#20253A] focus:outline-none focus:ring-2 focus:ring-[#57617E]"><option value="">Choisir…</option>{POCHETTE_STATUS_OPTIONS.map(status=><option key={status} value={status}>{status}</option>)}</select><Button onClick={()=>void save()} disabled={saving} className="bg-[#19213D] hover:bg-[#303851]">{saving?"…":"Enregistrer"}</Button></div><textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Note sur la pochette" aria-label="Note sur la pochette" maxLength={2000} className="min-h-20 rounded-md border border-[#D9DCE5] bg-white p-3 text-sm text-[#20253A] sm:col-span-2 lg:col-span-5" /></CardContent></Card>}
    {monthOnly&&<p className="mb-4 text-sm text-[#57617E]">Chaque semaine est identifiée par une couleur différente.</p>}{!hasFilter?<div className="rounded-2xl border border-dashed border-[#D9DCE5] bg-white p-10 text-center text-[#57617E]">Sélectionnez un mois ou un numéro de semaine pour afficher les pochettes.</div>:<div className="grid gap-3 overflow-x-auto pb-2">{filtered.map(p => {
      const photo = findPhotoSource(p.data);
      return (
        <Card key={p._crmId || p.no} className={`min-w-[1220px] rounded-2xl border-[#D9DCE5] shadow-none ${monthOnly ? (weekColors.get(p.weekKey) || "bg-white") : "bg-white"}`}>
          <CardContent className="grid grid-cols-[72px_110px_minmax(130px,1.1fr)_minmax(145px,1.2fr)_110px_95px_95px_105px_200px] items-center gap-3 p-3">
            {photo ? (
              <button type="button" onClick={() => setPhotoPreview({src:photo,no:p.no,client:p.client})}
                className="cursor-zoom-in overflow-hidden rounded-lg" aria-label={`Agrandir la photo de la pochette ${p.no}`}>
                <img src={photo} alt={`Photo de la pochette ${p.no}`} className="size-16 rounded-lg border border-[#D9DCE5] bg-white object-cover"/>
              </button>
            ) : <div className="grid size-16 place-items-center rounded-lg border border-dashed border-[#D9DCE5] text-center text-xs text-[#57617E]">Sans photo</div>}
            <div className="min-w-0"><p className="text-xs uppercase text-[#57617E]">Pochette</p><p className="font-semibold text-[#20253A]">{p.no}</p></div>
            <div className="min-w-0"><p className="text-xs uppercase text-[#57617E]">Client</p><p className="break-words font-medium">{p.client}</p></div>
            <div className="min-w-0"><p className="text-xs uppercase text-[#57617E]">Travail</p><p className="break-words text-sm">{p.piece}</p></div>
            <div><p className="text-xs uppercase text-[#57617E]">Livraison</p><p className="text-sm font-medium">{p.livraison || "—"}</p></div>
            <div><p className="text-xs uppercase text-[#57617E]">Durée</p><p className="text-sm font-medium">{p.duree || "—"}</p></div>
            <div><p className="text-xs uppercase text-[#57617E]">Semaine</p><p className="text-sm font-medium">{p.weekLabel || "—"}</p></div>
            <Badge variant="outline" className={`h-auto w-fit whitespace-normal px-2 py-1 text-xs ${tone(p.etat)}`}>{p.etat}</Badge>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setSelected(p)}>Ouvrir la fiche</Button>
              <Button size="sm" variant="outline" onClick={() => openEditor(p)}>Modifier</Button>
            </div>
          </CardContent>
        </Card>
      );
    })}</div>}{hasFilter&&filtered.length===0&&<div className="rounded-2xl border border-dashed p-8 text-center text-sm text-[#57617E]">Aucune pochette ne correspond aux filtres sélectionnés.</div>}
    <Dialog open={Boolean(selected)} onOpenChange={open=>{if(!open)setSelected(null)}}><DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto border-[#D9DCE5] bg-[#F7F3EC]"><DialogHeader><DialogTitle className="break-words font-serif text-2xl text-[#20253A]">Fiche pochette {selected?.no}</DialogTitle><DialogDescription className="text-[#57617E]">Informations de la pochette client partagées avec le CRM.</DialogDescription></DialogHeader>{selected&&<div className="space-y-5"><div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]"><div className="overflow-hidden rounded-xl border border-[#D9DCE5] bg-white">{selectedPhoto?<button type="button" onClick={()=>setPhotoPreview({src:selectedPhoto,no:selected.no,client:selected.client})} className="group block w-full cursor-zoom-in" aria-label={`Agrandir la photo de la pochette ${selected.no}`}><img src={selectedPhoto} alt={`Photo de la pochette ${selected.no}`} className="aspect-square max-h-56 w-full object-cover transition group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-[#57617E]"/></button>:<div className="grid aspect-square max-h-56 place-items-center p-5 text-center text-sm text-[#57617E]">Aucune photo associée à cette pochette.</div>}</div><div className="grid min-w-0 gap-3 sm:grid-cols-2"><div className="min-w-0 rounded-xl border border-[#D9DCE5] bg-white p-4"><p className="break-words text-xs uppercase tracking-[.12em] text-[#57617E]">Client</p><p className="mt-1 break-words text-lg font-medium">{selected.client}</p></div><div className="min-w-0 rounded-xl border border-[#D9DCE5] bg-white p-4"><p className="break-words text-xs uppercase tracking-[.12em] text-[#57617E]">État</p><Badge variant="outline" className={`mt-2 ${tone(selected.etat)}`}>{selected.etat}</Badge></div><div className="min-w-0 rounded-xl border border-[#D9DCE5] bg-white p-4"><p className="break-words text-xs uppercase tracking-[.12em] text-[#57617E]">Travail</p><p className="mt-1 break-words font-medium">{selected.piece}</p></div><div className="min-w-0 rounded-xl border border-[#D9DCE5] bg-white p-4"><p className="break-words text-xs uppercase tracking-[.12em] text-[#57617E]">Durée</p><p className="mt-1 break-words font-medium">{selected.duree}</p></div><div className="min-w-0 rounded-xl border border-[#D9DCE5] bg-white p-4"><p className="break-words text-xs uppercase tracking-[.12em] text-[#57617E]">Livraison prévue</p><p className="mt-1 break-words font-medium">{selected.livraison||"—"}</p></div></div></div>{detailEntries.length>0&&<div className="min-w-0 rounded-xl border border-[#D9DCE5] bg-white p-4"><h3 className="font-semibold text-[#303851]">Détails de la fiche</h3><div className="mt-4 grid gap-4 sm:grid-cols-3">{detailEntries.map(([key,value])=><div key={key} className="min-w-0"><p className="break-words text-xs uppercase tracking-[.12em] text-[#57617E]">{label(key)}</p><p className="mt-1 break-words text-sm text-[#20253A]">{typeof value==="object"?JSON.stringify(value):String(value)}</p></div>)}</div></div>}</div>}<DialogFooter><Button variant="outline" onClick={()=>{if(selected){openEditor(selected);setSelected(null)}}}>Modifier la pochette</Button><DialogClose asChild><Button className="bg-[#19213D] hover:bg-[#303851]">Fermer</Button></DialogClose></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(photoPreview)} onOpenChange={open=>{if(!open)setPhotoPreview(null)}}><DialogContent className="max-h-[94vh] max-w-6xl border-[#D9DCE5] bg-[#19213D] p-3 text-white sm:p-5"><DialogHeader><DialogTitle className="sr-only">Photo de la pochette {photoPreview?.no}</DialogTitle><DialogDescription className="text-center text-white/70">{photoPreview?.client} · Pochette {photoPreview?.no}</DialogDescription></DialogHeader>{photoPreview&&<div className="flex max-h-[78vh] items-center justify-center overflow-auto rounded-xl bg-black/20 p-2 sm:p-4"><img src={photoPreview.src} alt={`Photo agrandie de la pochette ${photoPreview.no}`} className="max-h-[74vh] w-auto max-w-full object-contain"/></div>}</DialogContent></Dialog>
  </>
}

function Conges({rows,onSave}:{rows:LeaveRow[];onSave:(data:Record<string,any>)=>Promise<void>}) { const [open,setOpen]=useState(false); const [form,setForm]=useState({debut:"",fin:"",jours:"",motif:""}); const save=async()=>{if(!form.debut||!form.fin)return;await onSave({...form,kind:"conge",statut:"En attente",_row:crypto.randomUUID()});setForm({debut:"",fin:"",jours:"",motif:""});setOpen(false)}; return <><PageTitle eyebrow="Mon temps" title="Congés" action={<Button onClick={()=>setOpen(true)} className="bg-[#19213D] hover:bg-[#303851]"><Plus/> Nouvelle demande</Button>}/>{open&&<Card className="mb-5 rounded-2xl border-[#D9DCE5] shadow-none"><CardContent className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 p-5"><Input type="date" value={form.debut} onChange={e=>setForm({...form,debut:e.target.value})}/><Input type="date" value={form.fin} onChange={e=>setForm({...form,fin:e.target.value})}/><Input value={form.jours} onChange={e=>setForm({...form,jours:e.target.value})} placeholder="Nombre de jours"/><Input value={form.motif} onChange={e=>setForm({...form,motif:e.target.value})} placeholder="Motif (facultatif)"/><Button onClick={()=>void save()} className="bg-[#19213D] hover:bg-[#303851]">Envoyer la demande</Button></CardContent></Card>}<div className="grid lg:grid-cols-3 gap-5"><Stat label="Demandes enregistrées" value={String(rows.length)} detail="Partagées avec le CRM principal"/><Card className="rounded-2xl border-[#D9DCE5] shadow-none lg:col-span-2"><CardHeader><CardTitle className="font-serif text-xl">Mes demandes</CardTitle></CardHeader><CardContent className="space-y-3">{rows.length===0?<div className="rounded-xl border border-dashed p-8 text-center text-sm text-[#57617E]">Aucune demande de congé enregistrée.</div>:rows.map(row=><div key={row._crmId||row.id} className="flex items-center justify-between gap-3 rounded-xl border p-4"><div><p className="font-medium">Du {row.debut} au {row.fin}</p><p className="text-sm text-[#57617E] mt-1">{row.jours||"—"} jours{row.motif?` · ${row.motif}`:""}</p></div><Badge variant="outline" className={tone(row.statut)}>{row.statut}</Badge></div>)}</CardContent></Card></div></> }

function Commandes({rows}:{rows:SupplierOrder[]}) { const [q,setQ]=useState(""); const [supplier,setSupplier]=useState("Tous les fournisseurs"); const [state,setState]=useState("Tous les états"); const [month,setMonth]=useState("Tous les mois"); const [notice,setNotice]=useState(""); const suppliers=[...new Set(rows.map(row=>row.fournisseur))].sort((a,b)=>a.localeCompare(b,"fr")); const states=[...new Set(rows.map(row=>row.etat))].sort((a,b)=>a.localeCompare(b,"fr")); const months=[...new Set(rows.map(row=>row.date).map(value=>value.match(/[A-Za-zÀ-ÿ]+\s+\d{4}/)?.[0]||value).filter(Boolean))]; const hasFilter=q.trim().length>0||supplier!=="Tous les fournisseurs"||state!=="Tous les états"||month!=="Tous les mois"; const filtered=rows.filter(row=>{const haystack=Object.values(row).join(" ").toLowerCase();return haystack.includes(q.toLowerCase())&&(supplier==="Tous les fournisseurs"||row.fournisseur===supplier)&&(state==="Tous les états"||row.etat===state)&&(month==="Tous les mois"||row.date.includes(month))}); return <><PageTitle eyebrow="Atelier" title="Commandes fournisseurs" action={<Badge variant="outline" className="border-[#D9DCE5] bg-white text-[#57617E]">Données du CRM principal</Badge>}/><div className="space-y-5"><div className="relative"><Search className="absolute left-4 top-4 size-5 text-[#57617E]"/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Client, article ou pochette…" className="h-14 pl-12 bg-white border-[#D9DCE5] text-lg"/></div><div className="grid md:grid-cols-3 gap-4"><label className="grid gap-2 text-sm font-semibold uppercase tracking-[.12em] text-[#57617E]">FOURNISSEUR<select value={supplier} onChange={e=>setSupplier(e.target.value)} className="h-12 rounded-xl border border-[#D9DCE5] bg-white px-4 text-base font-normal normal-case tracking-normal text-[#20253A]"><option>Tous les fournisseurs</option>{suppliers.map(value=><option key={value}>{value}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold uppercase tracking-[.12em] text-[#57617E]">ÉTAT<select value={state} onChange={e=>setState(e.target.value)} className="h-12 rounded-xl border border-[#D9DCE5] bg-white px-4 text-base font-normal normal-case tracking-normal text-[#20253A]"><option>Tous les états</option>{states.map(value=><option key={value}>{value}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold uppercase tracking-[.12em] text-[#57617E]">MOIS<select value={month} onChange={e=>setMonth(e.target.value)} className="h-12 rounded-xl border border-[#D9DCE5] bg-white px-4 text-base font-normal normal-case tracking-normal text-[#20253A]"><option>Tous les mois</option>{months.map(value=><option key={value}>{value}</option>)}</select></label></div><Button onClick={()=>setNotice("Les commandes sont consultables depuis le CRM principal.")} className="h-14 w-full bg-[#19213D] hover:bg-[#303851] text-lg"><Plus/> Nouvelle commande</Button>{notice&&<p className="rounded-xl border border-[#D9DCE5] bg-white p-3 text-sm text-[#57617E]">{notice}</p>}{hasFilter&&<Card className="rounded-2xl border-[#D9DCE5] shadow-none"><CardContent className="p-0 overflow-x-auto">{filtered.length===0?<div className="min-h-32 grid place-items-center p-8 text-center text-base text-[#57617E]">Aucune commande ne correspond aux critères sélectionnés.</div>:<Table><TableHeader><TableRow><TableHead>Fournisseur</TableHead><TableHead>Référence</TableHead><TableHead>Commande</TableHead><TableHead>Date</TableHead><TableHead>État</TableHead></TableRow></TableHeader><TableBody>{filtered.map(row=><TableRow key={row._crmId||row.id}><TableCell className="font-medium">{row.fournisseur}</TableCell><TableCell>{row.reference}</TableCell><TableCell>{row.objet}</TableCell><TableCell>{row.date}</TableCell><TableCell><Badge variant="outline" className={tone(row.etat)}>{row.etat}</Badge></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>}</div></> }

function Primes({rows}:{rows:CrmRecord[]}) { return <><PageTitle eyebrow="Rémunération" title="Primes" action={<Badge variant="outline" className="border-[#D9DCE5] bg-white text-[#57617E]">Lecture seule · CRM principal</Badge>}/><Card className="rounded-2xl border-[#D9DCE5] shadow-none"><CardContent className="p-6">{rows.length===0?<div className="rounded-xl border border-dashed p-8 text-center text-sm text-[#57617E]">Aucun enregistrement de primes disponible dans le CRM principal.</div>:<div className="space-y-3">{rows.map(row=><div key={row.id} className="rounded-xl border border-[#D9DCE5] p-4"><div className="grid sm:grid-cols-3 gap-3">{Object.entries(row.data||{}).filter(([key])=>key!=="kind").slice(0,9).map(([key,value])=><div key={key}><p className="text-xs uppercase tracking-wide text-[#57617E]">{key}</p><p className="font-medium mt-1 break-words">{typeof value==="object"?JSON.stringify(value):String(value)}</p></div>)}</div></div>)}</div>}</CardContent></Card></> }

function AdminPanel({locks,onToggle,discussionRows,onSaveDiscussionConfig}:{locks:AccessLocks;onToggle:(module:View)=>void;discussionRows:CrmRecord[];onSaveDiscussionConfig:(data:Record<string,any>)=>Promise<void>}) {
  const rooms=useMemo(()=>discussionRooms(discussionRows),[discussionRows]);
  const collaborators=useMemo(()=>discussionCollaborators(discussionRows),[discussionRows]);
  const currentAccess=useMemo(()=>discussionAccessConfig(discussionRows),[discussionRows]);
  const [config,setConfig]=useState<DiscussionAccessConfig>({});
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState("");
  useEffect(()=>setConfig(currentAccess.config),[currentAccess.config]);
  const settingsFor=(source:DiscussionAccessConfig,key:string):DiscussionRoomAccess=>source[key]||{visibleParDefaut:false,exceptions:{}};
  const toggleDefault=(key:string)=>setConfig(current=>{const existing=settingsFor(current,key);return {...current,[key]:{...existing,visibleParDefaut:!existing.visibleParDefaut}}});
  const toggleCollaborator=(key:string,person:string)=>setConfig(current=>{const existing=settingsFor(current,key);const personKey=comparable(person);const currentValue=Object.prototype.hasOwnProperty.call(existing.exceptions,personKey)?existing.exceptions[personKey]:existing.visibleParDefaut;return {...current,[key]:{...existing,exceptions:{...existing.exceptions,[personKey]:!currentValue}}}});
  const save=async()=>{setSaving(true);setNotice("");try{await onSaveDiscussionConfig({kind:"config",record_key:"config",_crmId:currentAccess.row?.id,salonsConfig:config});setNotice("Autorisations des salons enregistrées.")}catch(error){setNotice(error instanceof Error?error.message:"Enregistrement impossible.")}finally{setSaving(false)}};
  return <><PageTitle eyebrow="Administration" title="Accès aux rubriques" action={<Badge variant="outline" className="border-[#D9DCE5] bg-[#F7F3EC] text-[#303851]"><KeyRound/> Administrateur</Badge>}/>
    <Card className="rounded-2xl border-[#D9DCE5] shadow-none mb-5"><CardHeader><CardTitle className="font-serif text-xl">Rubriques protégées</CardTitle><p className="text-sm text-stone-500">Activez le verrou pour demander le code administrateur avant d’ouvrir une rubrique. La discussion reste toujours accessible.</p></CardHeader><CardContent className="divide-y">{accessOptions.map(option=><label key={option.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 cursor-pointer"><span><span className="block font-medium">{option.label}</span><span className="block text-sm text-stone-500 mt-1">{option.description}</span></span><span className="flex items-center gap-3 shrink-0 text-sm text-stone-500">{locks[option.id]?<><LockKeyhole className="size-4 text-[#19213D]"/> Code requis</>:"Ouvert"}<input type="checkbox" className="size-5 accent-[#19213D]" checked={!!locks[option.id]} onChange={()=>onToggle(option.id)} aria-label={`Verrouiller ${option.label}`}/></span></label>)}</CardContent></Card>
    <Card className="rounded-2xl border-[#D9DCE5] shadow-none mb-5"><CardHeader><CardTitle className="font-serif text-xl">Accès aux salons de discussion</CardTitle><p className="text-sm text-stone-500">Le salon Général est toujours ouvert. Autorisez ici les autres salons pour tous les collaborateurs ou au cas par cas.</p></CardHeader><CardContent className="space-y-5">{rooms.map(room=>{const settings=settingsFor(config,room.key);return <div key={room.key} className="rounded-xl border border-[#D9DCE5] bg-[#F7F3EC] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{room.label}</p><p className="text-xs text-[#57617E]">{room.key==="commun"?"Salon commun permanent":"Choisissez les collaborateurs autorisés"}</p></div><label className="flex items-center gap-2 text-sm text-[#57617E]"><input type="checkbox" className="size-4 accent-[#19213D]" checked={room.key==="commun"?true:settings.visibleParDefaut} disabled={room.key==="commun"} onChange={()=>toggleDefault(room.key)}/>{room.key==="commun"?"Toujours ouvert":"Autorisé par défaut"}</label></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{collaborators.length===0?<p className="text-sm text-[#57617E]">Aucun collaborateur détecté dans le CRM principal.</p>:collaborators.map(person=>{const personKey=comparable(person);const explicit=Object.prototype.hasOwnProperty.call(settings.exceptions,personKey);const checked=room.key==="commun"?(true):(explicit?settings.exceptions[personKey]:settings.visibleParDefaut);return <label key={personKey} className="flex items-center gap-2 rounded-lg border border-[#D9DCE5] bg-white px-3 py-2 text-sm"><input type="checkbox" className="size-4 accent-[#19213D]" checked={checked} disabled={room.key==="commun"} onChange={()=>toggleCollaborator(room.key,person)}/><span>{person}</span></label>})}</div></div>})}<div className="flex flex-wrap items-center gap-3"><Button onClick={()=>void save()} disabled={saving} className="bg-[#19213D] hover:bg-[#303851]">{saving?"Enregistrement…":"Enregistrer les autorisations"}</Button>{notice&&<span className="text-sm text-[#57617E]">{notice}</span>}</div></CardContent></Card>
    <Card className="rounded-2xl border-[#D9DCE5] shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Code administrateur</CardTitle><p className="text-sm text-stone-500">Le code est géré par le CRM principal et vérifié avec le même compte professionnel.</p></CardHeader><CardContent><p className="text-sm leading-relaxed text-[#57617E]">Pour modifier ce code ou enregistrer un nouvel appareil, utilisez la rubrique administrateur du CRM principal.</p><a href={MAIN_CRM_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#19213D] px-4 text-sm font-medium text-white hover:bg-[#303851]">Ouvrir le CRM principal</a></CardContent></Card>
  </>
}

export default function Home() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }
  }, []);

  const [name,setName]=useState(""); const [view,setView]=useState<View>("accueil"); const [mobile,setMobile]=useState(false);
  const [locks,setLocks]=useState<AccessLocks>(DEFAULT_LOCKS);
  const [unlockedModules,setUnlockedModules]=useState<View[]>([]); const [clientMessages,setClientMessages]=useState<ClientMessage[]>([]);
  const [shared,setShared]=useState<SharedCrmData|null>(null); const [syncError,setSyncError]=useState(""); const [loadingShared,setLoadingShared]=useState(false);
  const [readDiscussion,setReadDiscussion]=useState<Record<string,string[]>>({});
  const [readOwner,setReadOwner]=useState("");
  const [gate,setGate]=useState<GateState|null>(null); const [pin,setPin]=useState(""); const [gateError,setGateError]=useState(""); const [ready,setReady]=useState(false);
  const navigateRef=useRef<(module:View)=>boolean>(()=>false);
  useEffect(()=>{
    const savedLocks=localStorage.getItem(ACCESS_LOCKS_KEY);
    if(savedLocks){try{setLocks({...DEFAULT_LOCKS,...JSON.parse(savedLocks) as AccessLocks})}catch{setLocks(DEFAULT_LOCKS)}}
    setReady(true);
  },[]);
  useEffect(()=>{if(ready)localStorage.setItem(ACCESS_LOCKS_KEY,JSON.stringify(locks))},[locks,ready]);
  useEffect(()=>{if(shared)setClientMessages(normalizeMessages(shared.messages))},[shared]);
  const refreshShared=async()=>{setLoadingShared(true);setSyncError("");try{setShared(await readSharedCrm())}catch(err){setSyncError(err instanceof Error?err.message:"Lecture des données impossible.")}finally{setLoadingShared(false)}};
  useEffect(()=>{if(name)void refreshShared()},[name]);
  useEffect(()=>{
    if(!name)return;
    const timer=window.setInterval(()=>{if(!document.hidden)void readSharedCrm().then(setShared).catch(()=>{})},20000);
    const refreshOnReturn=()=>{if(!document.hidden)void readSharedCrm().then(setShared).catch(()=>{})};
    document.addEventListener("visibilitychange",refreshOnReturn);
    window.addEventListener("pageshow",refreshOnReturn);
    return ()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",refreshOnReturn);window.removeEventListener("pageshow",refreshOnReturn)};
  },[name]);
  useEffect(()=>{
    if(!name||!shared)return;
    const owner=name.trim().toLocaleLowerCase("fr-FR");
    const key=`bosc-discussion-read:${owner}`;
    try {
      const stored=localStorage.getItem(key);
      if(stored)setReadDiscussion(JSON.parse(stored) as Record<string,string[]>);
      else {
        const initial:Record<string,string[]>={};
        localStorage.setItem(key,JSON.stringify(initial));
        setReadDiscussion(initial);
      }
    } catch {setReadDiscussion({})}
    setReadOwner(owner);
  },[name,Boolean(shared)]);
  const markDiscussionRead=useCallback((room:string,ids:string[])=>{
    if(!readOwner)return;
    setReadDiscussion(current=>{
      const existing=current[room]||[];
      if(ids.every(id=>existing.includes(id)))return current;
      const next={...current,[room]:Array.from(new Set([...existing,...ids]))};
      localStorage.setItem(`bosc-discussion-read:${readOwner}`,JSON.stringify(next));
      return next;
    });
  },[readOwner]);
  const navigate=(module:View)=>{
    if(module==="admin"){
      setGate({type:"admin"});setPin("");setGateError("");return false;
    }
    if(module!=="discussion"&&locks[module]&&!unlockedModules.includes(module)){
      setGate({type:"module",module});setPin("");setGateError("");return false;
    }
    setView(module);setMobile(false);return true;
  };
  navigateRef.current=navigate;
  const submitGate=async()=>{
    if(!gate)return;
    if(!/^[A-Za-z0-9]{4}$/.test(pin)){setGateError("Saisissez le code administrateur de 4 caractères du CRM principal.");return}
    try {
      const result=await verifyPrincipalAdminCode(pin);
      if(!result.success){setGateError(result.error||"Code administrateur incorrect.");setPin("");return}
    } catch(error) {
      setGateError(error instanceof Error?error.message:"Vérification administrateur impossible.");setPin("");return;
    }
    if(gate.type==="admin")setView("admin");
    else{setUnlockedModules(current=>current.includes(gate.module)?current:[...current,gate.module]);setView(gate.module)}
    setGate(null);setPin("");setGateError("");setMobile(false);
  };
  const toggleLock=(module:View)=>setLocks(current=>{const next={...current,[module]:!current[module]};return next});
  const addClientMessage=async(message:ClientMessage)=>{await saveRecord("messages",{kind:"message",client:message.client,message:message.text,horodatage:message.createdAt,resolved:false,_row:message.id},"message");await refreshShared()};
  const prepareClientMessage=async(data:Record<string,any>)=>{await saveRecord("messages",{...data,kind:"message",message:data.message||data.text||"",horodatage:data.horodatage||new Date().toISOString(),resolved:false,_row:data._row||crypto.randomUUID()},"message");await refreshShared()};
  const resolveClientMessage=async(id:string)=>{const row=shared?.messages.find(item=>item.id===id);if(!row)return;await saveRecord("messages",{...recordData(row),kind:"message",resolved:true},"message");await refreshShared()};
  const savePochette=async(data:Record<string,any>)=>{await saveRecord("pochettes",data,"pochette");await refreshShared()};
  const saveLeave=async(data:Record<string,any>)=>{await saveRecord("planning",data,"conge");await refreshShared()};
  const saveDiscussionConfig=async(data:Record<string,any>)=>{await saveRecord("discussion",data,"config");await refreshShared()};
  useEffect(()=>{
    const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options?:{signal?:AbortSignal})=>void|Promise<void>}}).modelContext;
    if(!context?.registerTool) return;
    const lifecycle=new AbortController();
    void Promise.resolve(context.registerTool({name:"open_crm_module",title:"Ouvrir un module",description:"Ouvre un module précis dans le CRM Collaborateurs.",inputSchema:{type:"object",properties:{module:{type:"string",enum:nav.map(n=>n.id)}},required:["module"],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input:unknown){const module=(input as {module?:View}).module;if(!module||!nav.some(n=>n.id===module))throw new Error("Module inconnu");return {module,opened:navigateRef.current(module)};}},{signal:lifecycle.signal})).catch(()=>{});
    return ()=>lifecycle.abort();
  },[]);
  if(!name)return <Login onEnter={setName}/>; const current=nav.find(n=>n.id===view); const hasClientMessages=clientMessages.some(message=>!message.resolved); const discussionAccess=discussionAccessConfig(shared?.discussion||[]).config; const permittedRooms=discussionRooms(shared?.discussion||[]).filter(room=>discussionRoomAllowed(discussionAccess,room,name)); const unreadRoomKeys=readOwner===name.trim().toLocaleLowerCase("fr-FR")?Array.from(new Set((shared?.discussion||[]).filter(row=>row.data?.kind==="message"&&permittedRooms.some(room=>room.key===discussionRoomKey(pick(row.data,"salle","room")||"Général"))&&pick(row.data,"auteur","author").toLocaleLowerCase("fr-FR")!==name.toLocaleLowerCase("fr-FR")&&!(readDiscussion[discussionRoomKey(pick(row.data,"salle","room")||"Général")]||[]).includes(row.id)).map(row=>discussionRoomKey(pick(row.data,"salle","room")||"Général")))):[]; const unreadDiscussion=unreadRoomKeys.length>0; const planningRows=shared?normalizePlanning(onlyCollaboratorRows(shared.planning,name)):[]; const pochettesRows=shared?normalizePochettes(onlyCollaboratorRows(shared.pochettes,name), shared.devis):[]; const leaves=shared?normalizeLeaves(shared.conges):[]; const orderRows=shared?normalizeOrders(shared.commandes):[];
  return <main className="min-h-screen bg-[#F7F3EC] text-[#20253A] flex">{mobile&&<button aria-label="Fermer le menu" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={()=>setMobile(false)}/>}<aside className={`fixed lg:sticky top-0 z-40 h-screen w-[270px] bg-[#19213D] text-white flex flex-col transition-transform ${mobile?"translate-x-0":"-translate-x-full lg:translate-x-0"}`}><div className="p-6 border-b border-white/10 flex items-center justify-between"><Brand light/><button className="lg:hidden" onClick={()=>setMobile(false)}><X/></button></div><nav className="flex-1 p-3 overflow-y-auto space-y-1">{nav.map(n=>{const Icon=n.icon;const locked=n.id!=="discussion"&&!!locks[n.id]&&!unlockedModules.includes(n.id);return <button key={n.id} onClick={()=>navigate(n.id)} className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-left ${view===n.id?"bg-[#303851] text-white":"text-white/65 hover:bg-white/5 hover:text-white"}`}><Icon className="size-4"/><span className="flex-1">{n.label}</span>{((n.id==="messages"&&hasClientMessages)||(n.id==="discussion"&&unreadDiscussion))&&<span title={n.id==="discussion"?"Nouveaux messages dans Discussion":"Messages clients à traiter"} aria-label={n.id==="discussion"?"Nouveaux messages dans Discussion":"Messages clients à traiter"} className="size-2.5 rounded-full bg-red-500 ring-2 ring-[#19213D]"/>}{locked&&<LockKeyhole className="size-3.5 text-white/45"/>}{"future" in n&&<span className="text-[10px] uppercase tracking-wider text-[#C3C7D6]">Bientôt</span>}</button>})}</nav><a href={MAIN_CRM_URL} target="_blank" rel="noreferrer" className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-white/15 px-3 py-3 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"><ExternalLink className="size-4"/><span className="flex-1">CRM principal</span></a><div className="p-4 border-t border-white/10"><div className="flex items-center gap-3 p-2"><div className="size-10 rounded-full bg-[#303851] grid place-items-center font-semibold">{name[0]?.toUpperCase()}</div><div className="min-w-0"><p className="font-medium truncate">{name}</p><p className="text-xs text-white/40">Collaborateur</p></div></div><button onClick={()=>{void signOut();localStorage.removeItem("bosc-collaborateurs-name");setName("");setShared(null);setUnlockedModules([]);setView("accueil")}} className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-xs text-white/45 hover:text-white"><LogOut className="size-4"/> Se déconnecter</button></div></aside><section className="min-w-0 flex-1"><header className="h-18 bg-white/90 backdrop-blur border-b border-[#D9DCE5] px-4 sm:px-7 flex items-center gap-4 sticky top-0 z-20"><button onClick={()=>setMobile(true)} aria-label="Ouvrir le menu" className="relative lg:hidden rounded-lg border p-2"><Menu/>{unreadDiscussion&&<span className="absolute right-1 top-1 size-2.5 rounded-full bg-red-500 ring-2 ring-white" aria-label="Nouveaux messages dans Discussion"/>}</button><div className="flex-1"><p className="font-semibold">{current?.label}</p><p className="text-xs text-stone-400">{loadingShared?"Synchronisation en cours…":syncError?"Connexion aux données impossible":"Données partagées avec le CRM principal"}</p></div><a href={MAIN_CRM_URL} target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[#303851] transition hover:bg-[#F7F3EC]" title="Ouvrir le CRM principal"><ExternalLink className="size-4"/> <span className="hidden md:inline">CRM principal</span></a><Badge variant="outline" className="hidden sm:flex border-[#D9DCE5] bg-[#F7F3EC] text-[#303851]"><UserRound/> {name}</Badge></header><div className="p-4 sm:p-7 xl:p-9 max-w-[1450px] mx-auto">{syncError&&<div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{syncError}<Button variant="outline" size="sm" className="ml-3" onClick={()=>void refreshShared()}>Réessayer</Button></div>}{view==="accueil"&&<Accueil name={name} setView={navigate} planningRows={planningRows} pochettesRows={pochettesRows} messages={clientMessages} leaves={leaves}/>} {view==="discussion"&&<Discussion name={name} rows={shared?.discussion||[]} onRefresh={refreshShared} onRead={markDiscussionRead} unreadRooms={unreadRoomKeys}/>} {view==="messages"&&<Messages items={clientMessages} onAdd={addClientMessage} onResolve={resolveClientMessage} onPrepare={prepareClientMessage}/>} {view==="planning"&&<Planning rows={planningRows}/>} {view==="pochettes"&&<Pochettes rows={pochettesRows} onSave={savePochette}/>} {view==="conges"&&<Conges rows={leaves} onSave={saveLeave}/>} {view==="commandes"&&<Commandes rows={orderRows}/>} {view==="primes"&&<Primes rows={shared?.primes||[]}/>} {view==="admin"&&<AdminPanel locks={locks} onToggle={toggleLock} discussionRows={shared?.discussion||[]} onSaveDiscussionConfig={saveDiscussionConfig}/>}</div></section>
    {gate&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="gate-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-[#F7F3EC] text-[#57617E]"><LockKeyhole/></span><button onClick={()=>setGate(null)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="Fermer"><X className="size-5"/></button></div><h2 id="gate-title" className="font-serif text-2xl">{gate.type==="admin"?"Accès administrateur":"Rubrique protégée"}</h2><p className="mt-2 text-sm leading-relaxed text-stone-500">Saisissez le même code administrateur à 4 caractères que dans le CRM principal.</p><form className="mt-5 space-y-4" onSubmit={e=>{e.preventDefault();void submitGate()}}><label className="grid gap-2 text-sm font-medium">Code administrateur<Input autoFocus type="password" inputMode="text" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/[^A-Za-z0-9]/g,"").slice(0,4))} autoComplete="current-password"/></label>{gateError&&<p role="alert" className="text-sm text-red-700">{gateError}</p>}<Button type="submit" disabled={pin.length!==4} className="h-11 w-full bg-[#19213D] hover:bg-[#303851]">Vérifier le code</Button></form></section></div>}
  </main>;
}
