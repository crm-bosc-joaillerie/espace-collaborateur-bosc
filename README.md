# Espace Collaborateur — Bosc

Prototype d'espace personnel par collaborateur pour le CRM Maison Bosc.

Chaque collaborateur retrouve, dans un espace unique, 7 modules :

- **Discussion** — messagerie interne à l'atelier
- **Message client** — reproduit la fiche papier « MESSAGE » de l'accueil
- **Planning atelier** — travaux de la semaine (réparations, fabrications)
- **Suivi pochettes clients** — état des pochettes en cours
- **Congés** — solde et historique
- **Commandes fournisseur** — suivi des commandes de matières et fournitures
- **Primes** *(à venir)* — se connectera au classeur « Suivi pochettes clients »
  pour calculer les primes une fois les interventions facturées

## État actuel

Ce dépôt contient un **prototype visuel autonome** (Vite + React), avec des
données d'exemple codées en dur dans `src/theme.js`. Il n'est **pas encore
connecté** à un backend : ni Google Sheets, ni les webhooks utilisés par le
CRM principal.

Le design (couleurs, logo, composants) reprend celui du CRM Maison Bosc
existant : fond sidebar `#19213D`, logo `public/logo-bosc-blanc.png`, jetons
de couleur dans `src/theme.js`.

## Développement

```bash
npm install
npm run dev
```

## Prochaine étape possible

Brancher chaque module sur le même type de backend que les autres modules du
CRM (Google Apps Script Web App par module), en suivant le schéma déjà en
place : `SHEETS_WEBHOOK_URL`, `MESSAGES_WEBHOOK_URL`, `POCHETTES_WEBHOOK_URL`,
`PLANNING_WEBHOOK_URL`.
