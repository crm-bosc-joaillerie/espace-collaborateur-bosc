// Jetons de design — couleurs relevées sur le CRM Maison Bosc existant (script fourni)
// et sur la capture d'écran de la sidebar (logo + fond marine).
export const NOIR = "#19213D"; // fond sidebar (mesuré sur la capture)
export const NOIR_HOVER = "rgba(255,255,255,0.09)"; // survol/actif sidebar (mesuré)
export const CREME = "#FAF8F3"; // fond de page
export const OR = "#B8860B";
export const OR_LIGHT = "#F5E8C0";
export const OR_DARK = "#7A5600";
export const GRIS = "#6B6760";
export const BORD = "#E8E2D4";
export const VERT = "#2D6A4F";
export const ROUGE = "#9B1C1C";
export const ORANGE = "#92400E";
export const BLEU = "#1E3A8A";

export const ACCENT_DEFAULT = BLEU;
export const ACCENT_OPTIONS = [BLEU, NOIR, OR, VERT];

export const collaborateurs = [
  { name: "Camille Martin", role: "Vente & Conseil", initials: "CM" },
  { name: "Julien Roux", role: "Atelier Joaillerie", initials: "JR" },
  { name: "Sophie Lambert", role: "Atelier Sertissage", initials: "SL" },
];

// Données d'exemple — à remplacer par un appel au backend (Google Apps Script,
// même schéma que les autres modules du CRM : SHEETS_WEBHOOK_URL, MESSAGES_WEBHOOK_URL,
// POCHETTES_WEBHOOK_URL, PLANNING_WEBHOOK_URL) quand ce module sera branché.
export const discussionMessages = [
  { auteur: "Julien", heure: "9:14", moi: false, texte: "La bague de Mme Fontaine est prête pour le contrôle qualité." },
  { auteur: "Moi", heure: "9:20", moi: true, texte: "Parfait, je préviens la cliente pour le retrait." },
  { auteur: "Sophie", heure: "10:02", moi: false, texte: "Il me faut encore deux jours pour le sertissage de la commande #482." },
];

export const messagesClients = [
  { initials: "MF", nom: "Mme Fontaine", heure: "09:32", texte: "Bonjour, ma bague est-elle prête pour le retrait ?", tags: [{ label: "Urgent", type: "urgent" }, { label: "Merci de rappeler", type: "neutre" }] },
  { initials: "MD", nom: "M. Dubreuil", heure: "Hier", texte: "Merci pour le devis, je confirme la commande.", tags: [] },
  { initials: "AS", nom: "Mme Aït-Salem", heure: "Lun.", texte: "Question sur la garantie du collier acheté en juin.", tags: [] },
];

export const planningAtelier = [
  { semaine: "S38", type: "REP", typeColor: VERT, designation: "Mme Petit · Redimensionnement bague", duree: "1 h 00", facon: "80 €", highlight: true },
  { semaine: "S38", type: "FAB", typeColor: BLEU, designation: "Commande #482 · Sertissage", duree: "3 h 30", facon: "420 €" },
  { semaine: "S39", type: "FAB", typeColor: BLEU, designation: "M. Roche · Gravure alliance", duree: "2 h 00", facon: "150 €" },
];

export const pochettes = [
  { numero: "#1042", client: "Mme Fontaine", bijou: "Bague solitaire", statut: "Fait", statutBg: "#EAF3DE", statutColor: VERT, facon: "80 €" },
  { numero: "#1043", client: "M. Dubreuil", bijou: "Collier or jaune", statut: "En cours", statutBg: "#E6F1FB", statutColor: BLEU, facon: "420 €" },
  { numero: "#1044", client: "Mme Aït-Salem", bijou: "Bracelet argent", statut: "En attente", statutBg: "#FEF3CD", statutColor: ORANGE, facon: "—" },
  { numero: "#1045", client: "M. Roche", bijou: "Alliance gravée", statut: "Fait", statutBg: "#F1EFE8", statutColor: GRIS, facon: "150 €" },
];

export const congesHistorique = [
  { periode: "21–25 septembre · 5 jours", heures: "40 h" },
  { periode: "Août 2026 · 3 jours", heures: "24 h" },
];

export const commandesFournisseur = [
  { fournisseur: "Dumas Métaux", article: "Or jaune 18k", qte: "50 g", etat: "Passé", etatBg: "#E6F1FB", etatColor: BLEU, date: "09/09/2026" },
  { fournisseur: "GemStone Import", article: "Diamants 0,3 ct", qte: "4", etat: "En attente", etatBg: "#FAEEDA", etatColor: ORANGE, date: "11/09/2026" },
  { fournisseur: "Boîtes & Écrins Pro", article: "Écrins signature", qte: "20", etat: "Reçu complet", etatBg: "#EAF3DE", etatColor: VERT, date: "02/09/2026" },
];
